"use client";

import type {
  CurrentUserResponse,
  TicketDetailResponse,
  TicketInteraction,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type FormEvent,
  useEffect,
  useState,
} from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { TicketAssignmentActions } from './ticket-assignment-actions';
import { TicketAttachmentsPanel } from './ticket-attachments-panel';
import { TicketCatalogPanel } from './ticket-catalog-panel';
import { TicketClassificationEditor } from './ticket-classification-editor';
import { TicketHoldActions } from './ticket-hold-actions';
import { TicketCloseActions } from './ticket-close-actions';
import { TicketRejectionActions } from './ticket-rejection-actions';
import { ApiError } from '../../../shared/api/api-client';
import {
  createTicketInteraction,
  fetchTicketDetail,
} from '../api/tickets-api';
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-[680px]:px-3.5',
  headerLeft: 'flex min-w-0 items-center gap-2.5',
  brand:
    'flex items-baseline gap-2.5 no-underline [&_strong]:text-lg [&_span]:text-[13px] [&_span]:text-app-subtle max-[680px]:[&_span]:hidden',
  content: 'mx-auto w-full max-w-[1450px] p-6 max-[680px]:px-3.5',
  toolbar:
    'mb-[18px] flex justify-between gap-5 [&_h1]:mr-3 [&_h1]:mt-2 [&_h1]:inline-block [&_h1]:text-[28px]',
  back: 'block text-[13px] font-bold text-app-brand no-underline hover:underline',
  status:
    'inline-flex items-center rounded-full bg-app-brand-soft px-[9px] py-[5px] text-xs font-extrabold text-app-brand',
  layout:
    'grid grid-cols-[minmax(0,2fr)_minmax(320px,0.9fr)] items-start gap-4 max-[980px]:grid-cols-1',
  main: 'grid gap-4',
  card: 'overflow-hidden rounded-xl border border-app-border bg-app-surface',
  timelineCard:
    'sticky top-[84px] overflow-hidden rounded-xl border border-app-border bg-app-surface max-[980px]:static',
  cardHeader:
    'flex min-h-12 items-center justify-between gap-3 border-b border-app-border-soft bg-app-surface-muted px-4 py-2.5 [&_h2]:m-0 [&_h2]:text-[15px] [&_span]:text-[11px] [&_span]:text-app-subtle',
  timelineHeaderActions: 'flex items-center gap-2',
  newInteractionButton:
    'min-h-[30px] cursor-pointer rounded-[7px] border border-app-brand bg-app-surface px-[9px] text-[10px] font-extrabold text-app-brand transition hover:bg-app-brand-soft',
  interactionForm:
    'grid gap-[7px] border-b border-app-border-soft bg-app-surface-muted px-4 py-[13px] [&_label]:text-[10px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:tracking-[0.03em] [&_label]:text-app-muted [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:p-2.5 [&_textarea]:text-xs [&_textarea]:leading-[1.5] [&_textarea]:text-app-text-soft [&_textarea]:[font:inherit] [&_textarea]:outline-none [&_textarea]:transition [&_textarea:focus]:border-app-brand [&_textarea:focus]:ring-3 [&_textarea:focus]:ring-[var(--app-brand-ring)] [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:opacity-55',
  interactionFormFooter:
    'flex items-center justify-between gap-2.5 [&_small]:text-[9px] [&_small]:text-app-subtle [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-brand [&_button]:bg-app-brand [&_button]:px-[11px] [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-white [&_button]:transition [&_button:hover]:bg-app-brand-hover dark:[&_button]:text-slate-950 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-55',
  interactionFeedback:
    'border-b border-app-border-soft bg-app-surface-hover px-4 py-[9px] text-[10px] leading-[1.45] text-app-muted',
  cardBody: 'p-4',
  facts:
    'grid grid-cols-3 gap-3 max-[680px]:grid-cols-1 [&>div]:grid [&>div]:gap-1 [&_span]:text-[11px] [&_span]:font-extrabold [&_span]:uppercase [&_span]:text-app-subtle [&_strong]:text-[13px] [&_strong]:text-app-text-soft',
  description:
    'mt-[18px] [&>span]:text-[11px] [&>span]:font-extrabold [&>span]:uppercase [&>span]:text-app-subtle [&_p]:mt-[7px] [&_p]:mb-0 [&_p]:whitespace-pre-wrap [&_p]:rounded-lg [&_p]:bg-app-surface-muted [&_p]:p-3 [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:text-app-text-soft',
  definitionList:
    'm-0 grid grid-cols-2 gap-x-5 gap-y-3.5 max-[680px]:grid-cols-1 [&>div]:grid [&>div]:gap-1 [&_dt]:text-[11px] [&_dt]:font-extrabold [&_dt]:uppercase [&_dt]:text-app-subtle [&_dd]:m-0 [&_dd]:text-[13px] [&_dd]:text-app-text-soft',
  twoColumns: 'grid grid-cols-2 gap-6 max-[680px]:grid-cols-1',
  timeline:
    'max-h-[calc(100vh-170px)] overflow-y-auto px-4 pb-[18px] pt-3.5 max-[980px]:max-h-none',
  timelineItem:
    "relative grid grid-cols-[14px_minmax(0,1fr)] gap-2.5 pb-[18px] before:absolute before:bottom-[-2px] before:left-[5px] before:top-2.5 before:w-px before:bg-app-border before:content-[''] last:before:hidden [&_small]:text-[10px] [&_small]:text-app-subtle [&_p]:mb-0 [&_p]:mt-1.5 [&_p]:whitespace-pre-wrap [&_p]:text-xs [&_p]:leading-[1.5] [&_p]:text-app-muted",
  timelineMarker:
    'relative z-[1] mt-1 h-[11px] w-[11px] rounded-full border-2 border-app-surface bg-app-brand ring-1 ring-app-brand',
  timelineMeta:
    'flex items-baseline justify-between gap-2.5 [&_strong]:text-xs [&_strong]:text-app-text-soft [&_span]:text-[10px] [&_span]:text-app-subtle',
  empty: 'm-0 rounded-[10px] p-[18px] text-[13px] text-app-muted',
  loading:
    'mb-4 rounded-[10px] border border-app-border bg-app-surface p-[18px] text-[13px] text-app-muted',
  error:
    'mb-4 rounded-[10px] border border-app-danger-border bg-app-danger-soft p-[18px] text-[13px] text-app-danger',
} as const;

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function text(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized ? normalized : '—';
}

function interactionTitle(interaction: TicketInteraction): string {
  const labels: Record<number, string> = {
    1: 'Abertura',
    2: 'Aceite',
    3: 'Devolução',
    4: 'Transferência',
    5: 'Enviado para espera',
    6: 'Retomada',
    7: 'Interação',
    8: 'Finalização',
    9: 'Edição',
    10: 'Concluído',
    11: 'Anexo removido',
    12: 'Anexo adicionado',
  };

  return labels[interaction.type] ?? `Evento ${interaction.type}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente para continuar.';
    }

    if (error.status === 403) {
      return 'Seu usuário não possui permissão para visualizar este atendimento.';
    }

    if (error.status === 404) {
      return 'Atendimento não encontrado ou fora do seu escopo.';
    }

    return `A API respondeu com erro ${error.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível carregar o atendimento.';
}

export function TicketDetailScreen({
  currentUser,
  ticketId,
}: {
  currentUser: CurrentUserResponse;
  ticketId: number;
}) {
  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionDescription, setInteractionDescription] = useState('');
  const [interactionSaving, setInteractionSaving] = useState(false);
  const [interactionFeedback, setInteractionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchTicketDetail(ticketId, controller.signal)
      .then(setTicket)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') {
          return;
        }

        setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [ticketId]);

  async function submitInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const description = interactionDescription.trim();

    if (!description) {
      setInteractionFeedback('Descreva a interação antes de salvar.');
      return;
    }

    setInteractionSaving(true);
    setInteractionFeedback(null);

    try {
      await createTicketInteraction(ticketId, { description });

      setInteractionDescription('');
      setInteractionOpen(false);
      setInteractionFeedback('Interação adicionada ao histórico.');

      try {
        const updatedTicket = await fetchTicketDetail(ticketId);
        setTicket(updatedTicket);
      } catch {
        setInteractionFeedback(
          'Interação adicionada, mas não foi possível atualizar o histórico. Recarregue a página.',
        );
      }
    } catch (reason: unknown) {
      if (reason instanceof ApiError && reason.status === 401) {
        setInteractionFeedback('Sua sessão expirou. Entre novamente.');
      } else if (reason instanceof ApiError && reason.status === 404) {
        setInteractionFeedback(
          'Atendimento não encontrado ou fora do seu escopo.',
        );
      } else if (reason instanceof ApiError) {
        setInteractionFeedback(
          `Não foi possível salvar a interação (erro ${reason.status}).`,
        );
      } else {
        setInteractionFeedback('Não foi possível conectar à API.');
      }
    } finally {
      setInteractionSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <AppPageHeader
        actions={
          <Link className={styles.back} href="/atendimentos">
            Voltar à lista
          </Link>
        }
        subtitle={ticket?.statusLabel ?? 'Detalhe operacional do atendimento.'}
        title={`Atendimento #${ticketId}`}
        user={currentUser}
      />

      <div className={styles.content}>

        {loading ? <div className={styles.loading}>Carregando atendimento…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {ticket ? (
          <div className={styles.layout}>
            <div className={styles.main}>
              <TicketAssignmentActions
                currentUser={currentUser}
                onUpdated={setTicket}
                ticket={ticket}
              />
              <TicketRejectionActions
                currentUser={currentUser}
                onUpdated={setTicket}
                ticket={ticket}
              />
              <TicketHoldActions
                currentUser={currentUser}
                onUpdated={setTicket}
                ticket={ticket}
              />
              <TicketCloseActions
                currentUser={currentUser}
                onUpdated={setTicket}
                ticket={ticket}
              />
              <TicketClassificationEditor
                currentUser={currentUser}
                onUpdated={setTicket}
                ticket={ticket}
              />
              <TicketAttachmentsPanel
                currentUser={currentUser}
                onUpdated={setTicket}
                ticket={ticket}
              />
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Atendimento</h2>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.facts}>
                    <div>
                      <span>Abertura</span>
                      <strong>{formatDate(ticket.openedAt)}</strong>
                    </div>
                    <div>
                      <span>Fechamento</span>
                      <strong>{formatDate(ticket.closedAt)}</strong>
                    </div>
                    <div>
                      <span>Técnico</span>
                      <strong>{text(ticket.technician.name)}</strong>
                    </div>
                    <div>
                      <span>Forma</span>
                      <strong>{ticket.form.label}</strong>
                    </div>
                    <div>
                      <span>Nível</span>
                      <strong>{ticket.level.label}</strong>
                    </div>
                    <div>
                      <span>Prioridade</span>
                      <strong>{ticket.priority.label}</strong>
                    </div>
                  </div>

                  <div className={styles.description}>
                    <span>Descrição de abertura</span>
                    <p>{text(ticket.openingDescription)}</p>
                  </div>

                  {ticket.closingDescription ? (
                    <div className={styles.description}>
                      <span>Descrição de fechamento</span>
                      <p>{ticket.closingDescription}</p>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Classificação</h2>
                </div>
                <div className={styles.cardBody}>
                  <dl className={styles.definitionList}>
                    <div>
                      <dt>Tipo</dt>
                      <dd>{ticket.type.label}</dd>
                    </div>
                    <div>
                      <dt>Categoria</dt>
                      <dd>{text(ticket.classification.category.name)}</dd>
                    </div>
                    <div>
                      <dt>Subcategoria</dt>
                      <dd>{text(ticket.classification.subcategory.name)}</dd>
                    </div>
                    <div>
                      <dt>Item</dt>
                      <dd>{text(ticket.classification.item.name)}</dd>
                    </div>
                    <div>
                      <dt>Reincidente</dt>
                      <dd>{ticket.incident.reincident ? 'Sim' : 'Não'}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <TicketCatalogPanel
                clientId={ticket.client.id}
                currentUser={currentUser}
              />

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Cliente e solicitante</h2>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.twoColumns}>
                    <dl className={styles.definitionList}>
                      <div>
                        <dt>Razão social</dt>
                        <dd>{text(ticket.client.legalName)}</dd>
                      </div>
                      <div>
                        <dt>Nome fantasia</dt>
                        <dd>{text(ticket.client.tradeName)}</dd>
                      </div>
                      <div>
                        <dt>CNPJ</dt>
                        <dd>{text(ticket.client.document)}</dd>
                      </div>
                    </dl>

                    <dl className={styles.definitionList}>
                      <div>
                        <dt>Solicitante</dt>
                        <dd>{text(ticket.requester.name)}</dd>
                      </div>
                      <div>
                        <dt>Cargo</dt>
                        <dd>{text(ticket.requester.role)}</dd>
                      </div>
                      <div>
                        <dt>Telefone</dt>
                        <dd>{text(ticket.requester.phone)}</dd>
                      </div>
                      <div>
                        <dt>E-mail</dt>
                        <dd>{text(ticket.requester.email)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Local</h2>
                </div>
                <div className={styles.cardBody}>
                  <dl className={styles.definitionList}>
                    <div>
                      <dt>Local</dt>
                      <dd>{text(ticket.location.name)}</dd>
                    </div>
                    <div>
                      <dt>Endereço</dt>
                      <dd>{text(ticket.location.address)}</dd>
                    </div>
                    <div>
                      <dt>Cidade / UF</dt>
                      <dd>
                        {text(
                          [ticket.location.city, ticket.location.state]
                            .filter(Boolean)
                            .join(' / ') || null,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>

            <aside className={styles.timelineCard}>
              <div className={styles.cardHeader}>
                <h2>Histórico</h2>
                <div className={styles.timelineHeaderActions}>
                  <span>{ticket.interactions.length} registros</span>
                  <button
                    className={styles.newInteractionButton}
                    onClick={() => {
                      setInteractionOpen((current) => !current);
                      setInteractionFeedback(null);
                    }}
                    type="button"
                  >
                    {interactionOpen ? 'Cancelar' : 'Nova interação'}
                  </button>
                </div>
              </div>

              {interactionOpen ? (
                <form
                  className={styles.interactionForm}
                  onSubmit={submitInteraction}
                >
                  <label htmlFor="ticket-interaction">
                    Descrição da interação
                  </label>
                  <textarea
                    autoFocus
                    disabled={interactionSaving}
                    id="ticket-interaction"
                    maxLength={10000}
                    onChange={(event) =>
                      setInteractionDescription(event.target.value)
                    }
                    placeholder="Descreva o contato, orientação ou atualização..."
                    required
                    rows={5}
                    value={interactionDescription}
                  />
                  <div className={styles.interactionFormFooter}>
                    <small>
                      {interactionDescription.length.toLocaleString('pt-BR')}
                      /10.000
                    </small>
                    <button
                      disabled={
                        interactionSaving ||
                        interactionDescription.trim().length === 0
                      }
                      type="submit"
                    >
                      {interactionSaving ? 'Salvando…' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              ) : null}

              {interactionFeedback ? (
                <div className={styles.interactionFeedback}>
                  {interactionFeedback}
                </div>
              ) : null}

              <div className={styles.timeline}>
                {ticket.interactions.length === 0 ? (
                  <p className={styles.empty}>Nenhuma interação registrada.</p>
                ) : (
                  ticket.interactions.map((interaction) => (
                    <article className={styles.timelineItem} key={interaction.id}>
                      <div className={styles.timelineMarker} />
                      <div>
                        <div className={styles.timelineMeta}>
                          <strong>{interactionTitle(interaction)}</strong>
                          <span>{formatDate(interaction.occurredAt)}</span>
                        </div>
                        <small>{interaction.user.name}</small>
                        <p>{text(interaction.description)}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
