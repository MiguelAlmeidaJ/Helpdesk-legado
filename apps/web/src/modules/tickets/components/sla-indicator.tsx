const SLA_STATES = {
  0: {
    color: 'text-slate-900 dark:text-slate-100',
    soft: 'bg-slate-900/10 dark:bg-slate-100/10',
    ring: 'border-slate-700/50 dark:border-slate-200/50',
    mark: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
    label: 'SLA em estado crítico',
  },
  1: {
    color: 'text-red-600 dark:text-red-400',
    soft: 'bg-red-600/10 dark:bg-red-400/10',
    ring: 'border-red-500/50',
    mark: 'bg-red-600 text-white dark:bg-red-500',
    label: 'SLA em alerta',
  },
  2: {
    color: 'text-yellow-600 dark:text-yellow-400',
    soft: 'bg-yellow-500/10 dark:bg-yellow-400/10',
    ring: 'border-yellow-500/50',
    mark: 'bg-yellow-600 text-white dark:bg-yellow-500 dark:text-slate-950',
    label: 'SLA requer atenção',
  },
  3: {
    color: 'text-green-700 dark:text-green-400',
    soft: 'bg-green-600/10 dark:bg-green-400/10',
    ring: 'border-green-600/50 dark:border-green-400/50',
    mark: 'bg-green-700 text-white dark:bg-green-500 dark:text-slate-950',
    label: 'SLA dentro do prazo',
  },
} as const;

function resolveSlaState(bellOrder: number) {
  return SLA_STATES[bellOrder as keyof typeof SLA_STATES] ?? SLA_STATES[3];
}

export function SlaIndicator({ bellOrder }: { bellOrder: number }) {
  const state = resolveSlaState(bellOrder);

  return (
    <span
      aria-label={state.label}
      className={`relative mr-1.5 inline-flex size-6 items-center justify-center rounded-lg align-middle ${state.color}`}
      title={state.label}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0.5 rounded-lg ${state.soft}`}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-[9px] border opacity-40 motion-safe:animate-pulse ${state.ring}`}
      />
      <svg
        aria-hidden="true"
        className="relative z-[1] size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span
        aria-hidden="true"
        className={`absolute -right-[3px] -top-[3px] z-[2] inline-flex size-3 items-center justify-center rounded-full border-2 border-app-surface text-[8px] font-extrabold leading-none ${state.mark}`}
      >
        !
      </span>
    </span>
  );
}
