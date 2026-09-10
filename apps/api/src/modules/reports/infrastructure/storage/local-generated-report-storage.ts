import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { lstat, mkdir, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import { GeneratedReportStorage } from '../../application/ports/generated-report-storage';
import { reportRetentionDays } from '../../application/report-retention';
import { resolveTicketReportVisibility } from '../ticket-report-visibility';

export function generatedReportStorageRoot(): string {
  if (process.env.REPORT_STORAGE_DIR?.trim()) return path.resolve(process.env.REPORT_STORAGE_DIR);
  if (process.env.REPORT_ARCHIVE_DIR?.trim()) return path.resolve(process.env.REPORT_ARCHIVE_DIR);

  let root = process.cwd();
  while (!existsSync(path.join(root, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(root);
    if (parent === root) throw new Error('Configure REPORT_STORAGE_DIR.');
    root = parent;
  }

  return path.join(root, 'storage', 'reports');
}

@Injectable()
export class LocalGeneratedReportStorage extends GeneratedReportStorage {
  constructor(@Inject(NIVEL3_DATABASE) private readonly database: Nivel3DatabaseClient) {
    super();
  }

  async authorize(userId: number) {
    const visibility = await resolveTicketReportVisibility(this.database, userId);
    if (visibility.restrictClients) {
      throw new ForbiddenException('Arquivo compartilhado disponível apenas para usuários internos.');
    }
  }

  private async file(name: string): Promise<string> {
    if (typeof name !== 'string' || name !== path.basename(name) || /[\\/:\x00-\x1f]/.test(name) || !name.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Nome de arquivo inválido.');
    }

    const root = await realpath(generatedReportStorageRoot());
    const target = path.join(root, name);
    try {
      const stat = await lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink() || path.dirname(await realpath(target)) !== root) {
        throw new NotFoundException();
      }
    } catch {
      throw new NotFoundException('Relatório não encontrado.');
    }
    return target;
  }

  async list() {
    await mkdir(generatedReportStorageRoot(), { recursive: true });
    const retentionMs =
      reportRetentionDays(process.env.REPORT_RETENTION_DAYS) * 24 * 60 * 60 * 1000;
    const files = [];

    for (const name of await readdir(generatedReportStorageRoot())) {
      if (!name.toLowerCase().endsWith('.pdf')) continue;
      try {
        const file = await this.file(name);
        const stat = await lstat(file);
        files.push({
          name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          expiresAt: new Date(stat.mtime.getTime() + retentionMs).toISOString(),
        });
      } catch {
        // Skip links and non-files.
      }
    }
    return files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }

  async read(name: string) {
    const file = await this.file(name);
    if ((await lstat(file)).size > 25 * 1024 * 1024) {
      throw new BadRequestException('PDF acima do limite de 25 MB.');
    }
    return readFile(file);
  }

  async remove(name: string) {
    await unlink(await this.file(name));
  }

  async removeExpired(before: Date) {
    await mkdir(generatedReportStorageRoot(), { recursive: true });
    let removed = 0;
    for (const name of await readdir(generatedReportStorageRoot())) {
      if (!name.toLowerCase().endsWith('.pdf')) continue;
      try {
        const file = await this.file(name);
        const stat = await lstat(file);
        if (stat.mtimeMs < before.getTime()) {
          await unlink(file);
          removed++;
        }
      } catch {
        // Skip links, invalid entries and files removed concurrently.
      }
    }
    return removed;
  }

  async save(clientId: number, start: string, end: string, pdf: Buffer) {
    await mkdir(generatedReportStorageRoot(), { recursive: true });
    const name = `Relatorio_${clientId}_${start}_${end}_${randomUUID()}.pdf`;
    await writeFile(path.join(generatedReportStorageRoot(), name), pdf, { flag: 'wx' });
    return name;
  }
}
