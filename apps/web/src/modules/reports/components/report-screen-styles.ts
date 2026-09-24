export const reportScreenStyles = {
  page: 'min-h-screen bg-app-bg text-app-text print:bg-white print:text-black',
  header:
    'sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-7 py-3 backdrop-blur-xl max-[820px]:px-4 print:hidden',
  headerLeft: 'flex items-center gap-3.5',
  brand:
    'flex flex-col text-inherit no-underline [&_strong]:text-base [&_span]:text-[0.78rem] [&_span]:text-app-muted-strong max-[520px]:[&_span]:hidden',
  content:
    'mx-auto w-[calc(100%_-_32px)] max-w-[1180px] pt-8 pb-14 max-[820px]:w-[calc(100%_-_22px)] max-[820px]:pt-[22px] print:w-full print:max-w-none print:p-0',
  hero:
    'mb-[22px] flex items-end justify-between gap-6 max-[820px]:flex-col max-[820px]:items-stretch print:block [&_h1]:mt-1 [&_h1]:mb-2 [&_h1]:text-[clamp(1.8rem,4vw,2.6rem)] [&_h1]:leading-[1.05] print:[&_h1]:text-[20pt] [&_p]:m-0 [&_p]:max-w-[720px] [&_p]:leading-[1.55] [&_p]:text-app-muted-strong',
  eyebrow:
    'text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-app-brand',
  filters:
    'grid grid-cols-[minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(340px,1.5fr)_auto] items-end gap-3.5 rounded-2xl border border-app-border bg-app-surface p-[18px] shadow-[0_12px_30px_rgba(38,52,77,0.06)] max-[980px]:grid-cols-2 max-[560px]:grid-cols-1 dark:shadow-black/10 print:hidden [&_label]:grid [&_label]:gap-[7px] [&_label>span]:text-[0.78rem] [&_label>span]:font-bold [&_label>span]:text-app-muted [&_input]:min-h-[42px] [&_input]:w-full [&_input]:rounded-[10px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-3 [&_input]:text-app-text [&_input]:outline-none [&_input]:transition [&_input:focus]:border-app-brand [&_input:focus]:ring-3 [&_input:focus]:ring-[var(--app-brand-ring)]',
  clientPicker:
    'grid gap-2 max-[980px]:col-span-2 max-[560px]:col-span-1',
  clientPickerHeader:
    'flex items-center justify-between gap-3 text-[0.78rem] font-bold text-app-muted [&_strong]:text-app-text-soft',
  clientPickerBox:
    'overflow-hidden rounded-[10px] border border-app-border-strong bg-app-surface focus-within:border-app-brand focus-within:ring-3 focus-within:ring-[var(--app-brand-ring)]',
  clientSearch:
    'border-0 border-b border-app-border-soft !rounded-none focus:!ring-0 focus:!border-app-border-soft',
  clientPickerActions:
    'flex flex-wrap items-center justify-between gap-2 border-b border-app-border-soft bg-app-surface-muted px-2.5 py-2 [&_button]:rounded-md [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2 [&_button]:py-1 [&_button]:text-xs [&_button]:font-bold [&_button]:text-app-brand [&_button:hover]:bg-app-brand-soft [&_button:disabled]:opacity-40',
  clientList:
    'grid max-h-[178px] overflow-y-auto p-1.5',
  clientOption:
    'flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-app-text hover:bg-app-surface-hover [&_input]:!min-h-4 [&_input]:!h-4 [&_input]:!w-4 [&_input]:shrink-0 [&_input]:rounded [&_input]:p-0',
  clientEmpty:
    'px-3 py-5 text-center text-sm text-app-muted',
  actions:
    'flex gap-2 max-[980px]:col-span-2 max-[560px]:col-span-1 [&_button]:min-h-[42px] [&_button]:cursor-pointer [&_button]:rounded-[10px] [&_button]:border-0 [&_button]:bg-app-brand [&_button]:px-4 [&_button]:font-extrabold [&_button]:text-app-brand-contrast [&_button]:transition [&_button:hover]:bg-app-brand-hover max-[560px]:[&_button]:flex-1 [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-65',
  exportActions:
    'my-[18px] flex flex-wrap items-center gap-3 print:hidden [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-3.5 [&_button]:py-2.5 [&_button]:text-app-text [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-50 [&_span]:text-sm [&_span]:text-app-muted',
  error:
    'my-3.5 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-app-danger',
  reportCard:
    'mt-3 overflow-hidden rounded-[18px] border border-app-border bg-app-surface shadow-[0_14px_36px_rgba(38,52,77,0.07)] dark:shadow-black/10 print:overflow-visible print:border-0 print:shadow-none',
  tableWrap:
    'overflow-x-auto print:overflow-visible print:text-[9pt] [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-app-border [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:border-app-border [&_td]:p-3 [&_td]:text-left [&_thead]:bg-app-surface-muted',
  downloadIconButton:
    'inline-flex size-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface text-app-brand transition hover:border-app-brand hover:bg-app-brand-soft disabled:cursor-wait disabled:opacity-50 [&_svg]:size-5',
  row:
    'border-b border-app-border-soft px-5 py-[18px] last:border-b-0 print:break-inside-avoid print:px-0 print:py-3',
  rowHeader:
    'mb-[9px] flex items-center justify-between gap-4 [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap print:[&_strong]:whitespace-normal [&_span]:text-sm [&_span]:text-app-muted',
  details:
    'whitespace-pre-wrap leading-[1.6] [overflow-wrap:anywhere]',
  empty:
    'px-6 py-[54px] text-center text-app-muted-strong',
  printHeading: 'hidden print:block',
} as const;
