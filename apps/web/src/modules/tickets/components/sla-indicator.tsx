import type { TicketListClerioSla } from '@helpdesk/contracts';

function AlertBell({
  blinking,
  paused,
}: {
  blinking: boolean;
  paused: boolean;
}) {
  return (
    <span
      className="relative inline-flex size-9 shrink-0 items-center justify-center"
      aria-label={
        paused
          ? 'Alerta de tempo estourado; animação suspensa durante a espera'
          : 'Alerta de tempo estourado'
      }
      title={
        paused
          ? 'Tempo estourado · alerta suspenso durante a espera'
          : 'Tempo estourado'
      }
    >
      {blinking ? (
        <span
          aria-hidden="true"
          className="absolute inset-1 rounded-full bg-slate-950/20 motion-safe:animate-ping dark:bg-slate-100/25"
        />
      ) : null}

      <span
        aria-hidden="true"
        className={[
          'relative z-[1] inline-flex size-8 items-center justify-center rounded-full',
          'bg-slate-950/10 text-slate-950 ring-2 ring-slate-950/25',
          'shadow-[0_0_0_3px_rgba(15,23,42,0.08)]',
          'dark:bg-slate-100/10 dark:text-slate-100 dark:ring-slate-100/30',
          blinking ? 'motion-safe:animate-pulse' : '',
          paused ? 'opacity-80' : '',
        ].join(' ')}
      >
        <svg
          className="size-5 fill-current"
          focusable="false"
          viewBox="0 0 24 24"
        >
          <path d="M12 22a2.45 2.45 0 0 0 2.4-2h-4.8A2.45 2.45 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5-6.71V3a2 2 0 1 0-4 0v1.29A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
        </svg>

        {blinking ? (
          <span className="absolute -right-1 -top-1 inline-flex size-3.5 items-center justify-center rounded-full bg-slate-950 text-[9px] font-black leading-none text-white ring-2 ring-app-surface dark:bg-slate-100 dark:text-slate-950">
            !
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function TicketSlaIndicators({
  clerio,
}: {
  clerio: TicketListClerioSla;
}) {
  if (!clerio.breached) {
    return <span className="sr-only">Sem alerta de tempo</span>;
  }

  return (
    <div className="flex min-w-10 items-center justify-center">
      <AlertBell
        blinking={!clerio.paused}
        paused={clerio.paused}
      />
    </div>
  );
}

// Export legado temporário para não quebrar imports externos durante a transição.
export function SlaIndicator({ bellOrder }: { bellOrder: number }) {
  if (bellOrder !== 0) return null;
  return <AlertBell blinking paused={false} />;
}
