"use client";

import {
  AppPermission,
  type CommemorativeDatesResponse,
  type CurrentUserResponse,
  type HolidayLocationsResponse,
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
  fetchHolidayLocations,
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
  const [scope, setScope] = useState<'state' | 'municipal'>('state');
  const [state, setState] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [locations, setLocations] = useState<HolidayLocationsResponse>({ states: [], municipalities: [] });
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [locationsRetry, setLocationsRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (signal?: AbortSignal, selectedYear?: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchCommemorativeDates(signal, selectedYear);
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

  useEffect(() => {
    if (!manage) return;
    const controller = new AbortController();
    setLocationsLoading(true); setLocationsError('');
    fetchHolidayLocations(scope === 'municipal' && state ? state : undefined, controller.signal)
      .then(value => { if (!controller.signal.aborted) setLocations(value); })
      .catch(reason => { if (!controller.signal.aborted) setLocationsError(message(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLocationsLoading(false); });
    return () => controller.abort();
  }, [manage, scope, state, locationsRetry]);

  const years = useMemo(() => {
    const values = new Set<number>();
    if (data) {
      values.add(data.currentYear);
      values.add(data.nextYear);
      for (let offset = 2; offset <= 10; offset++) values.add(data.currentYear + offset);
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
      await createCommemorativeDate({ date, name, scope, state, municipalityId: scope === 'municipal' ? Number(municipalityId) : undefined });
      setDate('');
      setName('');
      setSuccess('Feriado cadastrado com repetição anual.');
      await load(undefined, year ?? undefined);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, regional: boolean) {
    if (!window.confirm('Excluir esta data especial do calendário corporativo?')) return;
    setError('');
    setSuccess('');
    try {
      await deleteCommemorativeDate(id, regional);
      setSuccess('Data especial removida.');
      await load(undefined, year ?? undefined);
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
            <p className="m-0 mt-2 text-xs text-app-muted">Datas locais ou especiais que se repetem anualmente.</p>
          </article>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-subtle">Calendário</span>
              <h2 className="m-0 mt-1 text-lg font-black">Datas do ano</h2>
              <p className="m-0 mt-1 text-xs text-app-muted">
                Toda data desta lista ativa o Plantão durante 24 horas. Datas adicionais se repetem todos os anos.
              </p>
            </div>

            <label className="grid gap-1 text-xs font-bold text-app-text-soft">
              Ano
              <select
                className={INPUT}
                disabled={loading || saving}
                onChange={(event) => { const value = Number(event.target.value); setYear(value); void load(undefined, value); }}
                value={year ?? ''}
              >
                {years.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>

          {manage ? (
            <form className="mt-4 grid items-end gap-3 rounded-xl border border-app-border bg-app-surface-muted p-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Data (dia/mês)
                <input className={INPUT} disabled={saving} inputMode="numeric" maxLength={5} pattern="[0-9]{2}/[0-9]{2}" placeholder="DD/MM" title="Informe dia e mês: DD/MM" onChange={(event) => { const digits = event.target.value.replace(/\D/g, '').slice(0, 4); setDate(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} required type="text" value={date} />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Nome
                <input className={INPUT} disabled={saving} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Aniversário da cidade" required value={name} />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Abrangência
                <select className={INPUT} disabled={saving} value={scope} onChange={event => { setScope(event.target.value as 'state' | 'municipal'); setMunicipalityId(''); }}>
                  <option value="state">Estadual</option><option value="municipal">Municipal</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Estado
                <select className={INPUT} disabled={saving || locationsLoading} required value={state} onChange={event => { setState(event.target.value); setMunicipalityId(''); }}>
                  <option value="">Selecione o estado</option>
                  {locations.states.map(item => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
                </select>
              </label>
              {scope === 'municipal' ? <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Município
                <select className={INPUT} disabled={saving || locationsLoading || !state || Boolean(locationsError)} required value={municipalityId} onChange={event => setMunicipalityId(event.target.value)}>
                  <option value="">{locationsLoading ? 'Carregando municípios…' : state ? 'Selecione o município' : 'Selecione primeiro o estado'}</option>
                  {locations.municipalities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label> : null}
              <div className="flex items-end">
                <button className={PRIMARY} disabled={saving || locationsLoading || Boolean(locationsError) || !state || (scope === 'municipal' && !municipalityId)} type="submit">
                  {saving ? 'Adicionando…' : 'Adicionar feriado'}
                </button>
              </div>
              {locationsError ? <p className="col-span-full m-0 text-sm text-app-danger" role="alert">Não foi possível carregar as localidades. <button className="underline" onClick={() => setLocationsRetry(value => value + 1)} type="button">Tentar novamente</button></p> : null}
            </form>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-xl border border-app-border">
            {loading && !data ? (
              <div className="grid min-h-[180px] place-items-center text-sm text-app-muted">Carregando calendário…</div>
            ) : items.length ? (
              <div className="divide-y divide-app-border-soft">
                {items.map((item) => (
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 max-sm:grid-cols-[1fr_auto]" key={`${item.origin ?? 'legacy'}:${item.id}:${item.date}`}>
                    <strong className="text-sm max-sm:col-span-1">{formatDate(item.date)}</strong>
                    <div className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
                      <span className="block truncate text-sm font-bold text-app-text">{item.name}</span>
                      <span className="mt-1 inline-flex rounded-full bg-app-surface-muted px-2 py-0.5 text-[10px] font-extrabold text-app-muted">
                        {item.national ? 'Feriado nacional' : item.scope === 'municipal' ? `Municipal · ${item.municipalityName} / ${item.state} · Anual` : item.scope === 'state' ? `Estadual · ${item.state} · Anual` : 'Data adicional anual'}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {manage && !item.national ? (
                        <button className={DANGER} onClick={() => void remove(item.id, item.origin === 'regional')} type="button">Excluir</button>
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
