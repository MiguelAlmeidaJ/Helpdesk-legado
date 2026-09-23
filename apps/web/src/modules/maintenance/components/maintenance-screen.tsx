"use client";

import type {
  CurrentUserResponse,
  MaintenanceBackupFrequency,
  MaintenanceBackupJob,
  MaintenanceBackupJobInput,
  MaintenanceBackupTarget,
  MaintenanceDatabaseKey,
  MaintenanceDatabaseTable,
  MaintenanceDumpStageResponse,
  MaintenanceSystemStatusResponse,
} from '@helpdesk/contracts';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  applyMaintenanceDump,
  createMaintenanceBackupJob,
  deleteMaintenanceBackup,
  deleteMaintenanceBackupJob,
  downloadMaintenanceBackup,
  fetchMaintenanceStatus,
  fetchMaintenanceTables,
  repairMaintenanceDatabase,
  runMaintenanceBackup,
  stageMaintenanceDump,
  updateMaintenanceBackupJob,
} from '../api/maintenance-api';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-white transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950';
const DANGER_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 text-sm font-bold text-app-danger transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50';
const CARD_CLASS =
  'rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm shadow-slate-950/5 dark:shadow-black/10';
const CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const LABEL_CLASS = 'grid gap-1.5 text-xs font-extrabold text-app-muted';
const TABLE_HEAD =
  'border-b border-app-border-soft bg-app-surface-muted px-3 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted';
const TABLE_CELL =
  'border-b border-app-border-soft px-3 py-3 align-top text-[13px] text-app-text-soft';

const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

type JobDraft = {
  target: MaintenanceBackupTarget;
  frequency: MaintenanceBackupFrequency;
  time: string;
  weekday: number;
  retentionDays: number;
};

const INITIAL_JOB: JobDraft = {
  target: 'nivel3',
  frequency: 'daily',
  time: '02:00',
  weekday: 1,
  retentionDays: 30,
};

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.map(String).join(' ');
  }
  if (reason instanceof ApiError) return 'A API respondeu com erro ' + reason.status + '.';
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.';
}

function bytes(value: number | null): string {
  if (value === null) return '—';
  if (value < 1024) return value + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let current = value / 1024;
  let index = 0;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index++;
  }
  return current.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' ' + units[index];
}

function date(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function uptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? days + 'd' : '', hours ? hours + 'h' : '', minutes + 'min']
    .filter(Boolean)
    .join(' ');
}

function statusClass(value: string): string {
  if (value === 'up' || value === 'success') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200';
  }
  if (value === 'degraded' || value === 'running') {
    return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200';
  }
  return 'border-app-danger-border bg-app-danger-soft text-app-danger';
}

function jobInput(draft: JobDraft): MaintenanceBackupJobInput {
  return {
    target: draft.target,
    frequency: draft.frequency,
    time: draft.time,
    weekday: draft.frequency === 'weekly' ? draft.weekday : null,
    retentionDays: draft.retentionDays,
    enabled: true,
  };
}

function backupTargetLabel(_target: MaintenanceBackupTarget): string {
  return 'Nivel3';
}

export function MaintenanceScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [status, setStatus] = useState<MaintenanceSystemStatusResponse | null>(null);
  const [tables, setTables] = useState<Record<string, MaintenanceDatabaseTable[]>>({});
  const [openDatabase, setOpenDatabase] = useState<MaintenanceDatabaseKey | null>(null);
  const [jobDraft, setJobDraft] = useState<JobDraft>(INITIAL_JOB);
  const dumpTarget: MaintenanceDatabaseKey = 'nivel3';
  const [dumpFile, setDumpFile] = useState<File | null>(null);
  const [stagedDump, setStagedDump] = useState<MaintenanceDumpStageResponse | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      setStatus(await fetchMaintenanceStatus(signal));
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === 'AbortError')) {
        setFeedback({ text: errorMessage(reason), error: true });
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  async function run(key: string, success: string, operation: () => Promise<unknown>) {
    setBusy(key);
    setFeedback(null);
    try {
      await operation();
      setFeedback({ text: success, error: false });
      await load();
    } catch (reason) {
      setFeedback({ text: errorMessage(reason), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function toggleDatabase(database: MaintenanceDatabaseKey) {
    if (openDatabase === database) {
      setOpenDatabase(null);
      return;
    }
    setOpenDatabase(database);
    if (tables[database]) return;
    setBusy('tables-' + database);
    try {
      const next = await fetchMaintenanceTables(database);
      setTables((current) => ({ ...current, [database]: next }));
    } catch (reason) {
      setFeedback({ text: errorMessage(reason), error: true });
    } finally {
      setBusy(null);
    }
  }

  function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run('job-create', 'Job de backup criado.', async () => {
      await createMaintenanceBackupJob(jobInput(jobDraft));
      setJobDraft(INITIAL_JOB);
    });
  }

  function toggleJob(job: MaintenanceBackupJob) {
    void run('job-' + job.id, job.enabled ? 'Job pausado.' : 'Job ativado.', async () => {
      await updateMaintenanceBackupJob(job.id, {
        target: job.target,
        frequency: job.frequency,
        time: job.time,
        weekday: job.weekday,
        retentionDays: job.retentionDays,
        enabled: !job.enabled,
      });
    });
  }

  function removeJob(job: MaintenanceBackupJob) {
    if (!window.confirm('Excluir este job de backup?')) return;
    void run('job-delete-' + job.id, 'Job excluído.', () =>
      deleteMaintenanceBackupJob(job.id),
    );
  }

  function chooseDump(event: ChangeEvent<HTMLInputElement>) {
    setDumpFile(event.target.files?.[0] ?? null);
    setStagedDump(null);
    setConfirmation('');
  }

  function validateDump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dumpFile) return;
    setBusy('dump-stage');
    setFeedback(null);
    stageMaintenanceDump(dumpTarget, dumpFile)
      .then((result) => {
        setStagedDump(result);
        setConfirmation('');
        setFeedback({ text: 'Dump validado. Revise o resumo antes de importar.', error: false });
      })
      .catch((reason) => setFeedback({ text: errorMessage(reason), error: true }))
      .finally(() => setBusy(null));
  }

  function applyDump() {
    if (!stagedDump) return;
    void run('dump-apply', 'Dump importado e adequações executadas.', async () => {
      await applyMaintenanceDump(stagedDump.token, confirmation);
      setStagedDump(null);
      setDumpFile(null);
      setConfirmation('');
      setTables({});
      setOpenDatabase(null);
    });
  }

  const backupToolsReady = Boolean(status?.tools.dumpClient);
  const restoreToolsReady = Boolean(status?.tools.restoreClient);
  const storagePercent = useMemo(() => {
    if (!status?.storage.totalBytes || status.storage.freeBytes === null) return null;
    return Math.round(
      ((status.storage.totalBytes - status.storage.freeBytes) / status.storage.totalBytes) * 100,
    );
  }, [status]);

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        meta={
          <span className="text-sm text-app-muted max-lg:hidden">
            Atualizado {date(status?.generatedAt ?? null)}
          </span>
        }
        subtitle="Saúde do sistema, bancos, backups, jobs e importação controlada de dumps."
        title="Manutenção"
        user={currentUser}
      />

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-6 py-6 max-sm:px-3.5">
        {feedback ? (
          <div
            className={
              'rounded-xl border px-4 py-3 text-sm font-semibold ' +
              (feedback.error
                ? 'border-app-danger-border bg-app-danger-soft text-app-danger'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200')
            }
            role="status"
          >
            {feedback.text}
          </div>
        ) : null}

        {loading && !status ? (
          <div className="h-1 animate-pulse rounded-full bg-app-brand" />
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={CARD_CLASS}>
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              API
            </span>
            <div className="mt-3 flex items-center justify-between gap-3">
              <strong className="text-xl">Online</strong>
              <span className={'rounded-full border px-2.5 py-1 text-xs font-bold ' + statusClass('up')}>
                UP
              </span>
            </div>
            <p className="mb-0 mt-3 text-sm text-app-muted">
              {status ? uptime(status.api.uptimeSeconds) : '—'} · {status?.api.nodeVersion ?? '—'}
            </p>
            <p className="mb-0 mt-1 text-xs text-app-muted">
              Memória RSS: {bytes(status?.api.memoryRssBytes ?? null)}
            </p>
            <p className="mb-0 mt-1 text-xs text-app-muted">
              Ambiente: {status?.api.environment ?? '—'} · Fuso: {status?.api.timezone ?? '—'}
            </p>
          </div>

          <div className={CARD_CLASS}>
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Worker
            </span>
            <div className="mt-3 flex items-center justify-between gap-3">
              <strong className="text-xl">
                {status?.worker.status === 'up'
                  ? 'Ativo'
                  : status?.worker.status === 'down'
                    ? 'Sem heartbeat'
                    : 'Aguardando'}
              </strong>
              <span
                className={
                  'rounded-full border px-2.5 py-1 text-xs font-bold ' +
                  statusClass(status?.worker.status ?? 'unknown')
                }
              >
                {(status?.worker.status ?? 'unknown').toUpperCase()}
              </span>
            </div>
            <p className="mb-0 mt-3 text-xs text-app-muted">
              Último heartbeat: {date(status?.worker.lastHeartbeatAt ?? null)}
            </p>
          </div>

          <div className={CARD_CLASS}>
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Storage de backup
            </span>
            <strong className="mt-3 block text-xl">
              {bytes(status?.storage.freeBytes ?? null)} livres
            </strong>
            <p className="mb-0 mt-2 text-xs text-app-muted">
              {storagePercent === null ? 'Capacidade indisponível' : storagePercent + '% utilizado'}
            </p>
            <p className="mb-0 mt-1 truncate text-xs text-app-muted" title={status?.storage.backupDirectory}>
              {status?.storage.backupDirectory ?? '—'}
            </p>
          </div>

          <div className={CARD_CLASS}>
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Ferramentas SQL
            </span>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <span>Backup</span>
                <strong>{status?.tools.dumpClient ?? 'Não encontrada'}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Restore</span>
                <strong>{status?.tools.restoreClient ?? 'Não encontrada'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
                Banco de dados
              </span>
              <h2 className="mb-0 mt-1 text-lg font-bold">Status e estrutura</h2>
            </div>
            <button className={BUTTON_CLASS} disabled={loading} onClick={() => void load()} type="button">
              Atualizar status
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(status?.databases ?? []).map((database) => (
              <div className="rounded-xl border border-app-border p-4" key={database.key}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="text-lg">{database.label}</strong>
                    <p className="mb-0 mt-1 text-xs text-app-muted">
                      {database.host}:{database.port} / {database.database}
                    </p>
                  </div>
                  <span className={'rounded-full border px-2.5 py-1 text-xs font-bold ' + statusClass(database.status)}>
                    {database.status.toUpperCase()}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold text-app-muted">Versão</dt>
                    <dd className="m-0 mt-1">{database.version ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-app-muted">Latência</dt>
                    <dd className="m-0 mt-1">{database.latencyMs === null ? '—' : database.latencyMs + ' ms'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-app-muted">Tamanho</dt>
                    <dd className="m-0 mt-1">{bytes(database.sizeBytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-app-muted">Tabelas</dt>
                    <dd className="m-0 mt-1">{database.tableCount.toLocaleString('pt-BR')}</dd>
                  </div>
                </dl>

                {database.missingRequiredTables.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-200">
                    Estruturas nativas ausentes: {database.missingRequiredTables.join(', ')}
                  </div>
                ) : null}
                {database.error ? (
                  <div className="mt-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-2.5 text-xs text-app-danger">
                    {database.error}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className={BUTTON_CLASS}
                    disabled={busy === 'tables-' + database.key}
                    onClick={() => void toggleDatabase(database.key)}
                    type="button"
                  >
                    {openDatabase === database.key ? 'Ocultar tabelas' : 'Ver tabelas'}
                  </button>
                  {database.key === 'nivel3' ? (
                    <button
                      className={BUTTON_CLASS}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void run(
                          'repair-' + database.key,
                          'Adequações concluídas para ' + database.label + '.',
                          () => repairMaintenanceDatabase(database.key),
                        )
                      }
                      type="button"
                    >
                      Executar adequações
                    </button>
                  ) : null}
                </div>

                {openDatabase === database.key ? (
                  <div className="mt-4">
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-lg bg-app-surface-muted px-3 py-2">
                        <span className="block text-app-muted">Protegidas</span>
                        <strong className="mt-1 block text-app-text">
                          {(tables[database.key] ?? []).filter((table) => table.reviewState === 'protected').length}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-app-surface-muted px-3 py-2">
                        <span className="block text-app-muted">Relacionadas</span>
                        <strong className="mt-1 block text-app-text">
                          {(tables[database.key] ?? []).filter((table) => table.reviewState === 'related').length}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-app-surface-muted px-3 py-2">
                        <span className="block text-app-muted">Revisar</span>
                        <strong className="mt-1 block text-app-text">
                          {(tables[database.key] ?? []).filter((table) => table.reviewState === 'review').length}
                        </strong>
                      </div>
                      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900/70 dark:bg-amber-950/20">
                        <span className="block text-amber-700 dark:text-amber-300">Vazias p/ revisão</span>
                        <strong className="mt-1 block text-amber-800 dark:text-amber-200">
                          {(tables[database.key] ?? []).filter((table) => table.reviewState === 'review-empty').length}
                        </strong>
                      </div>
                    </div>

                    <div className="max-h-[520px] overflow-auto rounded-lg border border-app-border">
                      <table className="w-full min-w-[1050px] border-collapse">
                        <thead>
                          <tr>
                            <th className={TABLE_HEAD}>Tabela</th>
                            <th className={TABLE_HEAD}>Auditoria</th>
                            <th className={TABLE_HEAD}>Linhas estimadas</th>
                            <th className={TABLE_HEAD}>Tamanho</th>
                            <th className={TABLE_HEAD}>Relações</th>
                            <th className={TABLE_HEAD}>Última alteração</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tables[database.key] ?? []).map((table) => {
                            const reviewLabel =
                              table.reviewState === 'protected'
                                ? 'Protegida'
                                : table.reviewState === 'related'
                                  ? 'Relacionada'
                                  : table.reviewState === 'review-empty'
                                    ? 'Revisar · vazia'
                                    : 'Revisar';
                            const reviewClass =
                              table.reviewState === 'protected'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-200'
                                : table.reviewState === 'related'
                                  ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/20 dark:text-blue-200'
                                  : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-200';

                            return (
                              <tr key={table.name} title={table.reviewReason}>
                                <td className={TABLE_CELL}>
                                  <strong>{table.name}</strong>
                                  <div className="mt-1 text-[10px] text-app-muted">
                                    {table.engine ?? '—'}
                                  </div>
                                </td>
                                <td className={TABLE_CELL}>
                                  <span className={'inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ' + reviewClass}>
                                    {reviewLabel}
                                  </span>
                                  <div className="mt-1 max-w-[300px] text-[10px] leading-4 text-app-muted">
                                    {table.reviewReason}
                                  </div>
                                </td>
                                <td className={TABLE_CELL}>{table.estimatedRows.toLocaleString('pt-BR')}</td>
                                <td className={TABLE_CELL}>{bytes(table.totalBytes)}</td>
                                <td className={TABLE_CELL}>
                                  <span className="whitespace-nowrap text-xs">
                                    {table.outgoingForeignKeys} saída · {table.incomingForeignKeys} entrada
                                  </span>
                                </td>
                                <td className={TABLE_CELL}>
                                  {date(table.updatedAt ?? table.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="mb-0 mt-3 text-xs text-app-muted">
                      “Revisar” não significa “pode excluir”. A limpeza será feita somente depois de validar as tabelas candidatas e gerar um backup completo do Nivel3.
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className={CARD_CLASS}>
          <div className="mb-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Backups
            </span>
            <h2 className="mb-0 mt-1 text-lg font-bold">Backup manual e arquivos</h2>
            <p className="mb-0 mt-1 text-sm text-app-muted">
              O dump nativo inclui tabelas, triggers, procedures e eventos.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              className={PRIMARY_BUTTON_CLASS}
              disabled={Boolean(busy) || !backupToolsReady}
              onClick={() =>
                void run(
                  'backup-nivel3',
                  'Backup de Nivel3 concluído.',
                  () => runMaintenanceBackup('nivel3'),
                )
              }
              type="button"
            >
              Backup Nivel3
            </button>
          </div>

          {!backupToolsReady ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-200">
              Configure MARIADB_DUMP_BIN ou instale mariadb-dump/mysqldump no PATH do servidor.
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-app-border">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className={TABLE_HEAD}>Arquivo</th>
                  <th className={TABLE_HEAD}>Banco</th>
                  <th className={TABLE_HEAD}>Tipo</th>
                  <th className={TABLE_HEAD}>Tamanho</th>
                  <th className={TABLE_HEAD}>Criado</th>
                  <th className={TABLE_HEAD}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(status?.backups ?? []).map((backup) => (
                  <tr key={backup.name}>
                    <td className={TABLE_CELL}><strong>{backup.name}</strong></td>
                    <td className={TABLE_CELL}>{backup.database}</td>
                    <td className={TABLE_CELL}>{backup.kind}</td>
                    <td className={TABLE_CELL}>{bytes(backup.sizeBytes)}</td>
                    <td className={TABLE_CELL}>{date(backup.createdAt)}</td>
                    <td className={TABLE_CELL}>
                      <div className="flex gap-2">
                        <button
                          className={BUTTON_CLASS}
                          disabled={Boolean(busy)}
                          onClick={() => void downloadMaintenanceBackup(backup.name)}
                          type="button"
                        >
                          Baixar
                        </button>
                        <button
                          className={DANGER_BUTTON_CLASS}
                          disabled={Boolean(busy)}
                          onClick={() => {
                            if (!window.confirm('Excluir ' + backup.name + '?')) return;
                            void run('delete-' + backup.name, 'Backup excluído.', () =>
                              deleteMaintenanceBackup(backup.name),
                            );
                          }}
                          type="button"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(status?.backups.length ?? 0) === 0 ? (
                  <tr>
                    <td className={TABLE_CELL} colSpan={6}>Nenhum backup armazenado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <div className="mb-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Automação
            </span>
            <h2 className="mb-0 mt-1 text-lg font-bold">Jobs de backup</h2>
          </div>

          <form className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={submitJob}>
            <label className={LABEL_CLASS}>
              <span>Banco</span>
              <input
                className={CONTROL_CLASS}
                disabled
                value="Nivel3"
              />
            </label>
            <label className={LABEL_CLASS}>
              <span>Frequência</span>
              <select
                className={CONTROL_CLASS}
                onChange={(event) => setJobDraft({ ...jobDraft, frequency: event.target.value as MaintenanceBackupFrequency })}
                value={jobDraft.frequency}
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
              </select>
            </label>
            <label className={LABEL_CLASS}>
              <span>Horário ({status?.api.timezone ?? 'servidor'})</span>
              <input
                className={CONTROL_CLASS}
                onChange={(event) => setJobDraft({ ...jobDraft, time: event.target.value })}
                required
                type="time"
                value={jobDraft.time}
              />
            </label>
            <label className={LABEL_CLASS}>
              <span>Dia da semana</span>
              <select
                className={CONTROL_CLASS}
                disabled={jobDraft.frequency !== 'weekly'}
                onChange={(event) => setJobDraft({ ...jobDraft, weekday: Number(event.target.value) })}
                value={jobDraft.weekday}
              >
                {WEEKDAYS.map((label, index) => <option key={label} value={index}>{label}</option>)}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              <span>Retenção automática</span>
              <input
                className={CONTROL_CLASS}
                max={3650}
                min={1}
                onChange={(event) => setJobDraft({ ...jobDraft, retentionDays: Number(event.target.value) })}
                required
                type="number"
                value={jobDraft.retentionDays}
              />
            </label>
            <div className="flex items-end">
              <button className={PRIMARY_BUTTON_CLASS + ' w-full'} disabled={Boolean(busy)} type="submit">
                Criar job
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-lg border border-app-border">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className={TABLE_HEAD}>ID</th>
                  <th className={TABLE_HEAD}>Banco</th>
                  <th className={TABLE_HEAD}>Agenda</th>
                  <th className={TABLE_HEAD}>Próxima</th>
                  <th className={TABLE_HEAD}>Última execução</th>
                  <th className={TABLE_HEAD}>Status</th>
                  <th className={TABLE_HEAD}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(status?.jobs ?? []).map((job) => (
                  <tr key={job.id}>
                    <td className={TABLE_CELL}>#{job.id}</td>
                    <td className={TABLE_CELL}>{backupTargetLabel(job.target)}</td>
                    <td className={TABLE_CELL}>
                      {job.frequency === 'daily'
                        ? 'Diário às ' + job.time
                        : WEEKDAYS[job.weekday ?? 0] + ' às ' + job.time}
                      <div className="mt-1 text-[11px] text-app-muted">
                        retenção {job.retentionDays} dias
                      </div>
                    </td>
                    <td className={TABLE_CELL}>{date(job.nextRunAt)}</td>
                    <td className={TABLE_CELL}>{date(job.lastRunAt)}</td>
                    <td className={TABLE_CELL}>
                      <span className={'rounded-full border px-2 py-1 text-xs font-bold ' + statusClass(job.enabled ? job.lastStatus : 'down')}>
                        {job.enabled ? job.lastStatus : 'pausado'}
                      </span>
                      {job.lastError ? <div className="mt-1 max-w-[320px] text-xs text-app-danger">{job.lastError}</div> : null}
                    </td>
                    <td className={TABLE_CELL}>
                      <div className="flex gap-2">
                        <button
                          className={BUTTON_CLASS}
                          disabled={Boolean(busy)}
                          onClick={() => toggleJob(job)}
                          type="button"
                        >
                          {job.enabled ? 'Pausar' : 'Ativar'}
                        </button>
                        <button
                          className={DANGER_BUTTON_CLASS}
                          disabled={Boolean(busy)}
                          onClick={() => removeJob(job)}
                          type="button"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(status?.jobs.length ?? 0) === 0 ? (
                  <tr><td className={TABLE_CELL} colSpan={7}>Nenhum job programado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <div className="mb-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Dump de produção
            </span>
            <h2 className="mb-0 mt-1 text-lg font-bold">Validar, importar e adequar banco</h2>
            <p className="mb-0 mt-1 text-sm text-app-muted">
              A importação só é liberada depois da validação e cria um backup de segurança antes de alterar o banco.
            </p>
          </div>

          <form className="grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]" onSubmit={validateDump}>
            <label className={LABEL_CLASS}>
              <span>Banco alvo</span>
              <input
                className={CONTROL_CLASS}
                disabled
                value="Nivel3"
              />
            </label>
            <label className={LABEL_CLASS}>
              <span>Arquivo .sql</span>
              <input
                accept=".sql,text/plain,application/sql"
                className={CONTROL_CLASS}
                disabled={Boolean(stagedDump)}
                onChange={chooseDump}
                required
                type="file"
              />
            </label>
            <div className="flex items-end">
              <button
                className={PRIMARY_BUTTON_CLASS}
                disabled={Boolean(busy) || !dumpFile || Boolean(stagedDump)}
                type="submit"
              >
                Validar dump
              </button>
            </div>
          </form>

          {stagedDump ? (
            <div className="mt-5 rounded-xl border border-app-border bg-app-surface-muted p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div><span className="text-xs font-bold text-app-muted">Arquivo</span><strong className="mt-1 block">{stagedDump.originalName}</strong></div>
                <div><span className="text-xs font-bold text-app-muted">Tamanho</span><strong className="mt-1 block">{bytes(stagedDump.sizeBytes)}</strong></div>
                <div><span className="text-xs font-bold text-app-muted">CREATE TABLE</span><strong className="mt-1 block">{stagedDump.summary.createTables}</strong></div>
                <div><span className="text-xs font-bold text-app-muted">INSERT</span><strong className="mt-1 block">{stagedDump.summary.inserts}</strong></div>
              </div>
              <div className="mt-3 break-all text-xs text-app-muted">
                SHA-256: {stagedDump.sha256}
              </div>
              {stagedDump.warnings.length > 0 ? (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-200">
                  {stagedDump.warnings.join(' ')}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className={LABEL_CLASS}>
                  <span>Confirmação — digite exatamente: {stagedDump.confirmation}</span>
                  <input
                    autoComplete="off"
                    className={CONTROL_CLASS}
                    onChange={(event) => setConfirmation(event.target.value)}
                    value={confirmation}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    className={DANGER_BUTTON_CLASS}
                    disabled={
                      Boolean(busy) ||
                      !restoreToolsReady ||
                      !backupToolsReady ||
                      confirmation !== stagedDump.confirmation
                    }
                    onClick={applyDump}
                    type="button"
                  >
                    Fazer backup e importar
                  </button>
                </div>
              </div>
              {!restoreToolsReady ? (
                <p className="mb-0 mt-3 text-xs text-app-danger">
                  Configure MARIADB_CLIENT_BIN ou instale mariadb/mysql no PATH antes de importar.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className={CARD_CLASS}>
          <div className="mb-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Auditoria
            </span>
            <h2 className="mb-0 mt-1 text-lg font-bold">Operações recentes</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-app-border">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className={TABLE_HEAD}>Quando</th>
                  <th className={TABLE_HEAD}>Ação</th>
                  <th className={TABLE_HEAD}>Alvo</th>
                  <th className={TABLE_HEAD}>Status</th>
                  <th className={TABLE_HEAD}>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {(status?.operations ?? []).map((operation) => (
                  <tr key={operation.id}>
                    <td className={TABLE_CELL}>{date(operation.createdAt)}</td>
                    <td className={TABLE_CELL}>{operation.action}</td>
                    <td className={TABLE_CELL}>{operation.target ?? '—'}</td>
                    <td className={TABLE_CELL}>{operation.status}</td>
                    <td className={TABLE_CELL}>{operation.detail ?? '—'}</td>
                  </tr>
                ))}
                {(status?.operations.length ?? 0) === 0 ? (
                  <tr><td className={TABLE_CELL} colSpan={5}>Nenhuma operação registrada.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
