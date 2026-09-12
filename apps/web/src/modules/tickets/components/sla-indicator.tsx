import styles from './sla-indicator.module.css';

const SLA_STATES = {
  0: {
    className: styles.critical,
    label: 'SLA em estado crítico',
  },
  1: {
    className: styles.alert,
    label: 'SLA em alerta',
  },
  2: {
    className: styles.attention,
    label: 'SLA requer atenção',
  },
  3: {
    className: styles.ok,
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
      className={`${styles.indicator} ${state.className}`}
      title={state.label}
    >
      <svg
        aria-hidden="true"
        className={styles.icon}
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span aria-hidden="true" className={styles.mark}>
        !
      </span>
    </span>
  );
}
