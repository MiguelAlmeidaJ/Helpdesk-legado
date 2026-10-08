import type {
  MaintenanceBackupJob,
  MaintenanceBackupJobInput,
  MaintenanceBackupRunResponse,
  MaintenanceBackupTarget,
  MaintenanceCatalogImageMigrationResponse,
  MaintenanceCatalogImageMigrationStatus,
  MaintenanceDatabaseKey,
  MaintenanceDatabaseTable,
  MaintenanceDumpApplyResponse,
  MaintenanceDumpStageResponse,
  MaintenanceRepairResponse,
  MaintenanceSystemStatusResponse,
  MaintenanceTableDropResponse,
  MaintenanceTableOptimizeResponse,
} from '@helpdesk/contracts';
import { apiDownload, apiRequest, apiUrl, ApiError } from '../../../shared/api/api-client';

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
  options: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<MaintenanceDumpStageResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.set('target', target);
    body.set('file', file);
    const onAbort = () => request.abort();
    const cleanup = () => options.signal?.removeEventListener('abort', onAbort);
    request.open('POST', apiUrl('maintenance/dumps/stage'));
    request.withCredentials = true;
    request.timeout = 30 * 60 * 1000;
    request.setRequestHeader('X-Helpdesk-Request', 'browser');
    request.setRequestHeader('Accept', 'application/json');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(Math.min(99, Math.round(event.loaded / event.total * 100)));
      }
    };
    request.onload = () => {
      cleanup();
      let result: unknown;
      try { result = JSON.parse(request.responseText); }
      catch { result = request.responseText; }
      if (request.status >= 200 && request.status < 300) {
        options.onProgress?.(100);
        resolve(result as MaintenanceDumpStageResponse);
      } else {
        reject(new ApiError(request.status, result));
      }
    };
    request.onerror = () => { cleanup(); reject(new Error('Falha de rede durante o envio do dump. Verifique a conexão e tente novamente.')); };
    request.ontimeout = () => { cleanup(); reject(new Error('O envio excedeu o tempo limite de 30 minutos.')); };
    request.onabort = () => { cleanup(); reject(new Error('Upload cancelado. Nenhum dump foi importado.')); };
    if (options.signal?.aborted) { reject(new Error('Upload cancelado.')); return; }
    options.signal?.addEventListener('abort', onAbort, { once: true });
    request.send(body);
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


export function fetchCatalogImageMigrationStatus(signal?: AbortSignal) {
  return apiRequest<MaintenanceCatalogImageMigrationStatus>(
    'maintenance/catalog-images/migration',
    { signal },
  );
}

export function migrateCatalogImages() {
  return apiRequest<MaintenanceCatalogImageMigrationResponse>(
    'maintenance/catalog-images/migration',
    { method: 'POST' },
  );
}


export function optimizeMaintenanceTables(
  target: MaintenanceDatabaseKey,
  tables: string[],
) {
  return apiRequest<MaintenanceTableOptimizeResponse>(
    'maintenance/tables/optimize',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ target, tables }),
    },
  );
}

export function dropMaintenanceTables(
  target: MaintenanceDatabaseKey,
  tables: string[],
  confirmation: string,
) {
  return apiRequest<MaintenanceTableDropResponse>(
    'maintenance/tables/drop',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ target, tables, confirmation }),
    },
  );
}

export function runMaintenanceSql(sql: string) {
  return apiRequest<{columns: string[]; rows: Record<string, unknown>[]; affectedRows: number | null; truncated: boolean}>('maintenance/sql-console', {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ sql }),
  });
}

export type MaintenanceSqlUpdatePreview = { token: string; expiresAt: string; table: string; column: string; key: string; id: string; before: unknown; after: unknown; rowsAffected: number };
export function previewMaintenanceSqlUpdate(sql: string) {return apiRequest<MaintenanceSqlUpdatePreview>('maintenance/sql-console/update/preview', {method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({sql})});}
export function applyMaintenanceSqlUpdate(token: string, confirmation: string) {return apiRequest<{affectedRows:number;table:string;column:string}>('maintenance/sql-console/update/apply', {method:'POST', headers:JSON_HEADERS, body: JSON.stringify({token,confirmation})});}
