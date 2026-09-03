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
import styles from './vehicle-agenda-screen.module.css';

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
}: {
  currentUser: CurrentUserResponse;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [agenda, setAgenda] = useState<Awaited<ReturnType<typeof getVehicleAgenda>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState<VehicleAgendaSchedule | null>(null);
  const [creating, setCreating] = useState<CreateVehicleAgendaScheduleRequest | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showVehicles, setShowVehicles] = useState(false);

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
