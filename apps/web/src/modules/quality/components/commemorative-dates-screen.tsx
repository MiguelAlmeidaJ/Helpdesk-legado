"use client";

import {
  AppPermission,
  type CommemorativeDatesResponse,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import {
  createCommemorativeDate,
  deleteCommemorativeDate,
  fetchCommemorativeDates,
} from '../api/quality-calendar-api';

const PRIMARY = appButtonClass('primary');
const DANGER = appButtonClass('danger', 'sm');
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

function canManage(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.QualityDatesManage,
  );
}

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

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function CommemorativeDatesScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const manage = canManage(currentUser);
  const [data, setData] = useState<CommemorativeDatesResponse | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchCommemorativeDates(signal);
      setData(response);
      setYear((current) => current ?? response.currentYear);
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(message(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const years = useMemo(() => {
    const values = new Set<number>();
    if (data) {
      values.add(data.currentYear);
      values.add(data.nextYear);
      for (const item of data.items) {
        values.add(Number(item.date.slice(0, 4)));
      }
    }
    return [...values].filter(Number.isFinite).sort((a, b) => a - b);
  }, [data]);

  const items = useMemo(
    () =>
      (data?.items ?? []).filter(
        (item) => year === null || Number(item.date.slice(0, 4)) === year,
      ),
    [data?.items, year],
  );

  const nationalCount = items.filter((item) => item.national).length;
  const customCount = items.length - nationalCount;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createCommemorativeDate({ date, name });
      setDate('');
      setName('');
      setSuccess('Data especial cadastrada. Ela já passa a valer no calendário do Plantão.');
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Excluir esta data especial do calendário corporativo?')) return;
    setError('');
    setSuccess('');
    try {
      await deleteCommemorativeDate(id);
      setSuccess('Data especial removida.');
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        subtitle="Feriados nacionais e datas especiais que alteram o calendário operacional."
        title="Datas comemorativas"
        user={currentUser}
      />

      <div className="mx-auto grid w-full max-w-[1350px] gap-4 px-6 py-5 max-sm:px-3.5">
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

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-muted">Ano selecionado</span>
            <strong className="mt-1.5 block text-2xl">{year ?? '—'}</strong>
            <p className="m-0 mt-2 text-xs text-app-muted">Calendário operacional exibido abaixo.</p>
          </article>
          <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-muted">Feriados nacionais</span>
            <strong className="mt-1.5 block text-2xl">{nationalCount}</strong>
            <p className="m-0 mt-2 text-xs text-app-muted">Mantidos automaticamente pelo sistema.</p>
          </article>
          <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-muted">Datas adicionais</span>
            <strong className="mt-1.5 block text-2xl">{customCount}</strong>
            <p className="m-0 mt-2 text-xs text-app-muted">Folgas ou datas especiais cadastradas pela empresa.</p>
          </article>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-subtle">Calendário</span>
              <h2 className="m-0 mt-1 text-lg font-black">Datas do ano</h2>
              <p className="m-0 mt-1 text-xs text-app-muted">
                Toda data desta lista ativa o Plantão durante 24 horas.
              </p>
            </div>

            <label className="grid gap-1 text-xs font-bold text-app-text-soft">
              Ano
              <select
                className={INPUT}
                onChange={(event) => setYear(Number(event.target.value))}
                value={year ?? ''}
              >
                {years.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>

          {manage ? (
            <form className="mt-4 grid gap-3 rounded-xl border border-app-border bg-app-surface-muted p-3 md:grid-cols-[190px_minmax(0,1fr)_auto]" onSubmit={submit}>
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Data
                <input className={INPUT} onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Nome da data
                <input className={INPUT} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Recesso interno" required value={name} />
              </label>
              <div className="flex items-end">
                <button className={PRIMARY} disabled={saving} type="submit">
                  {saving ? 'Adicionando…' : 'Adicionar data'}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-xl border border-app-border">
            {loading && !data ? (
              <div className="grid min-h-[180px] place-items-center text-sm text-app-muted">Carregando calendário…</div>
            ) : items.length ? (
              <div className="divide-y divide-app-border-soft">
                {items.map((item) => (
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 max-sm:grid-cols-[1fr_auto]" key={item.id}>
                    <strong className="text-sm max-sm:col-span-1">{formatDate(item.date)}</strong>
                    <div className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
                      <span className="block truncate text-sm font-bold text-app-text">{item.name}</span>
                      <span className="mt-1 inline-flex rounded-full bg-app-surface-muted px-2 py-0.5 text-[10px] font-extrabold text-app-muted">
                        {item.national ? 'Feriado nacional' : 'Data adicional'}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {manage && !item.national ? (
                        <button className={DANGER} onClick={() => void remove(item.id)} type="button">Excluir</button>
                      ) : item.national ? (
                        <span className="text-[10px] font-bold text-app-subtle">Automático</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-app-muted">
                Nenhuma data cadastrada para este ano.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
