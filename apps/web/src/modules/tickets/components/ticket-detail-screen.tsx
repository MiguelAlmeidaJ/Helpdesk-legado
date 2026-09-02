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
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { TicketAssignmentActions } from './ticket-assignment-actions';
import { TicketRejectionActions } from './ticket-rejection-actions';
import { ApiError } from '../../../shared/api/api-client';
import {
  createTicketInteraction,
  fetchTicketDetail,
} from '../api/tickets-api';
import styles from './ticket-detail-screen.module.css';

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
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div>
            <Link className={styles.back} href="/tickets">
              ← Voltar para atendimentos
            </Link>
            <h1>Atendimento #{ticketId}</h1>
            {ticket ? (
              <span className={styles.status}>{ticket.statusLabel}</span>
            ) : null}
          </div>
        </div>

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
