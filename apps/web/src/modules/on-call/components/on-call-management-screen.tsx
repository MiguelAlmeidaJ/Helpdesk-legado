"use client";

import type {
  CurrentUserResponse,
  OnCallArea,
  OnCallSnapshot,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { SearchSelect } from '../../../shared/ui/search-select';
import {
  createOnCallHoliday,
  deleteOnCallHoliday,
  fetchOnCallSnapshot,
  saveOnCallWeek,
  updateOnCallSettings,
} from '../api/on-call-api';

const BUTTON = appButtonClass('secondary');
const PRIMARY = appButtonClass('primary');
const DANGER = appButtonClass('danger', 'sm');
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

const REASON_LABEL = {
  'business-hours': 'Dentro do expediente',
  'after-hours': 'Fora do expediente',
  weekend: 'Fim de semana',
  holiday: 'Feriado',
} as const;

function message(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.body && typeof reason.body === 'object') {
      const value = (reason.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(' ');
    }
    return `A API respondeu com erro ${reason.status}.`;
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível concluir a operação.';
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function assignment(snapshot: OnCallSnapshot | null, area: OnCallArea) {
  return snapshot?.assignments.find((item) => item.area === area) ?? null;
}

export function OnCallManagementScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] = useState<OnCallSnapshot | null>(null);
  const [week, setWeek] = useState('');
  const [tiUserId, setTiUserId] = useState('');
  const [devopsUserId, setDevopsUserId] = useState('');
  const [businessStart, setBusinessStart] = useState('07:00');
  const [businessEnd, setBusinessEnd] = useState('19:00');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (selectedWeek?: string, signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchOnCallSnapshot(selectedWeek, signal);
      setData(response);
      setWeek(response.selectedWeekStart);
      setBusinessStart(response.settings.businessStart);
      setBusinessEnd(response.settings.businessEnd);
      setTiUserId(String(assignment(response, 'ti')?.userId ?? ''));
      setDevopsUserId(String(assignment(response, 'devops')?.userId ?? ''));
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(message(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(undefined, controller.signal);
    return () => controller.abort();
  }, [load]);

  const userOptions = useMemo(
    () =>
      (data?.users ?? []).map((user) => ({
        value: String(user.id),
        label: user.name,
      })),
    [data?.users],
  );

  async function changeWeek(next: string) {
    setWeek(next);
    await load(next);
  }

  async function submitWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tiUserId || !devopsUserId) {
      setError('Selecione os plantonistas de TI e DevOps.');
      return;
    }
    setSavingWeek(true);
    setError('');
    setSuccess('');
    try {
      await saveOnCallWeek({
        weekDate: week,
        tiUserId: Number(tiUserId),
        devopsUserId: Number(devopsUserId),
      });
      setSuccess('Escala semanal salva. A ativação do perfil será automática.');
      await load(week);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSavingWeek(false);
    }
  }

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSettings(true);
    setError('');
    setSuccess('');
    try {
      const saved = await updateOnCallSettings({
        businessStart,
        businessEnd,
      });
      setBusinessStart(saved.businessStart);
      setBusinessEnd(saved.businessEnd);
      setSuccess('Horário da empresa atualizado.');
      await load(week);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSavingSettings(false);
    }
  }

  async function submitHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingHoliday(true);
    setError('');
    setSuccess('');
    try {
      await createOnCallHoliday({
        date: holidayDate,
        name: holidayName,
      });
      setHolidayDate('');
      setHolidayName('');
      setSuccess('Feriado cadastrado. O plantão ficará ativo 24h nessa data.');
      await load(week);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSavingHoliday(false);
    }
  }

  async function removeHoliday(id: number) {
    if (!window.confirm('Excluir este feriado da escala de plantão?')) return;
    setError('');
    setSuccess('');
    try {
      await deleteOnCallHoliday(id);
      setSuccess('Feriado removido.');
      await load(week);
    } catch (reason) {
      setError(message(reason));
    }
  }

  const current = data?.current;

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        subtitle="Defina a escala semanal e as permissões temporárias do atendimento 24h."
        title="Plantão"
        user={currentUser}
      />

      <div className="mx-auto grid w-full max-w-[1450px] gap-4 px-6 py-5 max-sm:px-3.5">
        {error ? (
          <div className="rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-300/70 bg-app-success-soft px-4 py-3 text-sm text-app-success" role="status">
            {success}
          </div>
        ) : null}

        {data && data.plantonistaPermissionCount === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-200">
            <span>
              O perfil <strong>Plantonista</strong> ainda está sem permissões. A escala funcionará, mas não concederá acessos adicionais.
            </span>
            <Link className={BUTTON} href="/administracao/permissoes">
              Configurar permissões
            </Link>
          </div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-3">
          <article className={`rounded-xl border p-4 shadow-sm ${current?.active ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20' : 'border-app-border bg-app-surface'}`}>
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-muted">Situação agora</span>
            <strong className="mt-1.5 block text-xl">
              {current?.active ? 'Plantão ativo' : 'Expediente normal'}
            </strong>
            <p className="m-0 mt-2 text-xs text-app-muted">
              {current ? REASON_LABEL[current.reason] : 'Carregando…'}
              {current?.holidayName ? ` · ${current.holidayName}` : ''}
            </p>
          </article>

          {(['ti', 'devops'] as const).map((area) => {
            const active = current?.assignments.find((item) => item.area === area);
            return (
              <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm" key={area}>
                <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-muted">
                  Plantonista {area === 'ti' ? 'TI' : 'DevOps'}
                </span>
                <strong className="mt-1.5 block text-xl">
                  {current?.active ? active?.userName ?? 'Não definido' : 'Aguardando janela'}
                </strong>
                <p className="m-0 mt-2 text-xs text-app-muted">
                  {current?.active
                    ? `Escala iniciada em ${formatDate(current.serviceWeekStart)}`
                    : 'O perfil temporário está inativo durante o expediente.'}
                </p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <form
            className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm"
            onSubmit={submitWeek}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-subtle">Escala</span>
                <h2 className="m-0 mt-1 text-lg font-black">Plantonistas da semana</h2>
                <p className="m-0 mt-1 text-xs text-app-muted">
                  Vigência: segunda às {businessStart} até a segunda seguinte às {businessStart}.
                </p>
              </div>
              <div className="flex gap-2">
                <button className={BUTTON} disabled={loading} onClick={() => void changeWeek(addDays(week, -7))} type="button">Semana anterior</button>
                <button className={BUTTON} disabled={loading} onClick={() => void changeWeek(addDays(week, 7))} type="button">Próxima semana</button>
              </div>
            </div>

            <label className="mb-3 grid gap-1.5 text-xs font-bold text-app-text-soft">
              Semana
              <input
                className={INPUT}
                disabled={loading}
                onChange={(event) => void changeWeek(event.target.value)}
                type="date"
                value={week}
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Plantonista TI
                <SearchSelect
                  disabled={loading || savingWeek}
                  onChange={(values) => setTiUserId(values[0] ?? '')}
                  options={userOptions}
                  placeholder="Selecione o plantonista de TI"
                  searchPlaceholder="Pesquisar usuário..."
                  value={tiUserId ? [tiUserId] : []}
                />
              </div>

              <div className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Plantonista DevOps
                <SearchSelect
                  disabled={loading || savingWeek}
                  onChange={(values) => setDevopsUserId(values[0] ?? '')}
                  options={userOptions}
                  placeholder="Selecione o plantonista de DevOps"
                  searchPlaceholder="Pesquisar usuário..."
                  value={devopsUserId ? [devopsUserId] : []}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-app-border-soft pt-3">
              <button className={PRIMARY} disabled={loading || savingWeek} type="submit">
                {savingWeek ? 'Salvando…' : 'Salvar escala'}
              </button>
            </div>
          </form>

          <form
            className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm"
            onSubmit={submitSettings}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-subtle">Empresa</span>
            <h2 className="m-0 mt-1 text-lg font-black">Horário normal</h2>
            <p className="m-0 mt-1 text-xs leading-relaxed text-app-muted">
              Em dias úteis o Plantonista fica ativo fora desse intervalo. Fins de semana e feriados são 24h.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Abre às
                <input className={INPUT} onChange={(event) => setBusinessStart(event.target.value)} type="time" value={businessStart} />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Fecha às
                <input className={INPUT} onChange={(event) => setBusinessEnd(event.target.value)} type="time" value={businessEnd} />
              </label>
            </div>

            <div className="mt-4 flex justify-end border-t border-app-border-soft pt-3">
              <button className={PRIMARY} disabled={savingSettings} type="submit">
                {savingSettings ? 'Salvando…' : 'Salvar horário'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-subtle">Cobertura 24h</span>
            <h2 className="m-0 mt-1 text-lg font-black">Feriados</h2>
            <p className="m-0 mt-1 text-xs text-app-muted">
              Datas cadastradas aqui ativam o perfil Plantonista durante o dia inteiro.
            </p>
          </div>

          <form className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]" onSubmit={submitHoliday}>
            <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
              Data
              <input className={INPUT} onChange={(event) => setHolidayDate(event.target.value)} required type="date" value={holidayDate} />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
              Nome
              <input className={INPUT} maxLength={120} onChange={(event) => setHolidayName(event.target.value)} placeholder="Ex.: Natal" required value={holidayName} />
            </label>
            <div className="flex items-end">
              <button className={PRIMARY} disabled={savingHoliday} type="submit">
                {savingHoliday ? 'Adicionando…' : 'Adicionar feriado'}
              </button>
            </div>
          </form>

          <div className="mt-4 overflow-hidden rounded-xl border border-app-border">
            {data?.holidays.length ? (
              <div className="max-h-[340px] overflow-y-auto">
                {data.holidays.map((holiday) => (
                  <div className="flex items-center justify-between gap-3 border-b border-app-border-soft px-3 py-2.5 last:border-b-0" key={holiday.id}>
                    <div>
                      <strong className="block text-sm">{holiday.name}</strong>
                      <span className="text-xs text-app-muted">{formatDate(holiday.date)} · plantão 24h</span>
                    </div>
                    <button className={DANGER} onClick={() => void removeHoliday(holiday.id)} type="button">Excluir</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-app-muted">
                Nenhum feriado cadastrado.
              </div>
            )}
          </div>
        </section>

        <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200">
          <strong>Regra de ativação:</strong> segunda a sexta, o perfil Plantonista entra automaticamente das {businessEnd} às {businessStart}. Sábados, domingos e feriados cadastrados ficam cobertos 24h. A troca semanal ocorre às {businessStart} de segunda-feira.
        </div>
      </div>
    </main>
  );
}
