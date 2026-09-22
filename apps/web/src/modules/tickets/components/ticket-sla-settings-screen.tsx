"use client";

import type {
  CurrentUserResponse,
  TicketSlaSettings,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  fetchTicketSlaSettings,
  updateTicketSlaSettings,
} from '../api/ticket-sla-settings-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-white transition hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950';
const INPUT =
  'min-h-11 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-base font-bold text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

function message(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) return 'Somente administradores podem alterar os SLAs.';
    if (reason.body && typeof reason.body === 'object') {
      const value = (reason.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(' ');
    }
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível concluir a operação.';
}

export function TicketSlaSettingsScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [form, setForm] = useState<TicketSlaSettings>({
    qualityMinutes: 40,
    clerioMinutes: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchTicketSlaSettings(controller.signal)
      .then(setForm)
      .catch((reason) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(message(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await updateTicketSlaSettings(form);
      setForm(saved);
      setSuccess('Configurações de SLA atualizadas com sucesso.');
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        subtitle="Defina os tempos de alerta usados na lista de atendimentos."
        title="SLA de Atendimentos"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1100px] px-6 py-6 max-sm:px-3.5">
        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-300/70 bg-app-success-soft px-4 py-3 text-sm text-app-success" role="status">
            {success}
          </div>
        ) : null}

        <form
          className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm"
          onSubmit={submit}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/15">
              <div className="mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-red-600 dark:text-red-400">
                  SLA Qualidade
                </span>
                <h2 className="m-0 mt-1 text-xl font-black text-app-text">
                  Sem interação
                </h2>
                <p className="m-0 mt-2 text-sm leading-6 text-app-muted">
                  Conta desde a última interação do atendimento. Qualquer nova
                  interação reinicia o contador. Quando estoura, a linha do
                  atendimento passa a piscar em vermelho.
                </p>
              </div>
              <label className="grid gap-2 text-sm font-bold text-app-text-soft">
                Tempo máximo sem interação
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <input
                    className={INPUT}
                    disabled={loading || saving}
                    max={10080}
                    min={1}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        qualityMinutes: Number(event.target.value),
                      }))
                    }
                    required
                    type="number"
                    value={form.qualityMinutes}
                  />
                  <span className="text-sm font-bold text-app-muted">minutos</span>
                </div>
              </label>
            </section>

            <section className="rounded-2xl border border-slate-300 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/35">
              <div className="mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-800 dark:text-slate-200">
                  SLA Clerio
                </span>
                <h2 className="m-0 mt-1 text-xl font-black text-app-text">
                  Tempo desde a abertura
                </h2>
                <p className="m-0 mt-2 text-sm leading-6 text-app-muted">
                  Conta continuamente desde a abertura e não reinicia com
                  interações. Ao estourar, o sino preto pisca. Enquanto o
                  atendimento estiver em espera, o sino permanece parado.
                </p>
              </div>
              <label className="grid gap-2 text-sm font-bold text-app-text-soft">
                Tempo máximo desde a abertura
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <input
                    className={INPUT}
                    disabled={loading || saving}
                    max={10080}
                    min={1}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clerioMinutes: Number(event.target.value),
                      }))
                    }
                    required
                    type="number"
                    value={form.clerioMinutes}
                  />
                  <span className="text-sm font-bold text-app-muted">minutos</span>
                </div>
              </label>
            </section>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-app-border-soft pt-4 max-sm:flex-col max-sm:items-stretch">
            <p className="m-0 text-xs text-app-muted">
              Valores válidos: de 1 minuto até 7 dias.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className={BUTTON}
                disabled={loading || saving}
                onClick={() =>
                  setForm({ qualityMinutes: 40, clerioMinutes: 60 })
                }
                type="button"
              >
                Restaurar 40 / 60
              </button>
              <button className={PRIMARY} disabled={loading || saving} type="submit">
                {saving ? 'Salvando…' : 'Salvar configuração'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
