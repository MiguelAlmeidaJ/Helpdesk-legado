"use client";

import type {
  CurrentUserResponse,
  MarketingAvailabilityResponse,
  MarketingTicketListItem,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { fetchMarketingAvailability } from '../api/modular-ticket-read-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function duration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) {
      return 'Seu usuário não possui acesso à disponibilidade do Marketing.';
    }
    if (reason.status === 401) {
      return 'Sua sessão expirou. Entre novamente para continuar.';
    }
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar a disponibilidade do Marketing.';
}

function TaskLink({ task }: { task: MarketingTicketListItem }) {
  return (
    <Link
      className="grid gap-1 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-app-text no-underline transition hover:bg-app-surface-hover"
      href={`/atendimentos/marketing/${task.id}`}
    >
      <span className="flex items-center justify-between gap-3">
        <strong className="truncate text-xs">
          #{task.id} · {task.name || 'Sem nome'}
        </strong>
        <small className="shrink-0 text-[10px] font-bold text-app-muted">
          {task.statusLabel}
        </small>
      </span>
      <span className="truncate text-[11px] text-app-muted">
        {task.client.name || 'Cliente não informado'}
        {task.technician.name ? ` · ${task.technician.name}` : ''}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-app-subtle">
        <span>Abertura: {formatDate(task.openedAt)}</span>
        {task.waitSeconds > 0 ? (
          <span>Espera acumulada: {duration(task.waitSeconds)}</span>
        ) : null}
      </span>
    </Link>
  );
}

function Queue({
  title,
  subtitle,
  tasks,
}: {
  title: string;
  subtitle: string;
  tasks: MarketingTicketListItem[];
}) {
  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-app-border-soft pb-3">
        <div>
          <h2 className="m-0 text-sm font-extrabold text-app-text">{title}</h2>
          <p className="m-0 mt-1 text-xs text-app-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-black text-app-text-soft">
          {tasks.length}
        </span>
      </div>
      <div className="grid gap-2">
        {tasks.map((task) => (
          <TaskLink key={task.id} task={task} />
        ))}
        {!tasks.length ? (
          <p className="m-0 rounded-lg bg-app-surface-muted px-3 py-4 text-center text-xs text-app-muted">
            Nenhuma tarefa nesta fila.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function MarketingAvailabilityScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] = useState<MarketingAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchMarketingAvailability(signal));
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);

  const lastUpdate = useMemo(
    () => (data ? formatDate(data.generatedAt) : 'Carregando…'),
    [data],
  );

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <div className="flex items-center gap-2">
            <Link className={BUTTON} href="/atendimentos/marketing">
              Lista de tarefas
            </Link>
            <button className={BUTTON} disabled={loading} onClick={() => void load()} type="button">
              Atualizar
            </button>
          </div>
        }
        meta={
          <span className="text-xs text-app-muted max-lg:hidden">
            Atualizado: {lastUpdate}
          </span>
        }
        subtitle="Acompanhe técnicos, tarefas ativas e filas operacionais do Marketing."
        title="Disponibilidade Técnica · Marketing"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">
        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="rounded-2xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
            Carregando disponibilidade…
          </div>
        ) : null}

        {data ? (
          <>
            <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              {[
                ['Agendadas', data.summary.scheduled],
                ['Aguardando', data.summary.waitingExecution],
                ['Em execução', data.summary.inProgress],
                ['Em espera', data.summary.onHold],
                ['Concluídas hoje', data.summary.finishedToday],
                ['Online', data.summary.onlineTechnicians],
                ['Disponíveis', data.summary.availableTechnicians],
                ['Ocupados', data.summary.busyTechnicians],
              ].map(([label, value]) => (
                <div className="rounded-xl border border-app-border bg-app-surface p-3 shadow-sm" key={String(label)}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-app-muted">
                    {label}
                  </span>
                  <strong className="mt-1 block text-2xl text-app-text">{value}</strong>
                </div>
              ))}
            </section>

            <section className="mb-4 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
              <div className="mb-4 border-b border-app-border-soft pb-3">
                <h2 className="m-0 text-sm font-extrabold">Equipe de Marketing</h2>
                <p className="m-0 mt-1 text-xs text-app-muted">
                  Online considera sessão ativa utilizada nos últimos {data.onlineWindowMinutes} minutos.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {data.technicians.map((technician) => {
                  const label =
                    technician.state === 'busy'
                      ? 'Ocupado'
                      : technician.state === 'available'
                        ? 'Disponível'
                        : 'Offline';
                  const stateClass =
                    technician.state === 'busy'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                      : technician.state === 'available'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'bg-app-surface-muted text-app-muted';

                  return (
                    <article className="rounded-xl border border-app-border bg-app-surface-muted p-3" key={technician.id}>
                      <div className="flex items-start justify-between gap-3">
                        <strong className="min-w-0 truncate text-sm">{technician.name}</strong>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${stateClass}`}>
                          {label}
                        </span>
                      </div>
                      {technician.executing.length ? (
                        <div className="mt-3 grid gap-2">
                          {technician.executing.map((task) => (
                            <TaskLink key={task.id} task={task} />
                          ))}
                        </div>
                      ) : (
                        <p className="m-0 mt-3 text-xs text-app-muted">
                          {technician.online
                            ? 'Sem tarefa em execução.'
                            : 'Sem sessão ativa recente.'}
                        </p>
                      )}
                    </article>
                  );
                })}
                {!data.technicians.length ? (
                  <p className="m-0 text-sm text-app-muted">
                    Nenhum técnico de Marketing habilitado.
                  </p>
                ) : null}
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <Queue
                subtitle="Tarefas abertas aguardando início."
                tasks={data.waitingExecution}
                title="Aguardando execução"
              />
              <Queue
                subtitle="Tarefas programadas para uma data futura."
                tasks={data.scheduled}
                title="Agendadas"
              />
              <Queue
                subtitle="Tarefas temporariamente pausadas."
                tasks={data.onHold}
                title="Em espera"
              />
              <Queue
                subtitle="Tarefas concluídas na data atual."
                tasks={data.finishedToday}
                title="Concluídas hoje"
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
