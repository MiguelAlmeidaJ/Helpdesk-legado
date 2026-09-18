"use client";

import type {
  CurrentUserResponse,
  MarketingTicketDetailResponse,
  TicketCatalogOption,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { updateMarketingTicketClassification } from '../api/modular-ticket-edit-api';
import { fetchMarketingTicketDetail } from '../api/modular-ticket-read-api';
import {
  addMarketingTicketInteraction,
  assignMarketingTicket,
  fetchMarketingWorkflowTechnicians,
  finalizeMarketingTicket,
  holdMarketingTicket,
  rejectMarketingTicket,
  resumeMarketingTicket,
} from '../api/modular-ticket-workflow-api';
import { MarketingTicketClassificationEditor } from './marketing-ticket-classification-editor';
import { SpecializedTicketWorkflowPanel } from './specialized-ticket-workflow-panel';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)]';
const CARD_CLASS =
  'mb-4 rounded-[14px] border border-app-border bg-app-surface p-[1.15rem] shadow-sm shadow-slate-950/5 dark:shadow-black/10';
const DETAIL_GRID_CLASS =
  'm-0 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}min`]
    .filter(Boolean)
    .join(' ');
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 404) {
    return 'Ticket de Marketing não encontrado ou fora do seu escopo.';
  }
  if (reason instanceof ApiError && reason.status === 403) {
    return 'Seu usuário não possui acesso a este ticket de Marketing.';
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar o ticket de Marketing.';
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[0.78rem] font-bold tracking-[0.02em] text-app-muted">
        {label}
      </dt>
      <dd className="m-0 [overflow-wrap:anywhere] text-sm text-app-text-soft">
        {children}
      </dd>
    </div>
  );
}

export function MarketingTicketDetailScreen({
  currentUser,
  ticketId,
}: {
  currentUser: CurrentUserResponse;
  ticketId: number;
}) {
  const [ticket, setTicket] = useState<MarketingTicketDetailResponse | null>(null);
  const [technicians, setTechnicians] = useState<TicketCatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchMarketingTicketDetail(ticketId, controller.signal),
      fetchMarketingWorkflowTechnicians().catch(() => [] as TicketCatalogOption[]),
    ])
      .then(([nextTicket, options]) => {
        setTicket(nextTicket);
        setTechnicians(options);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) {
          setError(errorMessage(reason));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshToken, ticketId]);

  function refresh() {
    setRefreshToken((value) => value + 1);
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppSidebar />
          <Link className="flex items-baseline gap-2.5 no-underline" href="/dashboard">
            <strong className="text-lg text-app-text">Helpdesk</strong>
            <span className="text-[13px] text-app-subtle max-sm:hidden">Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">
        <div className="mb-[18px] flex items-end justify-between gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
          <div>
            <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Tickets · Marketing
            </span>
            <h1 className="m-0 text-[28px] font-bold tracking-tight text-app-text">
              Marketing #{ticketId}
            </h1>
            <p className="mt-1.5 text-app-muted-strong">
              {ticket?.name ?? 'Detalhe operacional da demanda de Marketing.'}
            </p>
          </div>
          <Link className={BUTTON_CLASS} href="/tickets/marketing">
            Voltar à lista
          </Link>
        </div>

        {loading ? (
          <div
            className="mb-3 h-1 overflow-hidden rounded-full bg-app-border"
            aria-label="Carregando"
            role="progressbar"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-app-brand" />
          </div>
        ) : null}
        {error ? (
          <div
            className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-sm text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {ticket ? (
          <>
            <section className={CARD_CLASS}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
                    Resumo
                  </span>
                  <h2 className="m-0 text-[1.05rem] font-bold text-app-text">
                    {ticket.name}
                  </h2>
                </div>
                <span className="inline-flex items-center rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-extrabold text-app-text-soft ring-1 ring-inset ring-app-border-soft">
                  {ticket.statusLabel}
                </span>
              </div>

              <dl className={DETAIL_GRID_CLASS}>
                <DetailItem label="Cliente">{ticket.client.name || '—'}</DetailItem>
                <DetailItem label="Solicitante">{ticket.requester.name || '—'}</DetailItem>
                <DetailItem label="Local">{ticket.location.name || '—'}</DetailItem>
                <DetailItem label="Técnico">{ticket.technician.name || 'Não atribuído'}</DetailItem>
                <DetailItem label="Tipo">{ticket.type.name || '—'}</DetailItem>
                <DetailItem label="Categoria">{ticket.category.name || '—'}</DetailItem>
                <DetailItem label="Subcategoria">{ticket.subcategory.name || '—'}</DetailItem>
                <DetailItem label="Nível">{ticket.level.name || '—'}</DetailItem>
                <DetailItem label="Forma">{ticket.form ?? '—'}</DetailItem>
                <DetailItem label="Reincidente">{ticket.recurrent ? 'Sim' : 'Não'}</DetailItem>
                <DetailItem label="Espera acumulada">{formatDuration(ticket.waitSeconds)}</DetailItem>
                <DetailItem label="Abertura">{formatDate(ticket.openedAt)}</DetailItem>
                <DetailItem label="Fechamento">{formatDate(ticket.closedAt)}</DetailItem>
                <DetailItem label="Última atividade">{formatDate(ticket.lastActivityAt)}</DetailItem>
              </dl>
            </section>

            <section className={CARD_CLASS}>
              <h2 className="m-0 text-[1.05rem] font-bold text-app-text">Descrição de abertura</h2>
              <p className="mb-0 mt-2.5 whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                {ticket.openingDescription || 'Sem descrição.'}
              </p>
            </section>

            {ticket.closingDescription ? (
              <section className={CARD_CLASS}>
                <h2 className="m-0 text-[1.05rem] font-bold text-app-text">Descrição de fechamento</h2>
                <p className="mb-0 mt-2.5 whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                  {ticket.closingDescription}
                </p>
              </section>
            ) : null}

            <MarketingTicketClassificationEditor
              onChanged={refresh}
              onSave={(input) => updateMarketingTicketClassification(ticketId, input)}
              ticket={ticket}
            />

            <SpecializedTicketWorkflowPanel
              actions={{
                interaction: (description) => addMarketingTicketInteraction(ticketId, { description }),
                assignment: (technicianId) => assignMarketingTicket(ticketId, { technicianId }),
                hold: (forecastAt, description) => holdMarketingTicket(ticketId, { forecastAt, description }),
                resume: () => resumeMarketingTicket(ticketId),
                reject: (technicianId, reason) => rejectMarketingTicket(ticketId, { technicianId, reason }),
                finalize: (description) => finalizeMarketingTicket(ticketId, { description }),
              }}
              assignedTechnicianId={ticket.technician.id}
              currentUser={currentUser}
              onChanged={refresh}
              resourceLabel="ticket de Marketing"
              status={ticket.status}
              statusLabel={ticket.statusLabel}
              technicians={technicians}
            />

            <section className={CARD_CLASS}>
              <h2 className="m-0 text-[1.05rem] font-bold text-app-text">Histórico</h2>
              {ticket.timeline.length === 0 ? (
                <p className="mb-0 mt-2.5 text-sm text-app-muted">Nenhuma interação registrada.</p>
              ) : (
                <ol className="m-0 mt-4 grid list-none gap-3 p-0">
                  {ticket.timeline.map((item) => (
                    <li
                      className="grid grid-cols-1 gap-3 border-t border-app-border-soft pt-3 sm:grid-cols-[minmax(130px,180px)_minmax(0,1fr)] sm:gap-4"
                      key={item.id}
                    >
                      <div className="grid content-start gap-0.5 text-xs text-app-muted">
                        <strong className="text-app-text-soft">{item.user.name || 'Sistema'}</strong>
                        <span>{formatDate(item.at)}</span>
                        <span>Tipo {item.type}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                        {item.description || 'Sem descrição.'}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
