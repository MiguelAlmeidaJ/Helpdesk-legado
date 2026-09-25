export type MaintenanceDatabaseKey = 'nivel3';
export type MaintenanceBackupTarget = 'nivel3';
export type MaintenanceBackupFrequency = 'daily' | 'weekly';
export type MaintenanceRunStatus = 'idle' | 'running' | 'success' | 'error';

export interface MaintenanceDatabaseStatus {
  key: MaintenanceDatabaseKey;
  label: string;
  status: 'up' | 'down' | 'degraded';
  host: string;
  port: number;
  database: string;
  version: string | null;
  latencyMs: number | null;
  sizeBytes: number;
  tableCount: number;
  missingRequiredTables: string[];
  error: string | null;
}

export type MaintenanceTableReviewState =
  | 'protected'
  | 'related'
  | 'review'
  | 'review-empty';

export interface MaintenanceDatabaseTable {
  name: string;
  engine: string | null;
  estimatedRows: number;
  dataBytes: number;
  indexBytes: number;
  totalBytes: number;
  createdAt: string | null;
  updatedAt: string | null;
  outgoingForeignKeys: number;
  incomingForeignKeys: number;
  reviewState: MaintenanceTableReviewState;
  reviewReason: string;
}

export interface MaintenanceBackupFile {
  name: string;
  database: MaintenanceDatabaseKey;
  kind: 'manual' | 'automatic' | 'pre-import' | 'unknown';
  sizeBytes: number;
  createdAt: string;
}

export interface MaintenanceBackupJob {
  id: number;
  target: MaintenanceBackupTarget;
  frequency: MaintenanceBackupFrequency;
  time: string;
  weekday: number | null;
  retentionDays: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: MaintenanceRunStatus;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceBackupJobInput {
  target: MaintenanceBackupTarget;
  frequency: MaintenanceBackupFrequency;
  time: string;
  weekday: number | null;
  retentionDays: number;
  enabled: boolean;
}

export interface MaintenanceOperation {
  id: number;
  action: string;
  target: string | null;
  actorUserId: number | null;
  status: MaintenanceRunStatus;
  detail: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface MaintenanceSystemStatusResponse {
  generatedAt: string;
  api: {
    status: 'up';
    uptimeSeconds: number;
    pid: number;
    nodeVersion: string;
    environment: string;
    timezone: string;
    memoryRssBytes: number;
    heapUsedBytes: number;
  };
  worker: {
    status: 'up' | 'down' | 'unknown';
    lastHeartbeatAt: string | null;
  };
  storage: {
    backupDirectory: string;
    totalBytes: number | null;
    freeBytes: number | null;
  };
  tools: {
    dumpClient: string | null;
    restoreClient: string | null;
  };
  databases: MaintenanceDatabaseStatus[];
  backups: MaintenanceBackupFile[];
  jobs: MaintenanceBackupJob[];
  operations: MaintenanceOperation[];
}

export interface MaintenanceBackupRunRequest {
  target: MaintenanceBackupTarget;
}

export interface MaintenanceBackupRunResponse {
  files: MaintenanceBackupFile[];
}

export interface MaintenanceDumpStageResponse {
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
}

export interface MaintenanceDumpApplyRequest {
  confirmation: string;
}

export interface MaintenanceDumpApplyResponse {
  imported: boolean;
  target: MaintenanceDatabaseKey;
  safetyBackup: MaintenanceBackupFile;
  repair: MaintenanceRepairResponse;
}

export interface MaintenanceRepairRequest {
  target: MaintenanceDatabaseKey;
}

export interface MaintenanceRepairResponse {
  target: MaintenanceDatabaseKey;
  navigationPrepared: boolean;
  maintenancePrepared: boolean;
  runtimePrepared: boolean;
  missingRequiredTables: string[];
}
