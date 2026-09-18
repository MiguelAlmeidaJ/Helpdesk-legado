"use client";

import type {
  CreateVehicleAgendaScheduleRequest,
  CurrentUserResponse,
  UpdateVehicleAgendaScheduleRequest,
  VehicleAgendaSchedule,
  VehicleAgendaVehicle,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  createVehicleAgendaSchedule,
  createVehicleAgendaVehicle,
  deleteVehicleAgendaSchedule,
  deleteVehicleAgendaVehicle,
  duplicateVehicleAgendaSchedule,
  getVehicleAgenda,
  moveVehicleAgendaSchedule,
  undoVehicleAgendaChange,
  updateVehicleAgendaSchedule,
  updateVehicleAgendaVehicle,
} from '../api/vehicle-agenda-api';
const styles = {
  page:
    'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-30 flex min-h-[58px] items-center justify-between gap-[18px] border-b border-app-border bg-[var(--app-header-bg)] px-6 backdrop-blur-xl max-[800px]:px-3 print:hidden',
  headerLeft:
    'flex items-center gap-3',
  brand:
    'grid text-inherit no-underline [&_strong]:text-[15px] [&_span]:text-[10px] [&_span]:text-app-subtle',
  content:
    'mx-auto w-[min(1700px,calc(100%-24px))] py-[18px] pb-[42px] print:w-full print:p-0',
  toolbar:
    'mb-3 flex items-end justify-between gap-3.5 rounded-[11px] border border-app-border bg-app-surface px-4 py-3.5 max-[800px]:flex-col max-[800px]:items-stretch print:border-0 print:px-0 print:pb-2 print:pt-0 [&_h1]:mt-0.5 [&_h1]:mb-0 [&_h1]:text-[22px]',
  eyebrow:
    'text-[8px] font-black uppercase tracking-[0.08em] text-app-muted',
  filters:
    'flex flex-wrap gap-[7px] print:hidden [&_select]:min-h-8 [&_select]:rounded-[7px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-[9px] [&_select]:text-app-text-soft [&_select]:outline-none [&_input]:min-h-8 [&_input]:rounded-[7px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-[9px] [&_input]:text-app-text-soft [&_input]:outline-none [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:text-app-text-soft [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_select:focus]:border-app-brand [&_input:focus]:border-app-brand [&_select:focus]:ring-[3px] [&_input:focus]:ring-[3px] [&_select:focus]:ring-[var(--app-brand-ring)] [&_input:focus]:ring-[var(--app-brand-ring)]',
  feedback:
    'mb-2.5 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-[11px] print:hidden',
  tableWrap:
    'max-h-[calc(100vh-170px)] overflow-auto rounded-[10px] border border-app-border bg-app-surface print:max-h-none print:overflow-visible print:border-0',
  agenda:
    'w-max min-w-full border-separate border-spacing-0 text-[10px] print:w-full print:text-[7px] [&_th]:w-[185px] [&_th]:min-w-[185px] [&_th]:border-b [&_th]:border-r [&_th]:border-app-border-soft [&_th]:p-1.5 [&_th]:align-top [&_td]:w-[185px] [&_td]:min-w-[185px] [&_td]:border-b [&_td]:border-r [&_td]:border-app-border-soft [&_td]:p-1.5 [&_td]:align-top print:[&_th]:w-auto print:[&_th]:min-w-0 print:[&_th]:p-0.5 print:[&_td]:w-auto print:[&_td]:min-w-0 print:[&_td]:p-0.5 [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[5] [&_thead_th]:bg-app-surface-muted print:[&_thead_th]:static [&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-[4] [&_tr>*:first-child]:w-[72px] [&_tr>*:first-child]:min-w-[72px] [&_tr>*:first-child]:bg-app-bg [&_tr>*:first-child]:text-center print:[&_tr>*:first-child]:static print:[&_tr>*:first-child]:w-auto print:[&_tr>*:first-child]:min-w-0 [&_thead_tr>*:first-child]:z-[6] [&_th_small]:block [&_th_small]:font-normal [&_th_small]:text-app-subtle',
  weekend:
    'bg-slate-300! dark:bg-slate-700!',
  schedule:
    'mb-[5px] grid gap-[3px] rounded-[7px] border border-slate-500/20 bg-white/[0.86] p-[7px] shadow-sm dark:bg-slate-900/80 [&_strong]:text-[9px] [&_span]:text-[8px] [&_span]:text-slate-700 dark:[&_span]:text-slate-200 [&_small]:text-[8px] [&_small]:text-slate-700 dark:[&_small]:text-slate-200',
  rowActions:
    'mt-1 flex gap-1 print:hidden [&_button]:min-h-[25px] [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-1.5 [&_button]:text-[8px] [&_button]:text-app-text-soft [&_button]:transition [&_button:hover]:bg-app-surface-hover',
  cellActions:
    'mt-1 flex justify-end gap-1 print:hidden [&_button]:min-h-[25px] [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-1.5 [&_button]:text-[8px] [&_button]:text-app-text-soft [&_button]:transition [&_button:hover]:bg-app-surface-hover',
  modalBackdrop:
    'fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-[18px]',
  modal:
    'max-h-[calc(100vh-36px)] w-[min(860px,100%)] overflow-auto rounded-xl border border-app-border bg-app-surface shadow-2xl [&>header]:flex [&>header]:items-center [&>header]:justify-between [&>header]:gap-3 [&>header]:border-b [&>header]:border-app-border-soft [&>header]:px-3.5 [&>header]:py-3 [&>header_h2]:m-0 [&>header_h2]:text-[15px] [&>footer]:flex [&>footer]:items-center [&>footer]:justify-between [&>footer]:gap-3 [&>footer]:border-t [&>footer]:border-app-border-soft [&>footer]:px-3.5 [&>footer]:py-3 [&>footer>div]:flex [&>footer>div]:gap-[7px] [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:text-app-text-soft [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_input]:min-h-8 [&_input]:rounded-[7px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:text-app-text-soft [&_select]:min-h-8 [&_select]:rounded-[7px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:text-app-text-soft [&_textarea]:min-h-8 [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:text-app-text-soft',
  formGrid:
    'grid grid-cols-3 gap-[11px] p-3.5 max-[800px]:grid-cols-1 [&_label]:grid [&_label]:gap-1 [&_label]:text-[9px] [&_label]:font-extrabold [&_label]:text-app-muted [&_input]:w-full [&_input]:px-2 [&_input]:py-1.5 [&_select]:w-full [&_select]:px-2 [&_select]:py-1.5 [&_textarea]:w-full [&_textarea]:px-2 [&_textarea]:py-1.5 [&_input:focus]:border-app-brand [&_select:focus]:border-app-brand [&_textarea:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_select:focus]:ring-[3px] [&_textarea:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:ring-[var(--app-brand-ring)] [&_textarea:focus]:ring-[var(--app-brand-ring)]',
  notes:
    'col-span-2 max-[800px]:col-auto',
  checkbox:
    'flex! items-center gap-[7px]! [&_input]:w-auto',
  primary:
    'border-app-brand! bg-app-brand! text-white! hover:opacity-90',
  danger:
    'border-red-500! text-red-700! dark:border-red-700! dark:text-red-300!',
  vehicleList:
    'grid gap-0 px-3.5 py-2 [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-3 [&>div]:border-b [&>div]:border-app-border-soft [&>div]:py-2 [&>div]:text-[10px] [&>div>div]:flex [&>div>div]:gap-[5px]',
  vehicleForm:
    'grid grid-cols-[1fr_160px_auto_auto] items-center gap-2 border-t border-app-border-soft p-3.5 max-[800px]:grid-cols-1 [&_label]:grid [&_label]:gap-1 [&_label]:text-[9px] [&_label]:font-extrabold [&_label]:text-app-muted [&_input]:w-full [&_input]:px-2 [&_input]:py-1.5 [&_input:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)]',
} as const;

const COLORS: Record<number, string> = {
  1: '#87CEEB',
  2: '#e7f5e5',
  3: '#00FF00',
  4: '#008000',
  5: '#FFFF00',
  6: '#FFD700',
  7: '#FFA500',
  8: '#FF0000',
  9: '#800000',
  10: '#FFC0CB',
  11: '#800080',
  12: '#4B0082',
  13: '#000080',
  14: '#00FFFF',
  15: '#008080',
  16: '#C0C0C0',
  17: '#808080',
  18: '#000000',
};

const TIMES = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

function daysInMonth(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
}

function errorMessage(reason: unknown): string {
  if (
    reason &&
    typeof reason === 'object' &&
    'body' in reason &&
    reason.body &&
    typeof reason.body === 'object' &&
    'message' in reason.body
  ) {
    const message = (reason.body as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  return 'Não foi possível concluir a operação.';
}

const emptySchedule = (
  date: string,
  vehicleId: number,
): CreateVehicleAgendaScheduleRequest => ({
  vehicleId,
  date,
  clientId: 0,
  destination: '',
  time: '08:00',
  driverId: 0,
  notes: '',
  initialKm: null,
  finalKm: null,
  visibility: 0,
  color: 1,
});

export function VehicleAgendaScreen({
  currentUser,
  initialMonth,
  initialYear,
  autoPrint = false,
}: {
  currentUser: CurrentUserResponse;
  initialMonth?: number;
  initialYear?: number;
  autoPrint?: boolean;
}) {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [agenda, setAgenda] = useState<Awaited<ReturnType<typeof getVehicleAgenda>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState<VehicleAgendaSchedule | null>(null);
  const [creating, setCreating] = useState<CreateVehicleAgendaScheduleRequest | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showVehicles, setShowVehicles] = useState(false);
  const [printTriggered, setPrintTriggered] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFeedback('');
      setAgenda(await getVehicleAgenda(month, year));
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoPrint || !agenda || loading || printTriggered) return;

    setPrintTriggered(true);
    window.requestAnimationFrame(() => window.print());
  }, [agenda, autoPrint, loading, printTriggered]);

  const days = useMemo(() => daysInMonth(year, month), [year, month]);
  const schedules = useMemo(() => {
    const map = new Map<string, VehicleAgendaSchedule[]>();
    for (const schedule of agenda?.schedules ?? []) {
      const key = `${schedule.date}:${schedule.vehicleId}`;
      const list = map.get(key) ?? [];
      list.push(schedule);
      map.set(key, list);
    }
    return map;
  }, [agenda]);

  async function run(operation: () => Promise<void>, success: string) {
    try {
      setFeedback('');
      await operation();
      setFeedback(success);
      await load();
    } catch (reason) {
      setFeedback(errorMessage(reason));
    }
  }

  async function drop(
    event: React.DragEvent<HTMLTableCellElement>,
    vehicleId: number,
    date: string,
  ) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData('text/plain'));
    if (!Number.isSafeInteger(id) || id < 1) return;
    await run(
      () => moveVehicleAgendaSchedule(id, { vehicleId, date }),
      'Agendamento movimentado.',
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Logística · Agenda de Veículos</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.toolbar}>
          <div>
            <span className={styles.eyebrow}>Logística</span>
            <h1>Agenda de Veículos</h1>
          </div>

          <div className={styles.filters}>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
                    new Date(2026, index, 1),
                  )}
                </option>
              ))}
            </select>
            <input
              min={2000}
              max={2100}
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
            <button onClick={() => window.print()} type="button">Imprimir</button>
            {agenda?.canManage ? (
              <>
                <button
                  disabled={!agenda.canUndo}
                  onClick={() =>
                    void run(undoVehicleAgendaChange, 'Última alteração desfeita.')
                  }
                  type="button"
                >
                  Desfazer
                </button>
                <button onClick={() => setShowVehicles(true)} type="button">
                  Veículos
                </button>
              </>
            ) : null}
          </div>
        </section>

        {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
        {loading && !agenda ? <div className={styles.feedback}>Carregando…</div> : null}

        {agenda ? (
          <div className={styles.tableWrap}>
            <table className={styles.agenda}>
              <thead>
                <tr>
                  <th>Data</th>
                  {agenda.vehicles.map((vehicle) => (
                    <th key={vehicle.id}>
                      {vehicle.name}
                      <small>{vehicle.plate}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((date) => {
                  const dateObject = new Date(`${date}T12:00:00`);
                  const weekend = [0, 6].includes(dateObject.getDay());
                  return (
                    <tr key={date}>
                      <th className={weekend ? styles.weekend : ''}>
                        {date.slice(8, 10)}/{date.slice(5, 7)}
                        <small>
                          {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dateObject)}
                        </small>
                      </th>
                      {agenda.vehicles.map((vehicle) => {
                        const entries = schedules.get(`${date}:${vehicle.id}`) ?? [];
                        const color = entries[0] ? COLORS[entries[0].color] : undefined;
                        return (
                          <td
                            key={vehicle.id}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => void drop(event, vehicle.id, date)}
                            style={{ backgroundColor: color }}
                          >
                            {entries.map((schedule) => (
                              <article
                                className={styles.schedule}
                                draggable={agenda.canManage && !schedule.archived}
                                key={schedule.id}
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('text/plain', String(schedule.id));
                                }}
                              >
                                <strong>{schedule.clientName} · {schedule.destination}</strong>
                                <span>{schedule.time} · {schedule.driverName}</span>
                                {schedule.notes ? <span>OBS: {schedule.notes}</span> : null}
                                <small>Por: {schedule.createdByName}</small>
                                {schedule.archived ? (
                                  <small>
                                    Arquivado · KM rodado:{' '}
                                    {(schedule.finalKm ?? 0) - (schedule.initialKm ?? 0)}
                                  </small>
                                ) : null}
                                {agenda.canManage && !schedule.archived ? (
                                  <div className={styles.rowActions}>
                                    <button onClick={() => setCopiedId(schedule.id)} type="button">
                                      Copiar
                                    </button>
                                    <button onClick={() => setEditing(schedule)} type="button">
                                      Editar
                                    </button>
                                  </div>
                                ) : null}
                              </article>
                            ))}

                            {agenda.canManage ? (
                              <div className={styles.cellActions}>
                                <button
                                  onClick={() => setCreating(emptySchedule(date, vehicle.id))}
                                  type="button"
                                >
                                  + Novo
                                </button>
                                {copiedId ? (
                                  <button
                                    onClick={() =>
                                      void run(
                                        () =>
                                          duplicateVehicleAgendaSchedule(copiedId, {
                                            vehicleId: vehicle.id,
                                            date,
                                          }),
                                        'Agendamento copiado.',
                                      )
                                    }
                                    type="button"
                                  >
                                    Colar
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {agenda && creating ? (
        <ScheduleDialog
          agenda={agenda}
          initial={creating}
          onClose={() => setCreating(null)}
          onSubmit={(request) =>
            run(
              () => createVehicleAgendaSchedule(request),
              'Agendamento criado.',
            ).then(() => setCreating(null))
          }
        />
      ) : null}

      {agenda && editing ? (
        <ScheduleDialog
          agenda={agenda}
          initial={{
            vehicleId: editing.vehicleId,
            date: editing.date,
            clientId: editing.clientId ?? 0,
            destination: editing.destination,
            time: editing.time,
            driverId: editing.driverId ?? 0,
            notes: editing.notes,
            initialKm: editing.initialKm,
            finalKm: editing.finalKm,
            visibility: editing.visibility,
            color: editing.color,
            archived: editing.archived,
          }}
          editing
          onClose={() => setEditing(null)}
          onDelete={() =>
            run(
              () => deleteVehicleAgendaSchedule(editing.id),
              'Agendamento excluído.',
            ).then(() => setEditing(null))
          }
          onSubmit={(request) =>
            run(
              () =>
                updateVehicleAgendaSchedule(
                  editing.id,
                  request as UpdateVehicleAgendaScheduleRequest,
                ),
              'Agendamento atualizado.',
            ).then(() => setEditing(null))
          }
        />
      ) : null}

      {agenda && showVehicles ? (
        <VehicleDialog
          vehicles={agenda.vehicleCatalog}
          onClose={() => setShowVehicles(false)}
          onRefresh={load}
          setFeedback={setFeedback}
        />
      ) : null}
    </main>
  );
}

function ScheduleDialog({
  agenda,
  initial,
  editing = false,
  onClose,
  onDelete,
  onSubmit,
}: {
  agenda: NonNullable<Awaited<ReturnType<typeof getVehicleAgenda>>>;
  initial: CreateVehicleAgendaScheduleRequest | UpdateVehicleAgendaScheduleRequest;
  editing?: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (
    request: CreateVehicleAgendaScheduleRequest | UpdateVehicleAgendaScheduleRequest,
  ) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);

  function numberValue(value: string): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return (
    <div className={styles.modalBackdrop}>
      <form
        className={styles.modal}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void onSubmit(
            editing
              ? { ...value, archived: 'archived' in value ? value.archived : false }
              : value,
          );
        }}
      >
        <header>
          <h2>{editing ? 'Editar agendamento' : 'Novo agendamento'}</h2>
          <button onClick={onClose} type="button">×</button>
        </header>

        <div className={styles.formGrid}>
          <label>
            Veículo
            <select
              required
              value={value.vehicleId}
              onChange={(event) => setValue({ ...value, vehicleId: Number(event.target.value) })}
            >
              {agenda.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} · {vehicle.plate}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input
              required
              type="date"
              value={value.date}
              onChange={(event) => setValue({ ...value, date: event.target.value })}
            />
          </label>
          <label>
            Horário
            <select
              required
              value={value.time}
              onChange={(event) => setValue({ ...value, time: event.target.value })}
            >
              {TIMES.map((time) => <option key={time}>{time}</option>)}
            </select>
          </label>
          <label>
            Cliente
            <select
              required
              value={value.clientId || ''}
              onChange={(event) => setValue({ ...value, clientId: Number(event.target.value) })}
            >
              <option value="">Selecione</option>
              {agenda.clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label>
            Destino
            <input
              required
              value={value.destination}
              onChange={(event) => setValue({ ...value, destination: event.target.value })}
            />
          </label>
          <label>
            Condutor
            <select
              required
              value={value.driverId || ''}
              onChange={(event) => setValue({ ...value, driverId: Number(event.target.value) })}
            >
              <option value="">Selecione</option>
              {agenda.drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </label>
          <label>
            KM inicial
            <input
              min="0"
              type="number"
              value={value.initialKm ?? ''}
              onChange={(event) => setValue({ ...value, initialKm: numberValue(event.target.value) })}
            />
          </label>
          <label>
            KM final
            <input
              min="0"
              type="number"
              value={value.finalKm ?? ''}
              onChange={(event) => setValue({ ...value, finalKm: numberValue(event.target.value) })}
            />
          </label>
          <label>
            Visibilidade
            <select
              value={value.visibility}
              onChange={(event) =>
                setValue({ ...value, visibility: Number(event.target.value) === 1 ? 1 : 0 })
              }
            >
              <option value={0}>Todos os usuários</option>
              <option value={1}>Apenas administradores</option>
            </select>
          </label>
          <label>
            Cor
            <select
              value={value.color}
              onChange={(event) => setValue({ ...value, color: Number(event.target.value) })}
            >
              {Object.keys(COLORS).map((color) => (
                <option key={color} value={color}>Cor {color}</option>
              ))}
            </select>
          </label>
          <label className={styles.notes}>
            Observações
            <textarea
              rows={3}
              value={value.notes ?? ''}
              onChange={(event) => setValue({ ...value, notes: event.target.value })}
            />
          </label>
          {editing ? (
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={'archived' in value && value.archived}
                onChange={(event) =>
                  setValue({
                    ...value,
                    archived: event.target.checked,
                  } as UpdateVehicleAgendaScheduleRequest)
                }
              />
              Arquivar
            </label>
          ) : null}
        </div>

        <footer>
          {editing && onDelete ? (
            <button className={styles.danger} onClick={onDelete} type="button">
              Excluir
            </button>
          ) : <span />}
          <div>
            <button onClick={onClose} type="button">Cancelar</button>
            <button className={styles.primary} type="submit">Salvar</button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function VehicleDialog({
  vehicles,
  onClose,
  onRefresh,
  setFeedback,
}: {
  vehicles: VehicleAgendaVehicle[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  setFeedback: (value: string) => void;
}) {
  const [editing, setEditing] = useState<VehicleAgendaVehicle | null>(null);
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [active, setActive] = useState(true);

  function reset(vehicle?: VehicleAgendaVehicle) {
    setEditing(vehicle ?? null);
    setName(vehicle?.name ?? '');
    setPlate(vehicle?.plate ?? '');
    setActive(vehicle?.active ?? true);
  }

  async function run(operation: () => Promise<void>, message: string) {
    try {
      await operation();
      setFeedback(message);
      reset();
      await onRefresh();
    } catch (reason) {
      setFeedback(errorMessage(reason));
    }
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <header>
          <h2>Veículos</h2>
          <button onClick={onClose} type="button">×</button>
        </header>
        <div className={styles.vehicleList}>
          {vehicles.map((vehicle) => (
            <div key={vehicle.id}>
              <span>
                <strong>{vehicle.name}</strong> · {vehicle.plate}{' '}
                {!vehicle.active ? '(inativo)' : ''}
              </span>
              <div>
                <button onClick={() => reset(vehicle)} type="button">Editar</button>
                <button
                  className={styles.danger}
                  onClick={() =>
                    void run(
                      () => deleteVehicleAgendaVehicle(vehicle.id),
                      'Veículo excluído.',
                    )
                  }
                  type="button"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
        <form
          className={styles.vehicleForm}
          onSubmit={(event) => {
            event.preventDefault();
            const request = { name, plate, active };
            void run(
              () =>
                editing
                  ? updateVehicleAgendaVehicle(editing.id, request)
                  : createVehicleAgendaVehicle(request),
              editing ? 'Veículo atualizado.' : 'Veículo criado.',
            );
          }}
        >
          <input required placeholder="Veículo" value={name} onChange={(event) => setName(event.target.value)} />
          <input required placeholder="Placa" value={plate} onChange={(event) => setPlate(event.target.value)} />
          <label className={styles.checkbox}>
            <input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />
            Ativo
          </label>
          <button className={styles.primary} type="submit">
            {editing ? 'Salvar veículo' : 'Adicionar veículo'}
          </button>
        </form>
      </div>
    </div>
  );
}
