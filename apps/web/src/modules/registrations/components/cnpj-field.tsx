"use client";

import { formatCnpj, isValidCnpj, normalizeCnpj, type CnpjLookupResponse } from '@helpdesk/contracts';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { lookupCnpj } from '../api/registrations-api';

export function CnpjField({ value, disabled, onChange, onFound }: {
  value: string; disabled: boolean; onChange(value: string): void; onFound(data: CnpjLookupResponse): void;
}) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    setNotice(''); setLoading(false);
    return () => request.current?.abort();
  }, [value]);

  async function search() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setNotice(''); setFailed(false);
    try {
      const data = await lookupCnpj(normalizeCnpj(value), controller.signal);
      if (controller.signal.aborted) return;
      onFound(data);
      setNotice('Dados encontrados. Revise as informações antes de salvar.');
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailed(true);
      const body = error instanceof ApiError ? error.body as { message?: unknown } | null : null;
      setNotice(typeof body?.message === 'string' ? body.message : 'Consulta indisponível. Você pode preencher os dados manualmente.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  return <div className="grid content-start gap-1.5 text-sm font-semibold">
    <label htmlFor="client-cnpj">CNPJ</label>
    <div className="flex items-start gap-2">
      <input id="client-cnpj" className="min-h-10 w-full min-w-0 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:opacity-55"
        autoCapitalize="characters" autoComplete="off" spellCheck={false} inputMode="text" disabled={disabled}
        maxLength={18} placeholder="AA.AAA.AAA/AAAA-00" value={formatCnpj(value)}
        onChange={event => {
          const input = event.currentTarget;
          let count = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/[^A-Za-z0-9]/g, '').length;
          let raw = input.value;
          // Backspace over a separator also removes the preceding character.
          if ((event.nativeEvent as InputEvent).inputType === 'deleteContentBackward' && formatCnpj(raw) === formatCnpj(value)) {
            const position = input.selectionStart ?? raw.length;
            raw = raw.slice(0, Math.max(0, position - 1)) + raw.slice(position);
            count = Math.max(0, count - 1);
          }
          const next = formatCnpj(raw); onChange(next);
          let caret = 0, seen = 0;
          while (caret < next.length && seen < count) { if (/[A-Z0-9]/.test(next[caret]!)) seen++; caret++; }
          requestAnimationFrame(() => { if (input.isConnected && document.activeElement === input) input.setSelectionRange(caret, caret); });
        }} />
      <button type="button" disabled={disabled || loading || !isValidCnpj(value)} onClick={() => void search()} className="min-h-10 shrink-0 rounded-lg border border-app-border-strong px-3 text-sm font-bold text-app-brand disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Buscando…' : 'Buscar CNPJ'}</button>
    </div>
    {notice ? <small role={failed ? 'alert' : 'status'} className={`font-normal ${failed ? 'text-app-danger' : 'text-app-muted'}`}>{notice}</small> : null}
  </div>;
}
