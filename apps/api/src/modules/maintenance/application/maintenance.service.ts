import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import {
  DEFAULT_NAVIGATION,
  type MaintenanceBackupFile,
  type MaintenanceBackupFrequency,
  type MaintenanceBackupJob,
  type MaintenanceBackupJobInput,
  type MaintenanceBackupRunResponse,
  type MaintenanceBackupTarget,
  type MaintenanceDatabaseKey,
  type MaintenanceDatabaseStatus,
  type MaintenanceDatabaseTable,
  type MaintenanceDumpApplyResponse,
  type MaintenanceDumpStageResponse,
  type MaintenanceOperation,
  type MaintenanceRepairResponse,
  type MaintenanceSystemStatusResponse,
} from '@helpdesk/contracts';
import {
  synchronizeNavigation,
  type N3rdDatabaseClient,
  type Nivel3DatabaseClient,
} from '@helpdesk/database';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  createReadStream,
  createWriteStream,
  existsSync,
} from 'node:fs';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  statfs,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  N3RD_DATABASE,
  NIVEL3_DATABASE,
} from '../../../core/database/database.constants';

type QueryClient = Pick<
  Nivel3DatabaseClient,
  '$queryRawUnsafe' | '$executeRawUnsafe'
>;

type UploadedDump = {
  path: string;
  originalname: string;
  size: number;
  mimetype?: string;
};

type BackupKind = 'manual' | 'automatic' | 'pre-import';

type JobRow = {
  id: number | bigint;
  target: string;
  frequency: string;
  run_time: string;
  weekday: number | null;
  retention_days: number;
  is_active: number | bigint | boolean;
  last_run_at: Date | string | null;
  next_run_at: Date | string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type OperationRow = {
  id: number | bigint;
  action: string;
  target: string | null;
  actor_user_id: number | null;
  status: string;
  detail: string | null;
  created_at: Date | string;
  finished_at: Date | string | null;
};

type TableRow = {
  table_name: string;
  engine: string | null;
  table_rows: number | bigint | string | null;
  data_length: number | bigint | string | null;
  index_length: number | bigint | string | null;
};

type DumpMetadata = {
  token: string;
  target: MaintenanceDatabaseKey;
  originalName: string;
  sizeBytes: number;
  sha256: string;
  expiresAt: string;
  summary: {
    createTables: number;
    inserts: number;
    drops: number;
  };
  warnings: string[];
  confirmation: string;
};

const CREATE_BACKUP_JOBS = [
  'CREATE TABLE IF NOT EXISTS maintenance_backup_jobs (',
  '  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,',
  '  target VARCHAR(20) NOT NULL,',
  '  frequency VARCHAR(20) NOT NULL,',
  '  run_time CHAR(5) NOT NULL,',
  '  weekday TINYINT UNSIGNED NULL,',
  '  retention_days INT UNSIGNED NOT NULL DEFAULT 30,',
  '  is_active TINYINT(1) NOT NULL DEFAULT 1,',
  "  last_status VARCHAR(20) NOT NULL DEFAULT 'idle',",
  '  last_error TEXT NULL,',
  '  last_run_at DATETIME NULL,',
  '  next_run_at DATETIME NULL,',
  '  created_by INT NULL,',
  '  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,',
  '  PRIMARY KEY (id),',
  '  KEY idx_maintenance_backup_jobs_due (is_active, next_run_at)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
].join('\n');

const CREATE_WORKER_STATE = [
  'CREATE TABLE IF NOT EXISTS maintenance_worker_state (',
  '  worker_key VARCHAR(80) NOT NULL,',
  '  last_heartbeat_at DATETIME NOT NULL,',
  '  detail VARCHAR(255) NULL,',
  '  PRIMARY KEY (worker_key)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
].join('\n');

const CREATE_OPERATIONS = [
  'CREATE TABLE IF NOT EXISTS maintenance_operations (',
  '  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,',
  '  action VARCHAR(80) NOT NULL,',
  '  target VARCHAR(40) NULL,',
  '  actor_user_id INT NULL,',
  "  status VARCHAR(20) NOT NULL DEFAULT 'running',",
  '  detail TEXT NULL,',
  '  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '  finished_at DATETIME NULL,',
  '  PRIMARY KEY (id),',
  '  KEY idx_maintenance_operations_created (created_at)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
].join('\n');

const CREATE_NAVIGATION_SECTIONS = [
  'CREATE TABLE IF NOT EXISTS navigation_sections (',
  '  id INT UNSIGNED NOT NULL AUTO_INCREMENT,',
  '  slug VARCHAR(100) NOT NULL,',
  '  label VARCHAR(150) NOT NULL,',
  '  short_label VARCHAR(20) NULL,',
  '  sort_order INT NOT NULL DEFAULT 0,',
  '  is_active TINYINT(1) NOT NULL DEFAULT 1,',
  '  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,',
  '  PRIMARY KEY (id),',
  '  UNIQUE KEY uq_navigation_sections_slug (slug),',
  '  KEY idx_navigation_sections_order (is_active, sort_order, id)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
].join('\n');

const CREATE_NAVIGATION_ITEMS = [
  'CREATE TABLE IF NOT EXISTS navigation_items (',
  '  id INT UNSIGNED NOT NULL AUTO_INCREMENT,',
  '  section_id INT UNSIGNED NOT NULL,',
  '  slug VARCHAR(120) NOT NULL,',
  '  label VARCHAR(160) NOT NULL,',
  '  href VARCHAR(500) NULL,',
  "  status VARCHAR(30) NOT NULL DEFAULT 'planned',",
  '  visibility_condition LONGTEXT NULL,',
  '  sort_order INT NOT NULL DEFAULT 0,',
  '  is_active TINYINT(1) NOT NULL DEFAULT 1,',
  '  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,',
  '  PRIMARY KEY (id),',
  '  UNIQUE KEY uq_navigation_items_slug (slug),',
  '  KEY idx_navigation_items_section_order (section_id, is_active, sort_order, id),',
  '  CONSTRAINT fk_navigation_items_section FOREIGN KEY (section_id)',
  '    REFERENCES navigation_sections(id) ON DELETE CASCADE ON UPDATE RESTRICT',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
].join('\n');

const REQUIRED_NIVEL3_TABLES = [
  'usuarios',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'user_permissions',
  'api_sessions',
  'navigation_sections',
  'navigation_items',
  'maintenance_backup_jobs',
  'maintenance_worker_state',
  'maintenance_operations',
] as const;

const TOOL_ERROR_LIMIT = 24000;
const DUMP_STAGE_TTL_MS = 2 * 60 * 60 * 1000;

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function numberValue(value: number | bigint | string | null | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function findWorkspaceRoot(): string {
  let root = process.cwd();
  while (!existsSync(path.join(root, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(root);
    if (parent === root) {
      throw new Error('Configure MAINTENANCE_STORAGE_DIR.');
    }
    root = parent;
  }
  return root;
}

export function maintenanceStorageRoot(): string {
  const configured = process.env.MAINTENANCE_STORAGE_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(findWorkspaceRoot(), 'storage', 'maintenance');
}

function backupRoot(): string {
  return path.join(maintenanceStorageRoot(), 'backups');
}

function importRoot(): string {
  return path.join(maintenanceStorageRoot(), 'imports');
}

function databaseUrl(key: MaintenanceDatabaseKey): string {
  const variable =
    key === 'nivel3' ? 'NIVEL3_DATABASE_URL' : 'N3RD_DATABASE_URL';
  const value = process.env[variable]?.trim();
  if (!value) throw new Error('Variável ' + variable + ' não configurada.');
  return value;
}

function connectionInfo(key: MaintenanceDatabaseKey) {
  const url = new URL(databaseUrl(key));
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!database) throw new Error('URL de ' + key + ' não informa o banco.');
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

function backupKeys(
  target: MaintenanceBackupTarget,
): MaintenanceDatabaseKey[] {
  return target === 'all' ? ['nivel3', 'n3rd'] : [target];
}

function backupPrefix(kind: BackupKind): string {
  if (kind === 'automatic') return 'auto';
  if (kind === 'pre-import') return 'preimport';
  return 'manual';
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '_' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function backupKind(name: string): MaintenanceBackupFile['kind'] {
  if (name.startsWith('manual_')) return 'manual';
  if (name.startsWith('auto_')) return 'automatic';
  if (name.startsWith('preimport_')) return 'pre-import';
  return 'unknown';
}

function backupDatabase(name: string): MaintenanceDatabaseKey | null {
  if (/(^|_)nivel3_/.test(name)) return 'nivel3';
  if (/(^|_)n3rd_/.test(name)) return 'n3rd';
  return null;
}

function validateTarget(value: string): MaintenanceBackupTarget {
  if (value === 'nivel3' || value === 'n3rd' || value === 'all') return value;
  throw new BadRequestException('Banco alvo inválido.');
}

function validateDatabase(value: string): MaintenanceDatabaseKey {
  if (value === 'nivel3' || value === 'n3rd') return value;
  throw new BadRequestException('Banco alvo inválido.');
}

function validateJob(input: MaintenanceBackupJobInput): void {
  validateTarget(input.target);
  if (input.frequency !== 'daily' && input.frequency !== 'weekly') {
    throw new BadRequestException('Frequência inválida.');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) {
    throw new BadRequestException('Horário deve usar HH:mm.');
  }
  if (
    input.frequency === 'weekly' &&
    (!Number.isSafeInteger(input.weekday) ||
      input.weekday === null ||
      input.weekday < 0 ||
      input.weekday > 6)
  ) {
    throw new BadRequestException('Dia da semana deve estar entre 0 e 6.');
  }
  if (
    !Number.isSafeInteger(input.retentionDays) ||
    input.retentionDays < 1 ||
    input.retentionDays > 3650
  ) {
    throw new BadRequestException('Retenção deve estar entre 1 e 3650 dias.');
  }
}

function nextOccurrence(
  frequency: MaintenanceBackupFrequency,
  time: string,
  weekday: number | null,
  from = new Date(),
): Date {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setHours(hour, minute, 0, 0);

  if (frequency === 'daily') {
    if (candidate <= from) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  const targetDay = weekday ?? 0;
  let daysAhead = (targetDay - candidate.getDay() + 7) % 7;
  if (daysAhead === 0 && candidate <= from) daysAhead = 7;
  candidate.setDate(candidate.getDate() + daysAhead);
  return candidate;
}

function job(row: JobRow): MaintenanceBackupJob {
  const target = validateTarget(row.target);
  const frequency: MaintenanceBackupFrequency =
    row.frequency === 'weekly' ? 'weekly' : 'daily';
  const lastStatus =
    row.last_status === 'running' ||
    row.last_status === 'success' ||
    row.last_status === 'error'
      ? row.last_status
      : 'idle';
  return {
    id: Number(row.id),
    target,
    frequency,
    time: row.run_time,
    weekday: row.weekday,
    retentionDays: row.retention_days,
    enabled: Boolean(row.is_active),
    lastRunAt: iso(row.last_run_at),
    nextRunAt: iso(row.next_run_at),
    lastStatus,
    lastError: row.last_error,
    createdAt: iso(row.created_at) ?? '',
    updatedAt: iso(row.updated_at) ?? '',
  };
}

function operation(row: OperationRow): MaintenanceOperation {
  const status =
    row.status === 'running' ||
    row.status === 'success' ||
    row.status === 'error'
      ? row.status
      : 'idle';
  return {
    id: Number(row.id),
    action: row.action,
    target: row.target,
    actorUserId: row.actor_user_id,
    status,
    detail: row.detail,
    createdAt: iso(row.created_at) ?? '',
    finishedAt: iso(row.finished_at),
  };
}

@Injectable()
export class MaintenanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaintenanceService.name);
  private ensurePromise: Promise<void> | null = null;
  private toolCache = new Map<'dump' | 'restore', string | null>();

  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
    @Inject(N3RD_DATABASE)
    private readonly n3rd: N3rdDatabaseClient,
  ) {}

  onApplicationBootstrap(): void {
    void this.ensureSchema().catch((error: unknown) => {
      this.logger.error(
        'Falha ao preparar estruturas de manutenção: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    });
  }

  async ensureSchema(): Promise<void> {
    if (!this.ensurePromise) {
      this.ensurePromise = (async () => {
        await this.nivel3.$executeRawUnsafe(CREATE_BACKUP_JOBS);
        await this.nivel3.$executeRawUnsafe(CREATE_WORKER_STATE);
        await this.nivel3.$executeRawUnsafe(CREATE_OPERATIONS);
        await mkdir(backupRoot(), { recursive: true });
        await mkdir(importRoot(), { recursive: true });
      })().catch((error) => {
        this.ensurePromise = null;
        throw error;
      });
    }
    await this.ensurePromise;
  }

  async status(): Promise<MaintenanceSystemStatusResponse> {
    await this.ensureSchema();
    await this.removeExpiredStagedDumps();

    const [
      nivel3,
      n3rd,
      backups,
      jobs,
      operations,
      worker,
      storage,
      dumpClient,
      restoreClient,
    ] = await Promise.all([
      this.databaseStatus('nivel3'),
      this.databaseStatus('n3rd'),
      this.listBackups(),
      this.listJobs(),
      this.listOperations(),
      this.workerStatus(),
      this.storageStatus(),
      this.resolveTool('dump', false),
      this.resolveTool('restore', false),
    ]);

    const memory = process.memoryUsage();

    return {
      generatedAt: new Date().toISOString(),
      api: {
        status: 'up',
        uptimeSeconds: Math.floor(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV ?? 'development',
        memoryRssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
      },
      worker,
      storage,
      tools: {
        dumpClient,
        restoreClient,
      },
      databases: [nivel3, n3rd],
      backups: backups.slice(0, 30),
      jobs,
      operations,
    };
  }

  async databaseTables(
    key: MaintenanceDatabaseKey,
  ): Promise<MaintenanceDatabaseTable[]> {
    const database = validateDatabase(key);
    const client = this.client(database);
    const rows = await client.$queryRawUnsafe<TableRow[]>(
      [
        'SELECT',
        '  TABLE_NAME AS table_name,',
        '  ENGINE AS engine,',
        '  TABLE_ROWS AS table_rows,',
        '  DATA_LENGTH AS data_length,',
        '  INDEX_LENGTH AS index_length',
        'FROM information_schema.TABLES',
        'WHERE TABLE_SCHEMA = DATABASE()',
        'ORDER BY TABLE_NAME ASC',
      ].join('\n'),
    );
    return rows.map((row) => {
      const dataBytes = numberValue(row.data_length);
      const indexBytes = numberValue(row.index_length);
      return {
        name: row.table_name,
        engine: row.engine,
        estimatedRows: numberValue(row.table_rows),
        dataBytes,
        indexBytes,
        totalBytes: dataBytes + indexBytes,
      };
    });
  }

  async runManualBackup(
    target: MaintenanceBackupTarget,
    actorUserId: number,
  ): Promise<MaintenanceBackupRunResponse> {
    await this.ensureSchema();
    const normalized = validateTarget(target);
    const operationId = await this.beginOperation(
      'backup-manual',
      normalized,
      actorUserId,
    );
    try {
      const files = await this.createBackups(normalized, 'manual');
      await this.finishOperation(
        operationId,
        'success',
        files.map((file) => file.name).join(', '),
      );
      return { files };
    } catch (error) {
      await this.finishOperation(
        operationId,
        'error',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async listBackups(): Promise<MaintenanceBackupFile[]> {
    await mkdir(backupRoot(), { recursive: true });
    const result: MaintenanceBackupFile[] = [];
    for (const name of await readdir(backupRoot())) {
      if (!name.toLowerCase().endsWith('.sql')) continue;
      const database = backupDatabase(name);
      if (!database) continue;
      try {
        const info = await lstat(path.join(backupRoot(), name));
        if (!info.isFile() || info.isSymbolicLink()) continue;
        result.push({
          name,
          database,
          kind: backupKind(name),
          sizeBytes: info.size,
          createdAt: info.mtime.toISOString(),
        });
      } catch {
        // File may have been removed concurrently.
      }
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async backupFile(name: string): Promise<string> {
    if (
      name !== path.basename(name) ||
      !name.toLowerCase().endsWith('.sql') ||
      /[\/\\:\x00-\x1f]/.test(name)
    ) {
      throw new BadRequestException('Nome de backup inválido.');
    }
    const file = path.join(backupRoot(), name);
    try {
      const info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error();
    } catch {
      throw new NotFoundException('Backup não encontrado.');
    }
    return file;
  }

  async removeBackup(name: string, actorUserId: number): Promise<void> {
    const file = await this.backupFile(name);
    await unlink(file);
    const operationId = await this.beginOperation(
      'backup-delete',
      backupDatabase(name),
      actorUserId,
    );
    await this.finishOperation(operationId, 'success', name);
  }

  async listJobs(): Promise<MaintenanceBackupJob[]> {
    await this.ensureSchema();
    const rows = await this.nivel3.$queryRawUnsafe<JobRow[]>(
      [
        'SELECT id, target, frequency, run_time, weekday, retention_days,',
        '       is_active, last_run_at, next_run_at, last_status, last_error,',
        '       created_at, updated_at',
        'FROM maintenance_backup_jobs',
        'ORDER BY id ASC',
      ].join('\n'),
    );
    return rows.map(job);
  }

  async createJob(
    input: MaintenanceBackupJobInput,
    actorUserId: number,
  ): Promise<MaintenanceBackupJob> {
    validateJob(input);
    await this.ensureSchema();
    const next = input.enabled
      ? nextOccurrence(input.frequency, input.time, input.weekday)
      : null;
    await this.nivel3.$executeRawUnsafe(
      [
        'INSERT INTO maintenance_backup_jobs (',
        '  target, frequency, run_time, weekday, retention_days, is_active,',
        '  next_run_at, created_by, created_at, updated_at',
        ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      ].join('\n'),
      input.target,
      input.frequency,
      input.time,
      input.frequency === 'weekly' ? input.weekday : null,
      input.retentionDays,
      input.enabled ? 1 : 0,
      next,
      actorUserId,
    );
    const idRows = await this.nivel3.$queryRawUnsafe<
      Array<{ id: number | bigint }>
    >('SELECT LAST_INSERT_ID() AS id');
    return this.getJob(Number(idRows[0]?.id ?? 0));
  }

  async updateJob(
    id: number,
    input: MaintenanceBackupJobInput,
  ): Promise<MaintenanceBackupJob> {
    validateJob(input);
    await this.getJob(id);
    const next = input.enabled
      ? nextOccurrence(input.frequency, input.time, input.weekday)
      : null;
    await this.nivel3.$executeRawUnsafe(
      [
        'UPDATE maintenance_backup_jobs',
        'SET target = ?, frequency = ?, run_time = ?, weekday = ?,',
        '    retention_days = ?, is_active = ?, next_run_at = ?,',
        "    last_status = CASE WHEN ? = 1 THEN last_status ELSE 'idle' END,",
        '    updated_at = NOW()',
        'WHERE id = ?',
      ].join('\n'),
      input.target,
      input.frequency,
      input.time,
      input.frequency === 'weekly' ? input.weekday : null,
      input.retentionDays,
      input.enabled ? 1 : 0,
      next,
      input.enabled ? 1 : 0,
      id,
    );
    return this.getJob(id);
  }

  async removeJob(id: number): Promise<void> {
    const affected = await this.nivel3.$executeRawUnsafe(
      'DELETE FROM maintenance_backup_jobs WHERE id = ?',
      id,
    );
    if (!affected) throw new NotFoundException('Job de backup não encontrado.');
  }

  async heartbeatWorker(): Promise<void> {
    await this.ensureSchema();
    await this.nivel3.$executeRawUnsafe(
      [
        'INSERT INTO maintenance_worker_state (worker_key, last_heartbeat_at, detail)',
        "VALUES ('backup-worker', NOW(), 'running')",
        'ON DUPLICATE KEY UPDATE last_heartbeat_at = NOW(), detail = VALUES(detail)',
      ].join('\n'),
    );
  }

  async runDueBackupJobs(limit = 5): Promise<number> {
    await this.ensureSchema();
    const rows = await this.nivel3.$queryRawUnsafe<JobRow[]>(
      [
        'SELECT id, target, frequency, run_time, weekday, retention_days,',
        '       is_active, last_run_at, next_run_at, last_status, last_error,',
        '       created_at, updated_at',
        'FROM maintenance_backup_jobs',
        'WHERE is_active = 1',
        '  AND next_run_at IS NOT NULL',
        '  AND next_run_at <= NOW()',
        'ORDER BY next_run_at ASC',
        'LIMIT ?',
      ].join('\n'),
      Math.max(1, Math.min(20, limit)),
    );

    let completed = 0;
    for (const row of rows) {
      const current = job(row);
      const next = nextOccurrence(
        current.frequency,
        current.time,
        current.weekday,
        new Date(),
      );
      const claimed = await this.nivel3.$executeRawUnsafe(
        [
          'UPDATE maintenance_backup_jobs',
          "SET last_status = 'running', last_error = NULL, next_run_at = ?, updated_at = NOW()",
          'WHERE id = ? AND is_active = 1 AND next_run_at <= NOW()',
        ].join('\n'),
        next,
        current.id,
      );
      if (!claimed) continue;

      try {
        await this.createBackups(current.target, 'automatic');
        await this.cleanupAutomaticBackups(
          current.target,
          current.retentionDays,
        );
        await this.nivel3.$executeRawUnsafe(
          [
            'UPDATE maintenance_backup_jobs',
            "SET last_run_at = NOW(), last_status = 'success', last_error = NULL, updated_at = NOW()",
            'WHERE id = ?',
          ].join('\n'),
          current.id,
        );
        completed++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        await this.nivel3.$executeRawUnsafe(
          [
            'UPDATE maintenance_backup_jobs',
            "SET last_run_at = NOW(), last_status = 'error', last_error = ?, updated_at = NOW()",
            'WHERE id = ?',
          ].join('\n'),
          message.slice(0, 10000),
          current.id,
        );
        this.logger.error(
          'Falha no job de backup #' + current.id + ': ' + message,
        );
      }
    }

    return completed;
  }

  async stageDump(
    target: MaintenanceDatabaseKey,
    uploaded: UploadedDump,
  ): Promise<MaintenanceDumpStageResponse> {
    await this.ensureSchema();
    const database = validateDatabase(target);

    if (!uploaded.originalname.toLowerCase().endsWith('.sql')) {
      await this.safeUnlink(uploaded.path);
      throw new BadRequestException('Envie um arquivo .sql.');
    }
    if (!uploaded.size) {
      await this.safeUnlink(uploaded.path);
      throw new BadRequestException('O dump está vazio.');
    }

    const scan = await this.scanDump(uploaded.path, database);
    if (scan.blocked.length > 0) {
      await this.safeUnlink(uploaded.path);
      throw new BadRequestException(
        'Dump bloqueado: ' + scan.blocked.join('; '),
      );
    }

    const token = randomUUID();
    const sqlFile = path.join(importRoot(), token + '.sql');
    const metadataFile = path.join(importRoot(), token + '.json');
    await rename(uploaded.path, sqlFile);
    const metadata: DumpMetadata = {
      token,
      target: database,
      originalName: path.basename(uploaded.originalname),
      sizeBytes: uploaded.size,
      sha256: scan.sha256,
      expiresAt: new Date(Date.now() + DUMP_STAGE_TTL_MS).toISOString(),
      summary: scan.summary,
      warnings: scan.warnings,
      confirmation: 'IMPORTAR ' + database.toUpperCase(),
    };
    await writeFile(metadataFile, JSON.stringify(metadata, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    });
    return metadata;
  }

  async applyDump(
    token: string,
    confirmation: string,
    actorUserId: number,
  ): Promise<MaintenanceDumpApplyResponse> {
    await this.ensureSchema();
    const metadata = await this.dumpMetadata(token);
    if (new Date(metadata.expiresAt).getTime() < Date.now()) {
      await this.removeStagedDump(token);
      throw new ConflictException('O dump validado expirou. Envie-o novamente.');
    }
    if (confirmation.trim() !== metadata.confirmation) {
      throw new BadRequestException(
        'Confirmação inválida. Digite ' + metadata.confirmation + '.',
      );
    }

    const safetyFiles = await this.createBackups(
      metadata.target,
      'pre-import',
    );
    const safetyBackup = safetyFiles[0];
    if (!safetyBackup) {
      throw new ConflictException(
        'Não foi possível criar o backup de segurança antes da importação.',
      );
    }

    const operationId = await this.beginOperation(
      'dump-import',
      metadata.target,
      actorUserId,
    );

    try {
      await this.restoreDump(
        metadata.target,
        path.join(importRoot(), token + '.sql'),
      );
      const repair = await this.repair(metadata.target);
      await this.finishOperation(
        operationId,
        'success',
        'Dump ' +
          metadata.originalName +
          ' importado; backup de segurança: ' +
          safetyBackup.name,
      );
      await this.removeStagedDump(token);
      return {
        imported: true,
        target: metadata.target,
        safetyBackup,
        repair,
      };
    } catch (error) {
      await this.finishOperation(
        operationId,
        'error',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async repair(
    target: MaintenanceDatabaseKey,
  ): Promise<MaintenanceRepairResponse> {
    const database = validateDatabase(target);
    let navigationPrepared = false;
    let maintenancePrepared = false;

    if (database === 'nivel3') {
      this.ensurePromise = null;
      await this.ensureSchema();
      maintenancePrepared = true;
      await this.ensureNavigation();
      navigationPrepared = true;
    } else {
      await this.n3rd.$queryRawUnsafe('SELECT 1');
    }

    const current = await this.databaseStatus(database);
    return {
      target: database,
      navigationPrepared,
      maintenancePrepared,
      missingRequiredTables: current.missingRequiredTables,
    };
  }

  private client(key: MaintenanceDatabaseKey): QueryClient {
    return key === 'nivel3' ? this.nivel3 : this.n3rd;
  }

  private async databaseStatus(
    key: MaintenanceDatabaseKey,
  ): Promise<MaintenanceDatabaseStatus> {
    const started = Date.now();
    let info: ReturnType<typeof connectionInfo>;
    try {
      info = connectionInfo(key);
    } catch (error) {
      return {
        key,
        label: key === 'nivel3' ? 'Nivel3' : 'N3RD',
        status: 'down',
        host: '—',
        port: 0,
        database: key,
        version: null,
        latencyMs: null,
        sizeBytes: 0,
        tableCount: 0,
        missingRequiredTables: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      const client = this.client(key);
      const [versionRows, aggregateRows, tableRows] = await Promise.all([
        client.$queryRawUnsafe<
          Array<{ version: string; database_name: string }>
        >('SELECT VERSION() AS version, DATABASE() AS database_name'),
        client.$queryRawUnsafe<
          Array<{
            table_count: number | bigint | string;
            size_bytes: number | bigint | string;
          }>
        >(
          [
            'SELECT COUNT(*) AS table_count,',
            '       COALESCE(SUM(DATA_LENGTH + INDEX_LENGTH), 0) AS size_bytes',
            'FROM information_schema.TABLES',
            'WHERE TABLE_SCHEMA = DATABASE()',
          ].join('\n'),
        ),
        client.$queryRawUnsafe<Array<{ table_name: string }>>(
          [
            'SELECT TABLE_NAME AS table_name',
            'FROM information_schema.TABLES',
            'WHERE TABLE_SCHEMA = DATABASE()',
          ].join('\n'),
        ),
      ]);

      const existing = new Set(tableRows.map((row) => row.table_name));
      const required = key === 'nivel3' ? REQUIRED_NIVEL3_TABLES : [];
      const missingRequiredTables = required.filter(
        (table) => !existing.has(table),
      );
      const aggregate = aggregateRows[0];

      return {
        key,
        label: key === 'nivel3' ? 'Nivel3' : 'N3RD',
        status: missingRequiredTables.length > 0 ? 'degraded' : 'up',
        host: info.host,
        port: info.port,
        database: versionRows[0]?.database_name ?? info.database,
        version: versionRows[0]?.version ?? null,
        latencyMs: Date.now() - started,
        sizeBytes: numberValue(aggregate?.size_bytes),
        tableCount: numberValue(aggregate?.table_count),
        missingRequiredTables,
        error: null,
      };
    } catch (error) {
      return {
        key,
        label: key === 'nivel3' ? 'Nivel3' : 'N3RD',
        status: 'down',
        host: info.host,
        port: info.port,
        database: info.database,
        version: null,
        latencyMs: null,
        sizeBytes: 0,
        tableCount: 0,
        missingRequiredTables: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async createBackups(
    target: MaintenanceBackupTarget,
    kind: BackupKind,
  ): Promise<MaintenanceBackupFile[]> {
    await mkdir(backupRoot(), { recursive: true });
    const executable = await this.resolveTool('dump', true);
    const files: MaintenanceBackupFile[] = [];

    for (const key of backupKeys(target)) {
      const config = connectionInfo(key);
      const name =
        backupPrefix(kind) + '_' + key + '_' + timestamp() + '.sql';
      const file = path.join(backupRoot(), name);
      const args = [
        '--host=' + config.host,
        '--port=' + config.port,
        '--user=' + config.user,
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        '--hex-blob',
        '--default-character-set=utf8mb4',
        '--skip-lock-tables',
        config.database,
      ];

      try {
        await this.runProcess(executable as string, args, {
          stdoutFile: file,
          env: { MYSQL_PWD: config.password },
        });
        const info = await lstat(file);
        files.push({
          name,
          database: key,
          kind,
          sizeBytes: info.size,
          createdAt: info.mtime.toISOString(),
        });
      } catch (error) {
        await this.safeUnlink(file);
        throw error;
      }
    }

    return files;
  }

  private async restoreDump(
    key: MaintenanceDatabaseKey,
    sqlFile: string,
  ): Promise<void> {
    const executable = await this.resolveTool('restore', true);
    const config = connectionInfo(key);
    const args = [
      '--host=' + config.host,
      '--port=' + config.port,
      '--user=' + config.user,
      '--default-character-set=utf8mb4',
      '--binary-mode',
      config.database,
    ];
    await this.runProcess(executable as string, args, {
      stdinFile: sqlFile,
      env: { MYSQL_PWD: config.password },
    });
  }

  private async resolveTool(
    kind: 'dump' | 'restore',
    required: boolean,
  ): Promise<string | null> {
    if (this.toolCache.has(kind)) {
      const cached = this.toolCache.get(kind) ?? null;
      if (!cached && required) {
        throw new ConflictException(
          kind === 'dump'
            ? 'mariadb-dump/mysqldump não encontrado. Configure MARIADB_DUMP_BIN.'
            : 'mariadb/mysql não encontrado. Configure MARIADB_CLIENT_BIN.',
        );
      }
      return cached;
    }

    const configured =
      kind === 'dump'
        ? process.env.MARIADB_DUMP_BIN?.trim()
        : process.env.MARIADB_CLIENT_BIN?.trim();
    const candidates = configured
      ? [configured]
      : kind === 'dump'
        ? ['mariadb-dump', 'mysqldump']
        : ['mariadb', 'mysql'];

    for (const candidate of candidates) {
      try {
        await this.runProcess(candidate, ['--version'], {
          captureStdout: true,
          timeoutMs: 5000,
        });
        this.toolCache.set(kind, candidate);
        return candidate;
      } catch {
        // Try the next compatible binary.
      }
    }

    this.toolCache.set(kind, null);
    if (required) {
      throw new ConflictException(
        kind === 'dump'
          ? 'mariadb-dump/mysqldump não encontrado. Configure MARIADB_DUMP_BIN.'
          : 'mariadb/mysql não encontrado. Configure MARIADB_CLIENT_BIN.',
      );
    }
    return null;
  }

  private runProcess(
    executable: string,
    args: string[],
    options: {
      stdoutFile?: string;
      stdinFile?: string;
      env?: Record<string, string>;
      captureStdout?: boolean;
      timeoutMs?: number;
    } = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        shell: false,
        windowsHide: true,
        env: { ...process.env, ...options.env },
        stdio: [
          options.stdinFile ? 'pipe' : 'ignore',
          options.stdoutFile || options.captureStdout ? 'pipe' : 'ignore',
          'pipe',
        ],
      });

      let stderr = '';
      let stdout = '';
      let settled = false;
      const timer = options.timeoutMs
        ? setTimeout(() => {
            child.kill();
            if (!settled) {
              settled = true;
              reject(new Error('Tempo limite excedido ao executar ' + executable + '.'));
            }
          }, options.timeoutMs)
        : null;

      if (options.stdinFile && child.stdin) {
        const input = createReadStream(options.stdinFile);
        input.on('error', (error) => child.stdin?.destroy(error));
        input.pipe(child.stdin);
      }

      if (options.stdoutFile && child.stdout) {
        const output = createWriteStream(options.stdoutFile, { flags: 'wx' });
        output.on('error', (error) => child.stdout?.destroy(error));
        child.stdout.pipe(output);
      } else if (options.captureStdout && child.stdout) {
        child.stdout.on('data', (chunk: Buffer) => {
          if (stdout.length < TOOL_ERROR_LIMIT) stdout += chunk.toString();
        });
      }

      child.stderr?.on('data', (chunk: Buffer) => {
        if (stderr.length < TOOL_ERROR_LIMIT) stderr += chunk.toString();
      });

      child.on('error', (error) => {
        if (timer) clearTimeout(timer);
        if (settled) return;
        settled = true;
        reject(error);
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        if (settled) return;
        settled = true;
        if (code === 0) {
          resolve(stdout.trim());
          return;
        }
        reject(
          new Error(
            executable +
              ' terminou com código ' +
              String(code) +
              (stderr.trim() ? ': ' + stderr.trim() : '.'),
          ),
        );
      });
    });
  }

  private async cleanupAutomaticBackups(
    target: MaintenanceBackupTarget,
    retentionDays: number,
  ): Promise<void> {
    const before =
      Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const keys = new Set(backupKeys(target));

    for (const item of await this.listBackups()) {
      if (item.kind !== 'automatic' || !keys.has(item.database)) continue;
      if (new Date(item.createdAt).getTime() >= before) continue;
      await this.safeUnlink(path.join(backupRoot(), item.name));
    }
  }

  private async storageStatus(): Promise<
    MaintenanceSystemStatusResponse['storage']
  > {
    await mkdir(backupRoot(), { recursive: true });
    try {
      const stats = await statfs(backupRoot());
      const blockSize = numberValue(stats.bsize);
      return {
        backupDirectory: backupRoot(),
        totalBytes: numberValue(stats.blocks) * blockSize,
        freeBytes: numberValue(stats.bavail) * blockSize,
      };
    } catch {
      return {
        backupDirectory: backupRoot(),
        totalBytes: null,
        freeBytes: null,
      };
    }
  }

  private async workerStatus(): Promise<
    MaintenanceSystemStatusResponse['worker']
  > {
    const rows = await this.nivel3.$queryRawUnsafe<
      Array<{ last_heartbeat_at: Date | string }>
    >(
      "SELECT last_heartbeat_at FROM maintenance_worker_state WHERE worker_key = 'backup-worker' LIMIT 1",
    );
    const last = rows[0]?.last_heartbeat_at;
    if (!last) return { status: 'unknown', lastHeartbeatAt: null };
    const timestampValue = new Date(last).getTime();
    const up = Date.now() - timestampValue <= 120000;
    return {
      status: up ? 'up' : 'down',
      lastHeartbeatAt: iso(last),
    };
  }

  private async getJob(id: number): Promise<MaintenanceBackupJob> {
    const rows = await this.nivel3.$queryRawUnsafe<JobRow[]>(
      [
        'SELECT id, target, frequency, run_time, weekday, retention_days,',
        '       is_active, last_run_at, next_run_at, last_status, last_error,',
        '       created_at, updated_at',
        'FROM maintenance_backup_jobs',
        'WHERE id = ?',
        'LIMIT 1',
      ].join('\n'),
      id,
    );
    if (!rows[0]) throw new NotFoundException('Job de backup não encontrado.');
    return job(rows[0]);
  }

  private async listOperations(): Promise<MaintenanceOperation[]> {
    const rows = await this.nivel3.$queryRawUnsafe<OperationRow[]>(
      [
        'SELECT id, action, target, actor_user_id, status, detail, created_at, finished_at',
        'FROM maintenance_operations',
        'ORDER BY id DESC',
        'LIMIT 30',
      ].join('\n'),
    );
    return rows.map(operation);
  }

  private async beginOperation(
    action: string,
    target: string | null,
    actorUserId: number | null,
  ): Promise<number> {
    await this.ensureSchema();
    await this.nivel3.$executeRawUnsafe(
      [
        'INSERT INTO maintenance_operations (',
        '  action, target, actor_user_id, status, created_at',
        ") VALUES (?, ?, ?, 'running', NOW())",
      ].join('\n'),
      action,
      target,
      actorUserId,
    );
    const rows = await this.nivel3.$queryRawUnsafe<
      Array<{ id: number | bigint }>
    >('SELECT LAST_INSERT_ID() AS id');
    return Number(rows[0]?.id ?? 0);
  }

  private async finishOperation(
    id: number,
    status: 'success' | 'error',
    detail: string,
  ): Promise<void> {
    if (!id) return;
    await this.nivel3.$executeRawUnsafe(
      [
        'UPDATE maintenance_operations',
        'SET status = ?, detail = ?, finished_at = NOW()',
        'WHERE id = ?',
      ].join('\n'),
      status,
      detail.slice(0, 20000),
      id,
    );
  }

  private async ensureNavigation(): Promise<void> {
    await this.nivel3.$executeRawUnsafe(CREATE_NAVIGATION_SECTIONS);
    await this.nivel3.$executeRawUnsafe(CREATE_NAVIGATION_ITEMS);

    for (const [sectionIndex, section] of DEFAULT_NAVIGATION.entries()) {
      await this.nivel3.$executeRawUnsafe(
        [
          'INSERT IGNORE INTO navigation_sections (',
          '  slug, label, short_label, sort_order, is_active, created_at, updated_at',
          ') VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
        ].join('\n'),
        section.slug,
        section.label,
        section.shortLabel,
        sectionIndex * 10,
      );
    }

    const sections = await this.nivel3.$queryRawUnsafe<
      Array<{ id: number; slug: string }>
    >('SELECT id, slug FROM navigation_sections');
    const sectionIds = new Map(
      sections.map((section) => [section.slug, Number(section.id)]),
    );

    for (const section of DEFAULT_NAVIGATION) {
      const sectionId = sectionIds.get(section.slug);
      if (!sectionId) continue;
      for (const [itemIndex, item] of section.items.entries()) {
        await this.nivel3.$executeRawUnsafe(
          [
            'INSERT IGNORE INTO navigation_items (',
            '  section_id, slug, label, href, status, visibility_condition,',
            '  sort_order, is_active, created_at, updated_at',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
          ].join('\n'),
          sectionId,
          item.slug,
          item.label,
          item.href ?? null,
          item.status,
          item.visibilityCondition
            ? JSON.stringify(item.visibilityCondition)
            : null,
          itemIndex * 10,
        );
      }
    }

    await synchronizeNavigation(this.nivel3);
  }

  private async scanDump(
    file: string,
    target: MaintenanceDatabaseKey,
  ): Promise<{
    sha256: string;
    blocked: string[];
    warnings: string[];
    summary: DumpMetadata['summary'];
  }> {
    const config = connectionInfo(target);
    const hash = createHash('sha256');
    const blocked = new Set<string>();
    const warnings: string[] = [];
    const summary = { createTables: 0, inserts: 0, drops: 0 };
    const stream = createReadStream(file);
    let carry = '';

    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      hash.update(buffer);
      const text = carry + buffer.toString('utf8');
      const upper = text.toUpperCase();

      summary.createTables += (upper.match(/\bCREATE\s+TABLE\b/g) ?? []).length;
      summary.inserts += (upper.match(/\bINSERT\s+INTO\b/g) ?? []).length;
      summary.drops += (upper.match(/\bDROP\s+TABLE\b/g) ?? []).length;

      const dangerous: Array<[RegExp, string]> = [
        [/\bDROP\s+DATABASE\b/i, 'DROP DATABASE'],
        [/\bCREATE\s+DATABASE\b/i, 'CREATE DATABASE'],
        [/\bCREATE\s+USER\b/i, 'CREATE USER'],
        [/\bALTER\s+USER\b/i, 'ALTER USER'],
        [/\bDROP\s+USER\b/i, 'DROP USER'],
        [/\bGRANT\b/i, 'GRANT'],
        [/\bREVOKE\b/i, 'REVOKE'],
        [/\bSET\s+GLOBAL\b/i, 'SET GLOBAL'],
        [/\bSHUTDOWN\b/i, 'SHUTDOWN'],
        [/\bINSTALL\s+PLUGIN\b/i, 'INSTALL PLUGIN'],
        [/\bUNINSTALL\s+PLUGIN\b/i, 'UNINSTALL PLUGIN'],
      ];
      for (const [pattern, label] of dangerous) {
        if (pattern.test(text)) blocked.add(label);
      }

      for (const match of text.matchAll(/\bUSE\s+\x60?([A-Za-z0-9_$-]+)\x60?\s*;/gi)) {
        if (match[1]?.toLowerCase() !== config.database.toLowerCase()) {
          blocked.add('USE para outro banco (' + String(match[1]) + ')');
        }
      }

      carry = text.slice(-4096);
    }

    if (summary.createTables === 0) {
      warnings.push('Nenhum CREATE TABLE foi identificado no dump.');
    }
    if (summary.inserts === 0) {
      warnings.push('Nenhum INSERT INTO foi identificado no dump.');
    }
    if (summary.drops > 0) {
      warnings.push(
        'O dump contém DROP TABLE. O backup de segurança será obrigatório antes da importação.',
      );
    }

    return {
      sha256: hash.digest('hex'),
      blocked: [...blocked],
      warnings,
      summary,
    };
  }

  private async dumpMetadata(token: string): Promise<DumpMetadata> {
    if (!/^[0-9a-f-]{36}$/i.test(token)) {
      throw new BadRequestException('Token de dump inválido.');
    }
    try {
      const raw = await readFile(
        path.join(importRoot(), token + '.json'),
        'utf8',
      );
      return JSON.parse(raw) as DumpMetadata;
    } catch {
      throw new NotFoundException('Dump validado não encontrado.');
    }
  }

  private async removeStagedDump(token: string): Promise<void> {
    await Promise.all([
      this.safeUnlink(path.join(importRoot(), token + '.sql')),
      this.safeUnlink(path.join(importRoot(), token + '.json')),
    ]);
  }

  private async removeExpiredStagedDumps(): Promise<void> {
    await mkdir(importRoot(), { recursive: true });
    for (const name of await readdir(importRoot())) {
      if (!name.endsWith('.json')) continue;
      const token = name.slice(0, -5);
      try {
        const raw = await readFile(path.join(importRoot(), name), 'utf8');
        const metadata = JSON.parse(raw) as DumpMetadata;
        if (new Date(metadata.expiresAt).getTime() < Date.now()) {
          await this.removeStagedDump(token);
        }
      } catch {
        await this.safeUnlink(path.join(importRoot(), name));
      }
    }
  }

  private async safeUnlink(file: string): Promise<void> {
    try {
      await unlink(file);
    } catch {
      // Missing or concurrently removed file.
    }
  }
}
