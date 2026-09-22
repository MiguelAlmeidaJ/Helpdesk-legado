import type {
  MaintenanceBackupJob,
  MaintenanceBackupJobInput,
  MaintenanceBackupRunResponse,
  MaintenanceBackupTarget,
  MaintenanceDatabaseKey,
  MaintenanceDatabaseTable,
  MaintenanceDumpApplyResponse,
  MaintenanceDumpStageResponse,
  MaintenanceRepairResponse,
  MaintenanceSystemStatusResponse,
} from '@helpdesk/contracts';
import { apiDownload, apiRequest } from '../../../shared/api/api-client';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function fetchMaintenanceStatus(signal?: AbortSignal) {
  return apiRequest<MaintenanceSystemStatusResponse>('maintenance/status', {
    signal,
  });
}

export function fetchMaintenanceTables(
  database: MaintenanceDatabaseKey,
  signal?: AbortSignal,
) {
  return apiRequest<MaintenanceDatabaseTable[]>(
    'maintenance/databases/' + database + '/tables',
    { signal },
  );
}

export function runMaintenanceBackup(target: MaintenanceBackupTarget) {
  return apiRequest<MaintenanceBackupRunResponse>('maintenance/backups', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ target }),
  });
}

export function downloadMaintenanceBackup(name: string) {
  return apiDownload(
    'maintenance/backups/' + encodeURIComponent(name),
    name,
  );
}

export function deleteMaintenanceBackup(name: string) {
  return apiRequest<null>(
    'maintenance/backups/' + encodeURIComponent(name),
    { method: 'DELETE' },
  );
}

export function createMaintenanceBackupJob(input: MaintenanceBackupJobInput) {
  return apiRequest<MaintenanceBackupJob>('maintenance/backup-jobs', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function updateMaintenanceBackupJob(
  id: number,
  input: MaintenanceBackupJobInput,
) {
  return apiRequest<MaintenanceBackupJob>(
    'maintenance/backup-jobs/' + id,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
  );
}

export function deleteMaintenanceBackupJob(id: number) {
  return apiRequest<null>('maintenance/backup-jobs/' + id, {
    method: 'DELETE',
  });
}

export function stageMaintenanceDump(
  target: MaintenanceDatabaseKey,
  file: File,
) {
  const body = new FormData();
  body.set('target', target);
  body.set('file', file);
  return apiRequest<MaintenanceDumpStageResponse>('maintenance/dumps/stage', {
    method: 'POST',
    body,
  });
}

export function applyMaintenanceDump(
  token: string,
  confirmation: string,
) {
  return apiRequest<MaintenanceDumpApplyResponse>(
    'maintenance/dumps/' + encodeURIComponent(token) + '/apply',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ confirmation }),
    },
  );
}

export function repairMaintenanceDatabase(target: MaintenanceDatabaseKey) {
  return apiRequest<MaintenanceRepairResponse>('maintenance/repair', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ target }),
  });
}
