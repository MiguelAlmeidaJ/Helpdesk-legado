import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import type {
  CatalogImageUploadResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface ImageRow {
  id: number;
  catalog_id: number | null;
  original_name: string;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sha256: string;
  created_by: number;
  sector: number | null;
}

interface InsertIdRow {
  id: number | bigint | string;
}

function imageKind(data: Buffer): 'image/webp' | 'image/png' | 'image/jpeg' | null {
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }

  return null;
}

function extension(mimeType: string): string {
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/png') return '.png';
  return '.jpg';
}

@Injectable()
export class CatalogImageStorageService implements OnModuleInit {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.database.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS catalog_images (
         id INT UNSIGNED NOT NULL AUTO_INCREMENT,
         catalog_id INT NULL,
         original_name VARCHAR(255) NOT NULL,
         stored_name VARCHAR(255) NOT NULL,
         storage_path VARCHAR(500) NOT NULL,
         mime_type VARCHAR(100) NOT NULL,
         size_bytes INT UNSIGNED NOT NULL,
         width INT UNSIGNED NULL,
         height INT UNSIGNED NULL,
         sha256 CHAR(64) NOT NULL,
         created_by INT NOT NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         KEY idx_catalog_images_catalog (catalog_id),
         KEY idx_catalog_images_creator (created_by, created_at),
         CONSTRAINT fk_catalog_images_catalog
           FOREIGN KEY (catalog_id) REFERENCES catalogos(id)
           ON DELETE SET NULL ON UPDATE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    await mkdir(this.uploadRoot(), { recursive: true });
  }

  async store(input: {
    actorUserId: number;
    originalName: string;
    mimeType: string;
    data: Buffer;
    width?: number | null;
    height?: number | null;
  }): Promise<CatalogImageUploadResponse> {
    if (!input.data.length) {
      throw new BadRequestException('Imagem vazia.');
    }
    if (input.data.length > 8 * 1024 * 1024) {
      throw new BadRequestException('A imagem deve ter no máximo 8 MB.');
    }

    const detected = imageKind(input.data);
    if (!detected) {
      throw new BadRequestException('Formato de imagem inválido.');
    }

    const safeName = path
      .basename(input.originalName.replace(/\\/g, '/'))
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .slice(0, 255) || 'imagem';

    const now = new Date();
    const folder = [
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
    ].join('/');
    const storedName = `${randomUUID()}${extension(detected)}`;
    const relativePath = `${folder}/${storedName}`;
    const physical = this.safePath(relativePath);

    await mkdir(path.dirname(physical), { recursive: true });
    await writeFile(physical, input.data);

    try {
      await this.database.$executeRawUnsafe(
        `INSERT INTO catalog_images (
           catalog_id, original_name, stored_name, storage_path,
           mime_type, size_bytes, width, height, sha256, created_by, created_at
         ) VALUES (
           NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
         )`,
        safeName,
        storedName,
        relativePath,
        detected,
        input.data.length,
        input.width ?? null,
        input.height ?? null,
        createHash('sha256').update(input.data).digest('hex'),
        input.actorUserId,
      );

      const ids = await this.database.$queryRawUnsafe<InsertIdRow[]>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      const id = Number(ids[0]?.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        throw new Error('Falha ao identificar imagem criada.');
      }

      return {
        id,
        contentPath: `catalog/images/${id}/content`,
        mimeType: detected,
        width: input.width ?? null,
        height: input.height ?? null,
        sizeBytes: input.data.length,
      };
    } catch (error) {
      await unlink(physical).catch(() => undefined);
      throw error;
    }
  }

  async content(
    id: number,
  ): Promise<{
    data: Buffer;
    mimeType: string;
    sha256: string;
    name: string;
    catalogId: number | null;
    createdBy: number;
    sector: number | null;
  }> {
    const rows = await this.database.$queryRawUnsafe<ImageRow[]>(
      `SELECT ci.id, ci.catalog_id, ci.original_name, ci.stored_name,
              ci.storage_path, ci.mime_type, ci.size_bytes, ci.width,
              ci.height, ci.sha256, ci.created_by, c.setor AS sector
       FROM catalog_images ci
       LEFT JOIN catalogos c ON c.id = ci.catalog_id
       WHERE ci.id = ?
       LIMIT 1`,
      id,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Imagem do catálogo não encontrada.');

    let data: Buffer;
    try {
      data = await readFile(this.safePath(row.storage_path));
    } catch {
      throw new NotFoundException('Arquivo da imagem não encontrado no storage.');
    }

    const hash = createHash('sha256').update(data).digest('hex');
    if (hash !== row.sha256) {
      throw new NotFoundException('Arquivo da imagem falhou na validação de integridade.');
    }

    return {
      data,
      mimeType: row.mime_type,
      sha256: row.sha256,
      name: row.original_name,
      catalogId: row.catalog_id,
      createdBy: row.created_by,
      sector: row.sector,
    };
  }

  async linkContent(
    catalogId: number,
    html: string,
    actorUserId: number,
  ): Promise<void> {
    const ids = new Set<number>();
    const regex = /(?:catalog\/images\/(\d+)\/content|catalog-images\/(\d+))/gi;

    for (const match of html.matchAll(regex)) {
      const id = Number(match[1] ?? match[2]);
      if (Number.isSafeInteger(id) && id > 0) ids.add(id);
    }

    if (!ids.size) return;

    const list = [...ids];
    await this.database.$executeRawUnsafe(
      `UPDATE catalog_images
       SET catalog_id = ?
       WHERE id IN (${list.map(() => '?').join(', ')})
         AND (
           catalog_id = ?
           OR (catalog_id IS NULL AND created_by = ?)
         )`,
      catalogId,
      ...list,
      catalogId,
      actorUserId,
    );
  }

  private uploadRoot(): string {
    return path.resolve(
      process.env.CATALOG_UPLOAD_DIR?.trim() ||
        path.join(process.cwd(), 'storage', 'uploads', 'catalog'),
    );
  }

  private safePath(relativePath: string): string {
    const root = this.uploadRoot();
    const candidate = path.resolve(root, relativePath);
    if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
      throw new BadRequestException('Caminho de storage inválido.');
    }
    return candidate;
  }
}
