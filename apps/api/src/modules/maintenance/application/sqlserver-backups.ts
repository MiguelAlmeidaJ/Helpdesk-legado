import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { MaintenanceBackupFile, MaintenanceSystemStatusResponse } from '@helpdesk/contracts';
import { randomUUID } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type BackupClient = {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

export function nativeBackupRoot(): string | null {
  const value = process.env.MAINTENANCE_SQLSERVER_BACKUP_DIR?.trim();
  if (!value) return null;
  if (!path.isAbsolute(value)) throw new ConflictException('MAINTENANCE_SQLSERVER_BACKUP_DIR deve ser um caminho absoluto acessível à API e ao SQL Server.');
  return path.resolve(value);
}

// Only files created by this routine can be downloaded or removed by the API.
const NATIVE_NAME = /^(manual|auto|preimport)_nivel3_\d{14}_[a-f0-9-]{36}\.bak$/;

export class SqlServerBackups {
  private running = false;

  constructor(private readonly client: BackupClient) {}

  async status(): Promise<MaintenanceSystemStatusResponse['nativeBackup']> {
    try {
      const directory = nativeBackupRoot();
      if (!directory) return { configured: false, directory: null, lastVerifiedAt: null, error: null };
      const info = await lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('O diretório de backup deve ser uma pasta real.');
      const files = await this.list();
      return { configured: true, directory, lastVerifiedAt: files[0]?.verifiedAt ?? null, error: null };
    } catch {
      return { configured: false, directory: null, lastVerifiedAt: null, error: 'Verifique o caminho absoluto e o acesso ao diretório de backup nativo.' };
    }
  }

  async list(): Promise<MaintenanceBackupFile[]> {
    const root = nativeBackupRoot();
    if (!root) return [];
    const files: MaintenanceBackupFile[] = [];
    for (const name of await readdir(root)) {
      if (!NATIVE_NAME.test(name)) continue;
      try {
        const file = await this.file(name);
        const info = await lstat(file);
        const marker = JSON.parse(await readFile(file + '.verified.json', 'utf8'));
        if (marker.name !== name || marker.sizeBytes !== info.size || marker.mtimeMs !== info.mtimeMs || typeof marker.verifiedAt !== 'string' || !Number.isFinite(Date.parse(marker.verifiedAt))) continue;
        files.push({ name, database: 'nivel3', kind: name.startsWith('manual_') ? 'manual' : name.startsWith('auto_') ? 'automatic' : 'pre-import', sizeBytes: info.size, createdAt: info.mtime.toISOString(), verifiedAt: marker.verifiedAt });
      } catch {
        // Partial, unverified or concurrently removed files are never advertised as valid backups.
      }
    }
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async file(name: string): Promise<string> {
    if (!NATIVE_NAME.test(name)) throw new BadRequestException('Nome de backup nativo inválido.');
    const root = nativeBackupRoot();
    if (!root) throw new ConflictException('Configure MAINTENANCE_SQLSERVER_BACKUP_DIR.');
    const file = path.join(root, name);
    try {
      const info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink() || info.size === 0) throw new Error();
    } catch {
      throw new NotFoundException('Backup nativo não encontrado.');
    }
    return file;
  }

  async create(kind: 'manual' | 'automatic' | 'pre-import'): Promise<MaintenanceBackupFile[]> {
    if (this.running) throw new ConflictException('Um backup nativo já está em andamento.');
    this.running = true;
    try {
      const config = await this.status();
      if (!config.configured || !config.directory) throw new ConflictException(config.error ?? 'Configure MAINTENANCE_SQLSERVER_BACKUP_DIR antes de criar backups.');
      const prefix = kind === 'automatic' ? 'auto' : kind === 'pre-import' ? 'preimport' : 'manual';
      const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      const name = `${prefix}_nivel3_${stamp}_${randomUUID()}.bak`;
      const file = path.join(config.directory, name);
      // COPY_ONLY preserves any existing differential backup base. No transaction or overwrite.
      await this.client.$executeRawUnsafe(
        'DECLARE @db sysname = DB_NAME(), @file nvarchar(4000) = @P1; BACKUP DATABASE @db TO DISK = @file WITH COPY_ONLY, CHECKSUM, NOINIT, STOP_ON_ERROR;',
        file,
      );
      if (process.env.MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE === 'true') {
        await this.client.$executeRawUnsafe('EXEC master.dbo.helpdesk_verify_native_backup @file = @P1;', file);
      } else {
        await this.client.$executeRawUnsafe(
          'DECLARE @file nvarchar(4000) = @P1; RESTORE VERIFYONLY FROM DISK = @file WITH CHECKSUM, STOP_ON_ERROR;',
          file,
        );
      }
      const info = await lstat(await this.file(name));
      const verifiedAt = new Date().toISOString();
      await writeFile(file + '.verified.json', JSON.stringify({ name, sizeBytes: info.size, mtimeMs: info.mtimeMs, verifiedAt }), { flag: 'wx' });
      return [{ name, database: 'nivel3', kind, sizeBytes: info.size, createdAt: info.mtime.toISOString(), verifiedAt }];
    } finally {
      this.running = false;
    }
  }
}
