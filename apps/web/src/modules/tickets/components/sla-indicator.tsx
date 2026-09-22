import type {
  TicketListClerioSla,
  TicketListQualitySla,
} from '@helpdesk/contracts';

function formatSlaTime(seconds: number): string {
  const overdue = seconds < 0;
  const absolute = Math.max(0, Math.abs(seconds));
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const parts = [
    hours > 0 ? `${hours}h` : '',
    `${minutes}min`,
  ].filter(Boolean);

  return overdue
    ? `Estourado há ${parts.join(' ')}`
    : `${parts.join(' ')} restantes`;
}

function Bell({
  blinking,
  paused,
}: {
  blinking: boolean;
  paused: boolean;
}) {
  return (
    <span
      className={[
        'relative inline-flex size-6 shrink-0 items-center justify-center rounded-lg',
        paused
          ? 'text-slate-400 dark:text-slate-500'
          : 'text-slate-950 dark:text-slate-100',
        blinking ? 'motion-safe:animate-pulse' : '',
      ].join(' ')}
      aria-label={
        paused
          ? 'SLA Clerio pausado visualmente durante a espera'
          : blinking
            ? 'SLA Clerio estourado'
            : 'SLA Clerio dentro do prazo'
      }
    >
      <svg
        aria-hidden="true"
        className="size-4 fill-current"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path d="M12 22a2.45 2.45 0 0 0 2.4-2h-4.8A2.45 2.45 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5-6.71V3a2 2 0 1 0-4 0v1.29A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
      </svg>
    </span>
  );
}

export function TicketSlaIndicators({
  quality,
  clerio,
  inactiveLabel,
}: {
  quality: TicketListQualitySla;
  clerio: TicketListClerioSla;
  inactiveLabel?: string;
}) {
  if (inactiveLabel) {
    return (
      <div className="grid gap-1 whitespace-nowrap text-[11px] text-app-subtle">
        <span>Qualidade · {inactiveLabel}</span>
        <span className="inline-flex items-center gap-1.5">
          <Bell blinking={false} paused />
          Clerio · {inactiveLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5 whitespace-nowrap">
      <div className="flex items-center gap-2">
        <span
          className={[
            'inline-flex min-w-[24px] items-center justify-center rounded-md px-1.5 py-1 text-[9px] font-black uppercase',
            quality.breached
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
          ].join(' ')}
          title={
            quality.lastInteractionAt
              ? `Última interação: ${quality.lastInteractionAt}`
              : 'Sem interação registrada'
          }
        >
          Q
        </span>
        <span className="grid leading-tight">
          <strong
            className={
              quality.breached
                ? 'text-[11px] text-red-700 dark:text-red-300'
                : 'text-[11px] text-app-text'
            }
          >
            Qualidade
          </strong>
          <small className="text-[10px] text-app-muted">
            {formatSlaTime(quality.remainingSeconds)}
          </small>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Bell blinking={clerio.breached && !clerio.paused} paused={clerio.paused} />
        <span className="grid leading-tight">
          <strong className="text-[11px] text-app-text">Clerio</strong>
          <small className="text-[10px] text-app-muted">
            {clerio.paused
              ? 'Em espera · alerta suspenso'
              : formatSlaTime(clerio.remainingSeconds)}
          </small>
        </span>
      </div>
    </div>
  );
}

// Export legado temporário para não quebrar imports externos durante a transição.
export function SlaIndicator({ bellOrder }: { bellOrder: number }) {
  return <Bell blinking={bellOrder === 0} paused={false} />;
}
