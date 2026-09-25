export const authFormStyles = {
  page:
    'grid min-h-screen place-items-center bg-app-bg p-6 [background-image:radial-gradient(circle_at_20%_15%,var(--app-brand-ring),transparent_34%)]',
  card:
    'w-full max-w-[430px] rounded-2xl border border-app-border bg-app-surface p-8 shadow-[var(--app-shadow-lg)]',
  brand: 'mb-6',
  brandEyebrow:
    'text-xs font-extrabold uppercase tracking-[0.1em] text-app-brand',
  brandTitle: 'mt-2 block text-3xl font-bold text-app-text',
  brandDescription: 'mt-2 text-sm leading-6 text-app-muted-strong',
  form: 'grid gap-4',
  field: 'grid gap-1.5',
  fieldLabel: 'text-xs font-extrabold text-app-muted',
  input:
    'min-h-11 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-60',
  button:
    'min-h-11 rounded-lg border border-app-brand bg-app-brand px-4 font-extrabold text-white transition hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-60',
  error:
    'rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-2.5 text-[13px] text-app-danger',
  success:
    'rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  backLink:
    'mt-4 inline-block text-[13px] font-bold text-app-brand hover:text-app-brand-hover hover:underline',
} as const;
