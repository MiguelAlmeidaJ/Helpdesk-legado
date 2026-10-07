"use client";

import type {
  CurrentUserResponse,
  TicketDetailResponse,
  TicketInteraction,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { TicketAssignmentActions } from './ticket-assignment-actions';
import {
  canMutateTicketAttachments,
  TicketAttachmentsPanel,
} from './ticket-attachments-panel';
import { TicketCatalogPanel } from './ticket-catalog-panel';
import { TicketClassificationEditor } from './ticket-classification-editor';
import { TicketHoldActions } from './ticket-hold-actions';
import { TicketCloseActions } from './ticket-close-actions';
import { TicketRejectionActions } from './ticket-rejection-actions';
import { ApiError } from '../../../shared/api/api-client';
import {
  createTicketInteraction,
  fetchTicketDetail,
  uploadTicketAttachment,
} from '../api/tickets-api';

type TicketTab = 'overview' | 'details' | 'attachments' | 'context' | 'catalog';

type PasteFeedback = {
  message: string;
  tone: 'loading' | 'success' | 'error';
};

const TICKET_TABS: ReadonlyArray<{ id: TicketTab; label: string }> = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'details', label: 'Detalhes' },
  { id: 'attachments', label: 'Anexos' },
  { id: 'context', label: 'Contexto' },
  { id: 'catalog', label: 'Catálogo' },
];

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  content:
    'mx-auto w-full max-w-[1540px] p-6 max-[680px]:px-3.5 max-[680px]:py-4',
  back: 'block text-[13px] font-bold text-app-brand no-underline hover:underline',
  layout:
    'grid grid-cols-[minmax(0,1.8fr)_minmax(360px,0.72fr)] items-start gap-5 max-[1080px]:grid-cols-1',
  main: 'grid gap-4',
  tabs:
    'flex max-w-full gap-1 overflow-x-auto rounded-xl border border-app-border bg-app-surface p-1 shadow-[0_4px_18px_rgba(15,23,42,0.025)]',
  tab:
    'min-h-10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent px-4 text-xs font-extrabold text-app-muted transition hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-brand',
  activeTab:
    'bg-app-brand! text-app-brand-contrast! shadow-sm hover:bg-app-brand-hover! hover:text-app-brand-contrast!',
  tabPanel: 'grid gap-4',
  pasteToast:
    'fixed bottom-5 right-5 z-50 flex max-w-[420px] items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3 text-xs text-app-text-soft shadow-[0_16px_45px_rgba(15,23,42,0.2)] max-[680px]:bottom-3 max-[680px]:left-3 max-[680px]:right-3 max-[680px]:max-w-none [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface-muted [&_button]:px-2.5 [&_button]:py-1.5 [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-app-brand',
  pasteToastSuccess: 'border-app-border bg-app-success-soft',
  pasteToastError: 'border-app-danger-border bg-app-danger-soft text-app-danger',
  pasteSpinner:
    'h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-app-border-strong border-t-app-brand',
  pasteMessage: 'min-w-0 flex-1 leading-5',
  overview:
    'overflow-hidden rounded-2xl border border-app-border bg-[linear-gradient(135deg,var(--app-surface)_0%,var(--app-surface)_62%,var(--app-brand-soft)_140%)] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)] max-[680px]:p-4',
  overviewHeader:
    'flex items-start justify-between gap-5 max-[680px]:flex-col max-[680px]:gap-3',
  overviewEyebrow:
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.09em] text-app-brand',
  overviewTitle:
    'm-0 text-xl font-extrabold tracking-[-0.02em] text-app-text max-[680px]:text-lg',
  overviewSubtitle: 'mt-1.5 text-[13px] leading-5 text-app-muted',
  overviewStatus:
    'inline-flex shrink-0 items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-xs font-extrabold text-app-text-soft shadow-sm',
  statusDot: 'h-2 w-2 rounded-full bg-app-brand ring-4 ring-[var(--app-brand-ring)]',
  overviewGrid:
    'mt-5 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-app-border-soft bg-app-border-soft max-[760px]:grid-cols-2 max-[460px]:grid-cols-1',
  overviewFact:
    'grid min-h-[72px] content-center gap-1 bg-app-surface/90 px-4 py-3 [&_span]:text-[10px] [&_span]:font-extrabold [&_span]:uppercase [&_span]:tracking-[0.04em] [&_span]:text-app-subtle [&_strong]:truncate [&_strong]:text-[13px] [&_strong]:text-app-text-soft',
  sectionIntro:
    'flex items-end justify-between gap-4 px-1 [&_h2]:m-0 [&_h2]:text-[15px] [&_h2]:font-extrabold [&_p]:m-0 [&_p]:text-xs [&_p]:text-app-subtle max-[680px]:items-start max-[680px]:flex-col max-[680px]:gap-1',
  actionSection: 'grid gap-3',
  actionGrid:
    'grid grid-cols-2 items-start gap-3 max-[1240px]:grid-cols-1 [&>section]:h-fit [&>section]:shadow-[0_4px_18px_rgba(15,23,42,0.025)]',
  card:
    'scroll-mt-24 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_6px_22px_rgba(15,23,42,0.025)]',
  timelineCard:
    'sticky top-[84px] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)] max-[1080px]:static',
  cardHeader:
    'flex min-h-14 items-center justify-between gap-3 border-b border-app-border-soft bg-app-surface-muted px-5 py-3 [&_h2]:m-0 [&_h2]:text-[15px] [&_h2]:font-extrabold [&_span]:text-[11px] [&_span]:text-app-subtle max-[680px]:px-4',
  timelineHeaderActions: 'flex items-center gap-2',
  timelineCount:
    'rounded-full bg-app-surface px-2 py-1 text-[10px]! font-bold text-app-subtle! ring-1 ring-app-border-soft',
  newInteractionButton:
    'min-h-8 cursor-pointer rounded-lg border border-app-brand bg-app-brand px-2.5 text-[10px] font-extrabold text-app-brand-contrast transition hover:bg-app-brand-hover',
  interactionForm:
    'grid gap-[7px] border-b border-app-border-soft bg-app-surface-muted px-4 py-[13px] [&_label]:text-[10px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:tracking-[0.03em] [&_label]:text-app-muted [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:p-2.5 [&_textarea]:text-xs [&_textarea]:leading-[1.5] [&_textarea]:text-app-text-soft [&_textarea]:[font:inherit] [&_textarea]:outline-none [&_textarea]:transition [&_textarea:focus]:border-app-brand [&_textarea:focus]:ring-3 [&_textarea:focus]:ring-[var(--app-brand-ring)] [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:opacity-55',
  interactionFormFooter:
    'flex items-center justify-between gap-2.5 [&_small]:text-[9px] [&_small]:text-app-subtle [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-brand [&_button]:bg-app-brand [&_button]:px-[11px] [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-white [&_button]:transition [&_button:hover]:bg-app-brand-hover dark:[&_button]:text-slate-950 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-55',
  interactionFeedback:
    'border-b border-app-border-soft bg-app-surface-hover px-4 py-[9px] text-[10px] leading-[1.45] text-app-muted',
  cardBody: 'p-5 max-[680px]:p-4',
  facts:
    'grid grid-cols-4 gap-4 max-[760px]:grid-cols-2 max-[460px]:grid-cols-1 [&>div]:grid [&>div]:gap-1 [&_span]:text-[10px] [&_span]:font-extrabold [&_span]:uppercase [&_span]:tracking-[0.035em] [&_span]:text-app-subtle [&_strong]:text-[13px] [&_strong]:text-app-text-soft',
  description:
    'mt-[18px] [&>span]:text-[11px] [&>span]:font-extrabold [&>span]:uppercase [&>span]:text-app-subtle [&_p]:mt-[7px] [&_p]:mb-0 [&_p]:whitespace-pre-wrap [&_p]:rounded-lg [&_p]:bg-app-surface-muted [&_p]:p-3 [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:text-app-text-soft',
  subsection:
    'mt-5 border-t border-app-border-soft pt-5 [&_h3]:mb-4 [&_h3]:mt-0 [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-app-text-soft',
  classificationList:
    'm-0 grid grid-cols-3 gap-x-5 gap-y-3.5 max-[760px]:grid-cols-2 max-[460px]:grid-cols-1 [&>div]:grid [&>div]:gap-1 [&_dt]:text-[10px] [&_dt]:font-extrabold [&_dt]:uppercase [&_dt]:tracking-[0.035em] [&_dt]:text-app-subtle [&_dd]:m-0 [&_dd]:text-[13px] [&_dd]:text-app-text-soft',
  contextGrid:
    'grid grid-cols-3 divide-x divide-app-border-soft max-[820px]:grid-cols-1 max-[820px]:divide-x-0 max-[820px]:divide-y',
  contextGroup:
    'p-5 max-[680px]:p-4 [&_h3]:mb-4 [&_h3]:mt-0 [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-app-text-soft',
  contextList:
    'm-0 grid gap-3.5 [&>div]:grid [&>div]:gap-1 [&_dt]:text-[10px] [&_dt]:font-extrabold [&_dt]:uppercase [&_dt]:tracking-[0.035em] [&_dt]:text-app-subtle [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-[13px] [&_dd]:text-app-text-soft',
  timeline:
    'max-h-[calc(100vh-170px)] overflow-y-auto px-4 pb-2 pt-4 max-[1080px]:max-h-none',
  timelineItem:
    "relative grid grid-cols-[14px_minmax(0,1fr)] gap-2.5 pb-5 before:absolute before:bottom-[-2px] before:left-[5px] before:top-2.5 before:w-px before:bg-app-border before:content-[''] last:pb-3 last:before:hidden [&_small]:text-[10px] [&_small]:font-medium [&_small]:text-app-subtle [&_p]:mb-0 [&_p]:mt-2 [&_p]:whitespace-pre-wrap [&_p]:rounded-lg [&_p]:bg-app-surface-muted [&_p]:px-3 [&_p]:py-2.5 [&_p]:text-xs [&_p]:leading-[1.55] [&_p]:text-app-muted",
  timelineMarker:
    'relative z-[1] mt-1 h-[11px] w-[11px] rounded-full border-2 border-app-surface bg-app-brand ring-1 ring-app-brand',
  timelineMeta:
    'flex items-baseline justify-between gap-2.5 [&_strong]:text-xs [&_strong]:text-app-text-soft [&_time]:shrink-0 [&_time]:text-[10px] [&_time]:text-app-subtle',
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

function timelineText(value: string | null | undefined): string {
  return text(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/&nbsp;/gi, ' ');
}

function ticketSubject(ticket: TicketDetailResponse): string {
  const subject = [
    ticket.type.label,
    ticket.classification.category.name,
    ticket.classification.subcategory.name,
    ticket.classification.item.name,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' › ');

  return subject || 'Sem classificação informada';
}

function pastedImageFile(source: File): File {
  const extension = source.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return new File([source], `imagem-colada-${timestamp}.${extension}`, {
    lastModified: Date.now(),
    type: source.type,
  });
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
  const [activeTab, setActiveTab] = useState<TicketTab>('overview');
  const [attachmentRefreshToken, setAttachmentRefreshToken] = useState(0);
  const [pasteFeedback, setPasteFeedback] = useState<PasteFeedback | null>(null);
  const pasteInProgressRef = useRef(false);

  const canPasteAttachment = ticket
    ? canMutateTicketAttachments(currentUser, ticket)
    : false;

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

  useEffect(() => {
    if (!canPasteAttachment) {
      return;
    }

    async function handlePaste(event: ClipboardEvent) {
      const imageItem = Array.from(event.clipboardData?.items ?? []).find(
        (item) => item.kind === 'file' && item.type.startsWith('image/'),
      );
      const sourceFile = imageItem?.getAsFile();

      if (!sourceFile) {
        return;
      }

      event.preventDefault();

      if (pasteInProgressRef.current) {
        setPasteFeedback({
          message: 'Aguarde o envio da imagem anterior.',
          tone: 'error',
        });
        return;
      }

      if (sourceFile.size > MAX_ATTACHMENT_SIZE) {
        setPasteFeedback({
          message: 'A imagem excede o limite de 25 MB.',
          tone: 'error',
        });
        return;
      }

      pasteInProgressRef.current = true;
      setPasteFeedback({
        message: 'Enviando imagem colada…',
        tone: 'loading',
      });

      try {
        await uploadTicketAttachment(ticketId, pastedImageFile(sourceFile));
        setAttachmentRefreshToken((current) => current + 1);
        setPasteFeedback({
          message: 'Imagem adicionada aos anexos.',
          tone: 'success',
        });

        try {
          setTicket(await fetchTicketDetail(ticketId));
        } catch {
          // O anexo foi salvo; a atualização do histórico pode ocorrer no próximo reload.
        }
      } catch (reason: unknown) {
        setPasteFeedback({
          message:
            reason instanceof ApiError && reason.status === 403
              ? 'Seu usuário não pode anexar neste atendimento.'
              : 'Não foi possível enviar a imagem colada.',
          tone: 'error',
        });
      } finally {
        pasteInProgressRef.current = false;
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [canPasteAttachment, ticketId]);

  function selectTabFromKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TICKET_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TICKET_TABS.length) % TICKET_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TICKET_TABS.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = TICKET_TABS[nextIndex];

    if (!nextTab) {
      return;
    }

    setActiveTab(nextTab.id);
    document.getElementById(`ticket-tab-${nextTab.id}`)?.focus();
  }

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
              <div aria-label="Seções do atendimento" className={styles.tabs} role="tablist">
                {TICKET_TABS.map((tab, index) => {
                  const selected = activeTab === tab.id;

                  return (
                    <button
                      aria-controls={`ticket-panel-${tab.id}`}
                      aria-selected={selected}
                      className={`${styles.tab} ${selected ? styles.activeTab : ''}`}
                      id={`ticket-tab-${tab.id}`}
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(event) => selectTabFromKeyboard(event, index)}
                      role="tab"
                      tabIndex={selected ? 0 : -1}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div
                aria-labelledby="ticket-tab-overview"
                className={activeTab === 'overview' ? styles.tabPanel : 'hidden'}
                hidden={activeTab !== 'overview'}
                id="ticket-panel-overview"
                role="tabpanel"
              >
                <section
                  aria-labelledby="ticket-overview-title"
                  className={styles.overview}
                >
                  <div className={styles.overviewHeader}>
                    <div>
                      <span className={styles.overviewEyebrow}>Visão geral</span>
                      <h2
                        className={styles.overviewTitle}
                        id="ticket-overview-title"
                      >
                        {text(ticket.client.tradeName || ticket.client.legalName)}
                      </h2>
                      <div className={styles.overviewSubtitle}>
                        {ticketSubject(ticket)}
                      </div>
                    </div>
                    <div className={styles.overviewStatus}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      {ticket.statusLabel}
                    </div>
                  </div>

                  <div className={styles.overviewGrid}>
                    <div className={styles.overviewFact}>
                      <span>Técnico responsável</span>
                      <strong title={text(ticket.technician.name)}>
                        {text(ticket.technician.name)}
                      </strong>
                    </div>
                    <div className={styles.overviewFact}>
                      <span>Solicitante</span>
                      <strong title={text(ticket.requester.name)}>
                        {text(ticket.requester.name)}
                      </strong>
                    </div>
                    <div className={styles.overviewFact}>
                      <span>Prioridade</span>
                      <strong>{ticket.priority.label}</strong>
                    </div>
                    <div className={styles.overviewFact}>
                      <span>Aberto em</span>
                      <strong>{formatDate(ticket.openedAt)}</strong>
                    </div>
                  </div>
                </section>
              </div>

              <div
                aria-labelledby="ticket-tab-details"
                className={activeTab === 'details' ? styles.tabPanel : 'hidden'}
                hidden={activeTab !== 'details'}
                id="ticket-panel-details"
                role="tabpanel"
              >
                <section className={styles.card} id="ticket-details">
                <div className={styles.cardHeader}>
                  <h2>Detalhes do atendimento</h2>
                  <span>Dados operacionais e classificação</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.facts}>
                    <div>
                      <span>Fechamento</span>
                      <strong>{formatDate(ticket.closedAt)}</strong>
                    </div>
                    <div>
                      <span>Forma</span>
                      <strong>{ticket.form.label}</strong>
                    </div>
                    <div>
                      <span>Nome da máquina</span>
                      <strong>{text(ticket.machineName)}</strong>
                    </div>
                    <div>
                      <span>Nível</span>
                      <strong>{ticket.level.label}</strong>
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

                  <div className={styles.subsection}>
                    <h3>Classificação</h3>
                    <dl className={styles.classificationList}>
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
                </div>
              </section>

              <TicketClassificationEditor
                currentUser={currentUser}
                onUpdated={setTicket}
                ticket={ticket}
              />
              </div>

              <div
                aria-labelledby="ticket-tab-attachments"
                className={activeTab === 'attachments' ? styles.tabPanel : 'hidden'}
                hidden={activeTab !== 'attachments'}
                id="ticket-panel-attachments"
                role="tabpanel"
              >
                <TicketAttachmentsPanel
                  currentUser={currentUser}
                  onUpdated={setTicket}
                  refreshToken={attachmentRefreshToken}
                  ticket={ticket}
                />
              </div>

              <div
                aria-labelledby="ticket-tab-context"
                className={activeTab === 'context' ? styles.tabPanel : 'hidden'}
                hidden={activeTab !== 'context'}
                id="ticket-panel-context"
                role="tabpanel"
              >
                <section className={styles.card} id="ticket-context">
                <div className={styles.cardHeader}>
                  <h2>Contexto do atendimento</h2>
                  <span>Cliente, contato e local</span>
                </div>
                <div className={styles.contextGrid}>
                  <div className={styles.contextGroup}>
                    <h3>Cliente</h3>
                    <dl className={styles.contextList}>
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
                  </div>

                  <div className={styles.contextGroup}>
                    <h3>Solicitante</h3>
                    <dl className={styles.contextList}>
                      <div>
                        <dt>Nome</dt>
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

                  <div className={styles.contextGroup}>
                    <h3>Local</h3>
                    <dl className={styles.contextList}>
                      <div>
                        <dt>Unidade</dt>
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
                </div>
              </section>
              </div>

              <div
                aria-labelledby="ticket-tab-catalog"
                className={activeTab === 'catalog' ? styles.tabPanel : 'hidden'}
                hidden={activeTab !== 'catalog'}
                id="ticket-panel-catalog"
                role="tabpanel"
              >
                <TicketCatalogPanel
                  clientId={ticket.client.id}
                  currentUser={currentUser}
                />
              </div>

              <section
                aria-labelledby="ticket-actions-title"
                className={styles.actionSection}
              >
                <div className={styles.sectionIntro}>
                  <h2 id="ticket-actions-title">Ações do atendimento</h2>
                  <p>
                    As opções disponíveis respeitam o status e seu nível de acesso.
                  </p>
                </div>
                <div className={styles.actionGrid}>
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
                </div>
              </section>
            </div>

            <aside
              aria-labelledby="ticket-history-title"
              className={styles.timelineCard}
            >
              <div className={styles.cardHeader}>
                <h2 id="ticket-history-title">Histórico</h2>
                <div className={styles.timelineHeaderActions}>
                  <span className={styles.timelineCount}>
                    {ticket.interactions.length}{' '}
                    {ticket.interactions.length === 1 ? 'registro' : 'registros'}
                  </span>
                  <button
                    aria-controls="ticket-interaction-form"
                    aria-expanded={interactionOpen}
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
                  id="ticket-interaction-form"
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
                    <article
                      className={styles.timelineItem}
                      key={interaction.id}
                    >
                      <div className={styles.timelineMarker} aria-hidden="true" />
                      <div>
                        <div className={styles.timelineMeta}>
                          <strong>{interactionTitle(interaction)}</strong>
                          <time dateTime={interaction.occurredAt ?? undefined}>
                            {formatDate(interaction.occurredAt)}
                          </time>
                        </div>
                        <small>{interaction.user.name}</small>
                        <p>{timelineText(interaction.description)}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </aside>

            {pasteFeedback ? (
              <div
                aria-live="polite"
                className={`${styles.pasteToast} ${
                  pasteFeedback.tone === 'success'
                    ? styles.pasteToastSuccess
                    : pasteFeedback.tone === 'error'
                      ? styles.pasteToastError
                      : ''
                }`}
                role={pasteFeedback.tone === 'error' ? 'alert' : 'status'}
              >
                {pasteFeedback.tone === 'loading' ? (
                  <span className={styles.pasteSpinner} aria-hidden="true" />
                ) : null}
                <span className={styles.pasteMessage}>
                  {pasteFeedback.message}
                </span>
                {pasteFeedback.tone === 'success' ? (
                  <button
                    onClick={() => {
                      setActiveTab('attachments');
                      setPasteFeedback(null);
                    }}
                    type="button"
                  >
                    Ver anexos
                  </button>
                ) : pasteFeedback.tone === 'error' ? (
                  <button onClick={() => setPasteFeedback(null)} type="button">
                    Fechar
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
