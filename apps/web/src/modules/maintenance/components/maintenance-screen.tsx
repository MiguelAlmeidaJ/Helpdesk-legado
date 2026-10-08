"use client";

import type {
  CurrentUserResponse,
  MaintenanceBackupFrequency,
  MaintenanceBackupJob,
  MaintenanceBackupJobInput,
  MaintenanceBackupTarget,
  MaintenanceCatalogImageMigrationStatus,
  MaintenanceDatabaseKey,
  MaintenanceDatabaseTable,
  MaintenanceDumpStageResponse,
  MaintenanceSystemStatusResponse,
} from '@helpdesk/contracts';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  applyMaintenanceDump,
  createMaintenanceBackupJob,
  deleteMaintenanceBackup,
  deleteMaintenanceBackupJob,
  downloadMaintenanceBackup,
  fetchCatalogImageMigrationStatus,
  fetchMaintenanceStatus,
  fetchMaintenanceTables,
  migrateCatalogImages,
  optimizeMaintenanceTables,
  dropMaintenanceTables,
  repairMaintenanceDatabase,
  runMaintenanceBackup,
  stageMaintenanceDump,
  updateMaintenanceBackupJob,
  runMaintenanceSql,
  previewMaintenanceSqlUpdate,
  applyMaintenanceSqlUpdate,
  type MaintenanceSqlUpdatePreview,
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
const TAB_CLASS =
  'min-h-10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent px-4 text-xs font-extrabold text-app-muted transition hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-brand';
const ACTIVE_TAB_CLASS =
  'bg-app-brand! text-white! shadow-sm hover:bg-app-brand-hover! hover:text-white! dark:text-slate-950! dark:hover:text-slate-950!';

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

type MaintenanceSection =
  | 'database'
  | 'sql'
  | 'backups'
  | 'automation'
  | 'migration'
  | 'audit';

const MAINTENANCE_SECTIONS: ReadonlyArray<{
  id: MaintenanceSection;
  label: string;
}> = [
  { id: 'database', label: 'Banco de dados' },
  { id: 'sql', label: 'Terminal SQL' },
  { id: 'backups', label: 'Backups' },
  { id: 'automation', label: 'Automação' },
  { id: 'migration', label: 'Migração e restore' },
  { id: 'audit', label: 'Auditoria' },
];

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

function toolName(value: string | null | undefined): string {
  if (!value) return 'Não encontrada';
  return value.split(/[\\/]/).pop() || value;
}

export function MaintenanceScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [sqlText, setSqlText] = useState('SHOW TABLES');
  const [sqlResult, setSqlResult] = useState<{columns: string[]; rows: Record<string, unknown>[]; truncated: boolean} | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlBusy, setSqlBusy] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<MaintenanceSqlUpdatePreview | null>(null);
  const [sqlConfirmation, setSqlConfirmation] = useState('');
  const [sqlSuccess, setSqlSuccess] = useState<string | null>(null);
  const [sqlDuration, setSqlDuration] = useState<number | null>(null);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [sqlFilter, setSqlFilter] = useState('');
  const [sqlPage, setSqlPage] = useState(0);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [status, setStatus] = useState<MaintenanceSystemStatusResponse | null>(null);
  const [catalogMigration, setCatalogMigration] =
    useState<MaintenanceCatalogImageMigrationStatus | null>(null);
  const [tables, setTables] = useState<Record<string, MaintenanceDatabaseTable[]>>({});
  const [selectedTables, setSelectedTables] = useState<Record<string, string[]>>({});
  const [openDatabase, setOpenDatabase] = useState<MaintenanceDatabaseKey | null>(null);
  const [jobDraft, setJobDraft] = useState<JobDraft>(INITIAL_JOB);
  const dumpTarget: MaintenanceDatabaseKey = 'nivel3';
  const [dumpFile, setDumpFile] = useState<File | null>(null);
  const [dumpProgress, setDumpProgress] = useState<number | null>(null);
  const [dumpPhase, setDumpPhase] = useState<'sending' | 'validating' | null>(null);
  const dumpUploadController = useRef<AbortController | null>(null);
  const [stagedDump, setStagedDump] = useState<MaintenanceDumpStageResponse | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [activeSection, setActiveSection] =
    useState<MaintenanceSection>('backups');

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const [nextStatus, nextCatalogMigration] = await Promise.all([
        fetchMaintenanceStatus(signal),
        fetchCatalogImageMigrationStatus(signal),
      ]);
      setStatus(nextStatus);
      setCatalogMigration(nextCatalogMigration);
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
    const refreshTimer = window.setInterval(() => {
      void load(controller.signal);
    }, 30_000);

    return () => {
      window.clearInterval(refreshTimer);
      controller.abort();
    };
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

  function selectSectionFromKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % MAINTENANCE_SECTIONS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (currentIndex - 1 + MAINTENANCE_SECTIONS.length) %
        MAINTENANCE_SECTIONS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = MAINTENANCE_SECTIONS.length - 1;
    }
    if (nextIndex === null) return;

    const nextSection = MAINTENANCE_SECTIONS[nextIndex];
    if (!nextSection) return;

    event.preventDefault();
    setActiveSection(nextSection.id);
    document.getElementById(`maintenance-tab-${nextSection.id}`)?.focus();
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

  function toggleTableSelection(database: MaintenanceDatabaseKey, table: string) {
    setSelectedTables((current) => {
      const selected = new Set(current[database] ?? []);
      if (selected.has(table)) selected.delete(table);
      else selected.add(table);
      return { ...current, [database]: [...selected] };
    });
  }

  function selectEmptyCandidates(database: MaintenanceDatabaseKey) {
    const candidates = (tables[database] ?? [])
      .filter((table) => table.reviewState === 'review-empty')
      .map((table) => table.name);
    setSelectedTables((current) => ({ ...current, [database]: candidates }));
  }

  async function optimizeSelected(database: MaintenanceDatabaseKey) {
    const selected = selectedTables[database] ?? [];
    if (!selected.length) return;

    await run(
      'tables-optimize-' + database,
      'Tabelas otimizadas.',
      async () => {
        const result = await optimizeMaintenanceTables(database, selected);
        setFeedback({
          error: false,
          text:
            `Otimização concluída em ${result.tables.length} tabela(s). ` +
            `Espaço potencial revisado: ${bytes(result.reclaimedEstimateBytes)}.`,
        });
        setTables((current) => {
          const next = { ...current };
          delete next[database];
          return next;
        });
        setSelectedTables((current) => ({ ...current, [database]: [] }));
        if (openDatabase === database) {
          const refreshed = await fetchMaintenanceTables(database);
          setTables((current) => ({ ...current, [database]: refreshed }));
        }
      },
    );
  }

  async function dropSelected(database: MaintenanceDatabaseKey) {
    const selected = selectedTables[database] ?? [];
    if (!selected.length) return;

    const tableMap = new Map(
      (tables[database] ?? []).map((table) => [table.name, table]),
    );
    const blocked = selected.filter((name) => {
      const table = tableMap.get(name);
      return !table || table.reviewState === 'protected';
    });

    if (blocked.length) {
      setFeedback({
        error: true,
        text:
          'Existem tabelas protegidas na seleção: ' +
          blocked.join(', ') +
          '.',
      });
      return;
    }

    const confirmation =
      `EXCLUIR ${selected.length} TABELA${selected.length === 1 ? '' : 'S'}`;
    const typed = window.prompt(
      'Esta operação cria um backup completo antes do DROP TABLE.\n\n' +
        'Tabelas: ' +
        selected.join(', ') +
        '\n\nDigite exatamente: ' +
        confirmation,
    );
    if (typed !== confirmation) return;

    await run(
      'tables-drop-' + database,
      'Tabelas removidas com backup de segurança.',
      async () => {
        const result = await dropMaintenanceTables(
          database,
          selected,
          confirmation,
        );
        setFeedback({
          error: false,
          text:
            `Removidas ${result.droppedTables.length} tabela(s). ` +
            `Backup de segurança: ${result.safetyBackup.name}.`,
        });
        setSelectedTables((current) => ({ ...current, [database]: [] }));
        const refreshed = await fetchMaintenanceTables(database);
        setTables((current) => ({ ...current, [database]: refreshed }));
        await load();
      },
    );
  }

  function chooseDump(event: ChangeEvent<HTMLInputElement>) {
    setDumpFile(event.target.files?.[0] ?? null);
    setDumpProgress(null);
    setStagedDump(null);
    setConfirmation('');
  }

  function validateDump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dumpFile || busy) return;
    if (!dumpFile.name.toLowerCase().endsWith('.sql')) {
      setFeedback({ text: 'Selecione um arquivo .sql.', error: true });
      return;
    }
    const maxMb = 1024;
    if (dumpFile.size > maxMb * 1024 * 1024) {
      setFeedback({ text: 'O arquivo excede o limite padrão de 1 GB. Solicite ajuste ao administrador antes de enviar.', error: true });
      return;
    }
    const controller = new AbortController();
    dumpUploadController.current = controller;
    setDumpProgress(0);
    setDumpPhase('sending');
    setBusy('dump-stage');
    setFeedback(null);
    stageMaintenanceDump(dumpTarget, dumpFile, {
      signal: controller.signal,
      onProgress: (value) => {
        setDumpProgress(value);
        if (value >= 99) setDumpPhase('validating');
      },
    }).then((result) => {
      setStagedDump(result);
      setConfirmation('');
      setFeedback({ text: 'Dump validado. Revise o resumo antes de importar.', error: false });
    }).catch((reason) => setFeedback({ text: errorMessage(reason), error: true }))
      .finally(() => {
        dumpUploadController.current = null;
        setDumpPhase(null);
        setBusy(null);
      });
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

  async function runCatalogImageMigration() {
    const count = catalogMigration?.embeddedImages ?? 0;
    if (!count) return;

    if (
      !window.confirm(
        `Migrar ${count} imagem(ns) Base64 dos catálogos para o storage? Os catálogos serão atualizados somente após cada imagem ser gravada com sucesso.`,
      )
    ) {
      return;
    }

    setBusy('catalog-images-migration');
    setFeedback(null);
    try {
      const result = await migrateCatalogImages();
      await load();
      setFeedback({
        error: result.errors.length > 0,
        text:
          `Migração concluída: ${result.migratedCatalogs} catálogo(s), ` +
          `${result.migratedImages} imagem(ns) gravada(s), ` +
          `${result.reusedImages} reutilizada(s), ` +
          `${result.skippedImages} ignorada(s).`,
      });
    } catch (reason) {
      setFeedback({ text: errorMessage(reason), error: true });
    } finally {
      setBusy(null);
    }
  }

  const backupToolsReady = Boolean(status?.tools.dumpClient);
  const restoreToolsReady = Boolean(status?.tools.restoreClient);
  const storagePercent = useMemo(() => {
    if (!status?.storage.totalBytes || status.storage.freeBytes === null) return null;
    return Math.round(
      ((status.storage.totalBytes - status.storage.freeBytes) / status.storage.totalBytes) * 100,
    );
  }, [status]);
  const systemIssues = useMemo(() => {
    if (!status) return [];

    const issues: string[] = [];
    if (status.worker.status !== 'up') issues.push('Worker sem heartbeat recente');
    if (!status.tools.dumpClient) issues.push('Ferramenta de backup indisponível');
    if (!status.tools.restoreClient) issues.push('Ferramenta de restore indisponível');
    for (const database of status.databases) {
      if (database.status !== 'up') {
        issues.push(`${database.label} está ${database.status}`);
      }
    }
    return issues;
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

        <section
          className={
            'flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-sm ' +
            (systemIssues.length === 0
              ? 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/20')
          }
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className={
                'mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ' +
                (systemIssues.length === 0
                  ? 'bg-emerald-500 ring-emerald-500/15'
                  : 'bg-amber-500 ring-amber-500/15')
              }
            />
            <div>
              <strong className="text-sm text-app-text">
                {systemIssues.length === 0
                  ? 'Ambiente operacional'
                  : `${systemIssues.length} ponto(s) precisam de atenção`}
              </strong>
              <p className="mb-0 mt-1 text-xs leading-5 text-app-muted">
                {systemIssues.length === 0
                  ? 'API, worker, banco e ferramentas de backup estão disponíveis.'
                  : systemIssues.join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-app-subtle">
              Atualização automática a cada 30s
            </span>
            <button
              className={BUTTON_CLASS}
              disabled={loading}
              onClick={() => void load()}
              type="button"
            >
              {loading ? 'Atualizando…' : 'Atualizar agora'}
            </button>
          </div>
        </section>

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
                <strong title={status?.tools.dumpClient ?? undefined}>
                  {toolName(status?.tools.dumpClient)}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Restore</span>
                <strong title={status?.tools.restoreClient ?? undefined}>
                  {toolName(status?.tools.restoreClient)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <div
          aria-label="Áreas de manutenção"
          className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-app-border bg-app-surface p-1 shadow-sm"
          role="tablist"
        >
          {MAINTENANCE_SECTIONS.map((section, index) => {
            const selected = activeSection === section.id;
            return (
              <button
                aria-controls={`maintenance-panel-${section.id}`}
                aria-selected={selected}
                className={`${TAB_CLASS} ${selected ? ACTIVE_TAB_CLASS : ''}`}
                id={`maintenance-tab-${section.id}`}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                onKeyDown={(event) => selectSectionFromKeyboard(event, index)}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                {section.label}
              </button>
            );
          })}
        </div>

        <div aria-labelledby="maintenance-tab-sql" className={activeSection === 'sql' ? 'grid gap-5' : 'hidden'} hidden={activeSection !== 'sql'} id="maintenance-panel-sql" role="tabpanel">
        <section className={CARD_CLASS + ' overflow-hidden'}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">Ferramentas de manutenção</span>
              <h2 className="mt-1 text-xl font-bold">Terminal MySQL</h2>
              <p className="mt-1 text-sm text-app-muted">Execute consultas no banco nivel3 sem sair do Helpdesk.</p>
            </div>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">SELECT · SHOW · UPDATE controlado</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { label: 'Usuários', sql: 'SELECT user_id, user_nome, user_mail, user_login FROM usuarios LIMIT 20' },
              { label: 'Quantidade de usuários', sql: 'SELECT COUNT(*) AS total FROM usuarios' },
              { label: 'Data do banco', sql: 'SELECT NOW() AS data_servidor' },
              { label: 'Tabelas', sql: 'SHOW TABLES' },
              { label: 'Estrutura de usuários', sql: 'SHOW COLUMNS FROM usuarios' },
            ].map((example) => (
              <button key={example.label} type="button" className={BUTTON_CLASS + ' min-h-8 px-3 text-xs'} onClick={() => setSqlText(example.sql)}>{example.label}</button>
            ))}
            <button type="button" className={BUTTON_CLASS + ' min-h-8 px-3 text-xs'} onClick={() => {setSqlText('');setSqlResult(null);setSqlError(null);setSqlPreview(null);setSqlSuccess(null);}}>Limpar editor</button>
          </div>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setSqlBusy(true);
            setSqlPreview(null);
            setSqlSuccess(null);
            setSqlError(null);
            setSqlResult(null);
            setSqlDuration(null);
            setSqlPage(0);
            setSqlFilter('');
            const began = performance.now();
            try {
              if (/^UPDATE\s/i.test(sqlText.trim())) {
                const preview = await previewMaintenanceSqlUpdate(sqlText);
                setSqlPreview(preview);
                setSqlConfirmation('');
                setSqlDuration(Math.round(performance.now() - began));
                return;
              }
              const result = await runMaintenanceSql(sqlText);
              setSqlResult(result);
              setSqlDuration(Math.round(performance.now() - began));
              setSqlHistory((previous) => [sqlText, ...previous.filter((item) => item !== sqlText)].slice(0, 8));
            } catch (error) { setSqlError(errorMessage(error)); }
            finally { setSqlBusy(false); }
          }} className="grid gap-3">
            <label className={LABEL_CLASS} htmlFor="maintenance-sql-editor">Editor SQL</label>
            <div className="overflow-hidden rounded-xl border border-app-border-strong bg-app-surface-muted focus-within:border-app-brand">
              <div className="flex items-center justify-between border-b border-app-border px-3 py-2 text-[11px] text-app-muted"><span className="font-mono">nivel3 / query.sql</span><span>Máximo 12.000 caracteres</span></div>
              <textarea id="maintenance-sql-editor" spellCheck={false} className="block min-h-40 w-full resize-y border-0 bg-transparent p-4 font-mono text-[13px] leading-6 text-app-text outline-none" value={sqlText} onChange={(event) => setSqlText(event.target.value)} onKeyDown={(event) => {if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {event.preventDefault();event.currentTarget.form?.requestSubmit();}}} maxLength={12000} placeholder="SELECT coluna FROM tabela LIMIT 20" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className={PRIMARY_BUTTON_CLASS} disabled={sqlBusy || !sqlText.trim()} type="submit">{sqlBusy ? 'Executando consulta...' : '▶ Executar consulta'}</button>
              <span className="text-xs text-app-muted">Ctrl + Enter · SELECT/SHOW para leitura · UPDATE exige prévia e confirmação</span>
            </div>
          </form>
          {sqlHistory.length > 0 ? (
            <details className="mt-4 rounded-lg border border-app-border p-3">
              <summary className="cursor-pointer text-xs font-bold text-app-text">Histórico desta sessão ({sqlHistory.length})</summary>
              <div className="mt-2 grid gap-1">
                {sqlHistory.map((item, index) => <button className="truncate rounded-md px-2 py-2 text-left font-mono text-xs hover:bg-app-surface-hover" type="button" key={index} onClick={() => setSqlText(item)} title={item}>{item}</button>)}
              </div>
            </details>
          ) : null}
          {sqlPreview ? (
            <div className="mt-5 grid gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/20">
              <div>
                <h3 className="text-base font-bold">Revisar atualização antes de executar</h3>
                <p className="text-xs text-app-muted">Prévia válida por 2 minutos. Um único registro identificado pela chave primária.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div><span className="block text-xs text-app-muted">Tabela</span><strong>{sqlPreview.table}</strong></div>
                <div><span className="block text-xs text-app-muted">Registro</span><strong>{sqlPreview.key} = {sqlPreview.id}</strong></div>
                <div><span className="block text-xs text-app-muted">Coluna</span><strong>{sqlPreview.column}</strong></div>
                <div><span className="block text-xs text-app-muted">Registros afetados</span><strong>{sqlPreview.rowsAffected}</strong></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-app-border bg-app-surface p-3"><span className="text-xs text-app-muted">Valor atual</span><p className="mt-1 break-all font-mono">{String(sqlPreview.before ?? 'NULL')}</p></div>
                <div className="rounded-lg border border-app-border bg-app-surface p-3"><span className="text-xs text-app-muted">Novo valor</span><p className="mt-1 break-all font-mono">{String(sqlPreview.after ?? 'NULL')}</p></div>
              </div>
              <label className={LABEL_CLASS} htmlFor="maintenance-update-confirm">Para autorizar, digite ATUALIZAR 1 REGISTRO</label>
              <input id="maintenance-update-confirm" className={CONTROL_CLASS} value={sqlConfirmation} onChange={(event) => setSqlConfirmation(event.target.value)} autoComplete="off" placeholder="ATUALIZAR 1 REGISTRO" />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={DANGER_BUTTON_CLASS} disabled={sqlBusy || sqlConfirmation !== 'ATUALIZAR 1 REGISTRO'} onClick={async () => {
                  if (!sqlPreview) return;
                  setSqlBusy(true);
                  setSqlError(null);
                  try {
                    const outcome = await applyMaintenanceSqlUpdate(sqlPreview.token, sqlConfirmation);
                    setSqlSuccess(`Atualização concluída: ${outcome.affectedRows} registro(s) em ${outcome.table}.`);
                    setSqlPreview(null);
                    setSqlConfirmation('');
                  } catch (error) {setSqlError(errorMessage(error));setSqlPreview(null);}
                  finally {setSqlBusy(false);}
                }}>Confirmar UPDATE</button>
                <button type="button" className={BUTTON_CLASS} onClick={() => {setSqlPreview(null);setSqlConfirmation('');}}>Cancelar</button>
              </div>
            </div>
          ) : null}
          {sqlSuccess ? <p role="status" className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{sqlSuccess}</p> : null}
          {sqlError ? <p role="alert" className="mt-4 rounded-lg border border-app-danger-border bg-app-danger-soft p-3 text-sm text-app-danger">{sqlError}</p> : null}
          {sqlResult ? (() => {
            const filtered = sqlResult.rows.filter((row) => !sqlFilter || sqlResult.columns.some((column) => String(row[column] ?? '').toLowerCase().includes(sqlFilter.toLowerCase())));
            const totalPages = Math.max(1, Math.ceil(filtered.length / 25));
            const currentPage = Math.min(sqlPage, totalPages - 1);
            const visible = filtered.slice(currentPage * 25, (currentPage + 1) * 25);
            const csv = [sqlResult.columns, ...filtered.map((row) => sqlResult.columns.map((column) => row[column] === null ? '' : String(row[column] ?? '')))].map((cells) => cells.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(';')).join('\\r\\n');
            return (
              <div className="mt-6 grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold">Resultados</h3>
                    <p role="status" className="text-xs text-app-muted">{sqlResult.rows.length} linha(s) recebidas · {sqlDuration ?? 0} ms{sqlResult.truncated ? ' · limitado a 200 linhas' : ''}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={BUTTON_CLASS + ' min-h-9 text-xs'} onClick={() => {void navigator.clipboard.writeText(csv);setSqlCopied(true);}}> {sqlCopied ? 'Copiado' : 'Copiar CSV'} </button>
                    <button type="button" className={BUTTON_CLASS + ' min-h-9 text-xs'} onClick={() => {const blob = new Blob(['\\uFEFF' + csv], {type: 'text/csv;charset=utf-8'});const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href=url;a.download='helpdesk-consulta.csv';a.click();URL.revokeObjectURL(url);}}>Exportar CSV</button>
                  </div>
                </div>
                <input aria-label="Filtrar resultados" className={CONTROL_CLASS} placeholder="Filtrar linhas retornadas..." value={sqlFilter} onChange={(event) => {setSqlFilter(event.target.value);setSqlPage(0);}} />
                <div className="max-h-[520px] overflow-auto rounded-xl border border-app-border">
                  <table className="w-full min-w-max border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10"><tr><th className={TABLE_HEAD}>#</th>{sqlResult.columns.map((column) => <th className={TABLE_HEAD} key={column}>{column}</th>)}</tr></thead>
                    <tbody>{visible.map((row, index) => <tr className="even:bg-app-surface-muted hover:bg-app-surface-hover" key={index}><td className={TABLE_CELL + ' text-app-muted'}>{currentPage * 25 + index + 1}</td>{sqlResult.columns.map((column) => <td className={TABLE_CELL + ' max-w-72 truncate font-mono'} title={String(row[column] ?? '')} key={column}>{row[column] === null ? <span className="italic text-app-muted">NULL</span> : String(row[column] ?? '')}</td>)}</tr>)}</tbody>
                  </table>
                  {visible.length === 0 ? <p className="p-5 text-center text-sm text-app-muted">Nenhum registro encontrado.</p> : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-app-muted">
                  <span>Exibindo {visible.length} de {filtered.length} linha(s) · página {currentPage + 1} de {totalPages}</span>
                  <div className="flex gap-2"><button type="button" className={BUTTON_CLASS + ' min-h-8 px-3'} disabled={currentPage === 0} onClick={() => setSqlPage(currentPage - 1)}>Anterior</button><button type="button" className={BUTTON_CLASS + ' min-h-8 px-3'} disabled={currentPage >= totalPages - 1} onClick={() => setSqlPage(currentPage + 1)}>Próxima</button></div>
                </div>
              </div>
            );
          })() : null}
        </section>
        </div>

        <div
          aria-labelledby="maintenance-tab-database"
          className={activeSection === 'database' ? 'grid gap-5' : 'hidden'}
          hidden={activeSection !== 'database'}
          id="maintenance-panel-database"
          role="tabpanel"
        >

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

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={BUTTON_CLASS}
                          disabled={Boolean(busy)}
                          onClick={() => selectEmptyCandidates(database.key)}
                          type="button"
                        >
                          Selecionar candidatas vazias
                        </button>
                        <button
                          className={BUTTON_CLASS}
                          disabled={
                            Boolean(busy) ||
                            !(selectedTables[database.key]?.length)
                          }
                          onClick={() => void optimizeSelected(database.key)}
                          type="button"
                        >
                          Otimizar selecionadas
                        </button>
                        <button
                          className={DANGER_BUTTON_CLASS}
                          disabled={
                            Boolean(busy) ||
                            !(selectedTables[database.key]?.length)
                          }
                          onClick={() => void dropSelected(database.key)}
                          type="button"
                        >
                          Excluir selecionadas
                        </button>
                      </div>
                      <span className="text-xs text-app-muted">
                        {(selectedTables[database.key]?.length ?? 0)} selecionada(s)
                      </span>
                    </div>

                    <div className="max-h-[520px] overflow-auto rounded-lg border border-app-border">
                      <table className="w-full min-w-[1180px] border-collapse">
                        <thead>
                          <tr>
                            <th className={TABLE_HEAD}>Sel.</th>
                            <th className={TABLE_HEAD}>Tabela</th>
                            <th className={TABLE_HEAD}>Auditoria</th>
                            <th className={TABLE_HEAD}>Linhas estimadas</th>
                            <th className={TABLE_HEAD}>Tamanho</th>
                            <th className={TABLE_HEAD}>Livre/fragmentado</th>
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
                                  <input
                                    aria-label={'Selecionar ' + table.name}
                                    checked={(selectedTables[database.key] ?? []).includes(table.name)}
                                    className="size-4 accent-[var(--app-brand)]"
                                    onChange={() => toggleTableSelection(database.key, table.name)}
                                    type="checkbox"
                                  />
                                </td>
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
                                <td className={TABLE_CELL}>{bytes(table.dataFreeBytes)}</td>
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
                      Tabelas protegidas nunca podem ser excluídas por esta tela. Tabelas relacionadas só são removidas quando todas as dependências necessárias estão na seleção; a API calcula a ordem segura dos DROP TABLE. Antes da exclusão, o sistema cria automaticamente um backup completo do Nivel3 e exige confirmação textual.
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
        </div>

        <div
          aria-labelledby="maintenance-tab-migration"
          className={activeSection === 'migration' ? 'grid gap-5' : 'hidden'}
          hidden={activeSection !== 'migration'}
          id="maintenance-panel-migration"
          role="tabpanel"
        >
        <section className={CARD_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
                Migração de catálogo
              </span>
              <h2 className="mb-0 mt-1 text-lg font-bold">
                Imagens Base64 → storage
              </h2>
              <p className="mb-0 mt-1 text-sm text-app-muted">
                Move imagens incorporadas no HTML dos catálogos para
                <code className="mx-1 rounded bg-app-surface-muted px-1.5 py-0.5 text-xs">
                  storage/uploads/catalog
                </code>
                e substitui o Base64 por uma URL segura do sistema. A operação é
                idempotente e pode ser executada novamente após importar o banco de produção.
              </p>
            </div>

            <button
              className={PRIMARY_BUTTON_CLASS}
              disabled={Boolean(busy) || !catalogMigration?.embeddedImages}
              onClick={() => void runCatalogImageMigration()}
              type="button"
            >
              {busy === 'catalog-images-migration'
                ? 'Migrando…'
                : 'Migrar imagens agora'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-app-surface-muted p-3">
              <span className="text-xs font-bold text-app-muted">Catálogos pendentes</span>
              <strong className="mt-1 block text-xl">
                {(catalogMigration?.candidateCatalogs ?? 0).toLocaleString('pt-BR')}
              </strong>
            </div>
            <div className="rounded-xl bg-app-surface-muted p-3">
              <span className="text-xs font-bold text-app-muted">Imagens Base64</span>
              <strong className="mt-1 block text-xl">
                {(catalogMigration?.embeddedImages ?? 0).toLocaleString('pt-BR')}
              </strong>
            </div>
            <div className="rounded-xl bg-app-surface-muted p-3">
              <span className="text-xs font-bold text-app-muted">Volume estimado</span>
              <strong className="mt-1 block text-xl">
                {bytes(catalogMigration?.embeddedBytesEstimate ?? 0)}
              </strong>
            </div>
            <div className="rounded-xl bg-app-surface-muted p-3">
              <span className="text-xs font-bold text-app-muted">Imagens no storage</span>
              <strong className="mt-1 block text-xl">
                {(catalogMigration?.storedImages ?? 0).toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>

          <p className="mb-0 mt-4 text-xs text-app-muted">
            Imagens inválidas ou acima do limite permanecem em Base64 e são contabilizadas como ignoradas; o conteúdo original não é removido nesses casos.
          </p>
        </section>
        </div>

        <div
          aria-labelledby="maintenance-tab-backups"
          className={activeSection === 'backups' ? 'grid gap-5' : 'hidden'}
          hidden={activeSection !== 'backups'}
          id="maintenance-panel-backups"
          role="tabpanel"
        >
        <section className={CARD_CLASS}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
                Backups
              </span>
              <h2 className="mb-0 mt-1 text-lg font-bold">Backup manual e arquivos</h2>
              <p className="mb-0 mt-1 text-sm text-app-muted">
                O dump nativo inclui tabelas, triggers, procedures e eventos.
              </p>
            </div>
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
              {busy === 'backup-nivel3' ? 'Criando backup…' : 'Criar backup agora'}
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-app-surface-muted p-3">
              <span className="text-[11px] font-bold uppercase text-app-muted">Ferramenta</span>
              <strong className="mt-1 block text-sm">
                {backupToolsReady ? toolName(status?.tools.dumpClient) : 'Indisponível'}
              </strong>
            </div>
            <div className="rounded-xl bg-app-surface-muted p-3">
              <span className="text-[11px] font-bold uppercase text-app-muted">Arquivos</span>
              <strong className="mt-1 block text-sm">
                {(status?.backups.length ?? 0).toLocaleString('pt-BR')} armazenado(s)
              </strong>
            </div>
            <div className="rounded-xl bg-app-surface-muted p-3">
              <span className="text-[11px] font-bold uppercase text-app-muted">Espaço livre</span>
              <strong className="mt-1 block text-sm">
                {bytes(status?.storage.freeBytes ?? null)}
              </strong>
            </div>
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
        </div>

        <div
          aria-labelledby="maintenance-tab-automation"
          className={activeSection === 'automation' ? 'grid gap-5' : 'hidden'}
          hidden={activeSection !== 'automation'}
          id="maintenance-panel-automation"
          role="tabpanel"
        >
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
        </div>

        <div
          aria-label="Importação de dump"
          className={activeSection === 'migration' ? 'grid gap-5' : 'hidden'}
          hidden={activeSection !== 'migration'}
        >
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

          {dumpPhase ? (
            <div className="mt-4 rounded-xl border border-app-border bg-app-surface-muted p-4" role="status">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <strong>{dumpPhase === 'sending' ? 'Enviando dump…' : 'Upload concluído · validando arquivo no servidor…'}</strong>
                <span>{dumpProgress ?? 0}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-app-border">
                <div className="h-full rounded-full bg-app-brand transition-all" style={{ width: (dumpProgress ?? 0) + '%' }} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-app-muted">A validação não altera o banco. Não feche esta tela durante o envio.</span>
                <button className={DANGER_BUTTON_CLASS} type="button" onClick={() => dumpUploadController.current?.abort()}>Cancelar envio</button>
              </div>
            </div>
          ) : null}
          {dumpFile && !dumpPhase && !stagedDump ? (
            <p className="mt-2 text-xs text-app-muted">Arquivo selecionado: {dumpFile.name} · {bytes(dumpFile.size)}</p>
          ) : null}
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
        </div>

        <div
          aria-labelledby="maintenance-tab-audit"
          className={activeSection === 'audit' ? 'grid gap-5' : 'hidden'}
          hidden={activeSection !== 'audit'}
          id="maintenance-panel-audit"
          role="tabpanel"
        >
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
      </div>
    </main>
  );
}
