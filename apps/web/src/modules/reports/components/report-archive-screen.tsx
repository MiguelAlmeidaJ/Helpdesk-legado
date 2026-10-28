'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CurrentUserResponse, TicketReportCatalog } from '@helpdesk/contracts';
import { apiDownload, apiRequest } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { reportError } from '../lib/report-export';

interface ArchivedReport { name: string; size: number; modifiedAt: string; expiresAt: string }
const CARD = 'min-w-0 rounded-2xl border border-app-border bg-app-surface shadow-sm';
const INPUT = 'min-h-11 w-full min-w-0 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus-visible:border-app-brand focus-visible:ring-2 focus-visible:ring-app-brand disabled:opacity-50';
const CHECKBOX = 'size-4 shrink-0 cursor-pointer accent-app-brand disabled:cursor-not-allowed';
const SECONDARY = appButtonClass('secondary');
const PRIMARY = appButtonClass('primary');

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const unit = bytes < 1024 ** 2 ? 'KB' : 'MB';
  return `${(bytes / (unit === 'KB' ? 1024 : 1024 ** 2)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
}

export function ReportArchiveScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [files, setFiles] = useState<ArchivedReport[]>([]);
  const [clients, setClients] = useState<TicketReportCatalog['clients']>([]);
  const [clientIds, setClientIds] = useState<number[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(true);
  const [busyLabel, setBusyLabel] = useState('Carregando dados…');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh(signal?: AbortSignal) {
    const [archive, catalog] = await Promise.all([
      apiRequest<ArchivedReport[]>('reports/archive', { signal }),
      apiRequest<TicketReportCatalog>('reports/tickets/catalog', { signal }),
    ]);
    if (signal?.aborted) return;
    setFiles(archive); setClients(catalog.clients); setNames([]);
  }
  useEffect(() => {
    const controller = new AbortController();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    setStartDate(`${today.slice(0, 7)}-01`); setEndDate(today);
    refresh(controller.signal).catch(reason => { if (!controller.signal.aborted) setError(reportError(reason)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  async function action(operation: () => Promise<void>, label: string) {
    setBusy(true); setBusyLabel(label); setError(''); setMessage('');
    try { await operation(); } catch (reason) { setError(reportError(reason)); } finally { setBusy(false); }
  }
  const visibleClients = useMemo(() => {
    const query = clientQuery.trim().toLocaleLowerCase('pt-BR');
    return query ? clients.filter(client => client.name.toLocaleLowerCase('pt-BR').includes(query)) : clients;
  }, [clientQuery, clients]);
  const validPeriod = Boolean(startDate && endDate && startDate <= endDate);
  const canGenerate = !busy && validPeriod && clientIds.length > 0;

  function toggleClient(clientId: number, checked: boolean) {
    setClientIds(current => checked
      ? current.includes(clientId) || current.length >= 50 ? current : [...current, clientId]
      : current.filter(id => id !== clientId));
  }
  function selectVisibleClients() {
    setClientIds(current => {
      const next = new Set(current);
      for (const client of visibleClients) { if (next.size >= 50) break; next.add(client.id); }
      return [...next];
    });
  }
  async function generate() {
    if (!canGenerate) return;
    await action(async () => {
      const result = await apiRequest<{ files: string[]; errors: Array<{ clientId: number; message: string }> }>('reports/archive/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds, startDate, endDate }),
      });
      await refresh(); setMessage(`${result.files.length} PDF(s) gerado(s).`);
      if (result.errors.length) setError(result.errors.map(row => `Cliente ${row.clientId}: ${row.message}`).join(' '));
    }, 'Gerando relatórios…');
  }

  return <main className="min-h-screen bg-app-bg text-app-text max-sm:[&>header]:flex-wrap max-sm:[&>header]:gap-2 max-sm:[&>header>div:last-child]:w-full">
    <AppPageHeader title="Relatórios gerados" subtitle="Gere PDFs por cliente e organize os arquivos disponíveis para download." user={currentUser} />
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-6 py-7 max-sm:px-3.5">
      <dl className="m-0 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'PDFs disponíveis', value: files.length.toLocaleString('pt-BR'), icon: 'file' as const },
          { label: 'Tamanho dos arquivos', value: sizeLabel(files.reduce((total, file) => total + file.size, 0)), icon: 'folder' as const },
          { label: 'Disponibilidade dos PDFs', value: '15 dias', icon: 'clock' as const },
        ].map(item => <div key={item.label} className={`${CARD} flex items-center justify-between gap-3 p-4`}><div><dt className="text-xs font-semibold text-app-muted">{item.label}</dt><dd className="m-0 mt-1.5 text-2xl font-extrabold tracking-tight">{busy && !files.length ? '—' : item.value}</dd></div><span className="rounded-xl bg-app-brand-soft p-2.5 text-app-brand"><NavigationIcon name={item.icon} className="size-5" /></span></div>)}
      </dl>

      {error ? <p className="m-0 rounded-xl border border-app-danger-border bg-app-danger-soft p-4 text-sm text-app-danger" role="alert">{error}</p> : null}
      {message ? <p className="m-0 rounded-xl border border-app-border bg-app-success-soft p-4 text-sm text-app-success" role="status">{message}</p> : null}
      {busy ? <p role="status" className="m-0 text-sm text-app-muted">{busyLabel}</p> : null}

      <form className={CARD} aria-labelledby="generate-reports-title" onSubmit={event => { event.preventDefault(); void generate(); }}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-5 py-4"><div><h2 id="generate-reports-title" className="m-0 text-base font-extrabold">Gerar novos relatórios</h2><p className="mb-0 mt-1 text-sm text-app-muted">Defina o período e escolha até 50 clientes por lote.</p></div><span className="rounded-full bg-app-brand-soft px-3 py-1 text-xs font-bold text-app-brand">Um PDF por cliente</span></header>
        <div className="grid items-start gap-6 p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
          <div className="grid min-w-0 gap-5 max-lg:contents">
            <fieldset className="m-0 min-w-0 border-0 p-0"><legend className="mb-3 text-sm font-bold">Período do relatório</legend><div className="grid min-w-0 grid-cols-1 gap-3 min-[430px]:grid-cols-2">
              <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted"><span>De</span><input className={INPUT} type="date" required disabled={busy} max={endDate || undefined} value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
              <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted"><span>Até</span><input className={INPUT} type="date" required disabled={busy} min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
            </div>{startDate && endDate && !validPeriod ? <p className="mb-0 mt-2 text-xs text-app-danger">A data final deve ser igual ou posterior à inicial.</p> : null}</fieldset>
            <div className="rounded-xl bg-app-surface-muted p-4"><p className="m-0 text-sm font-semibold">{clientIds.length ? `${clientIds.length} cliente(s) selecionado(s)` : 'Selecione os clientes ao lado'}</p><p className="mb-0 mt-1.5 text-xs leading-relaxed text-app-muted">Os arquivos gerados aparecerão na lista abaixo e ficarão disponíveis por 15 dias.</p></div>
            <button className={`${PRIMARY} order-4 w-full lg:order-none`} type="submit" disabled={!canGenerate}><NavigationIcon name="file" className="size-4" />{busy && busyLabel === 'Gerando relatórios…' ? 'Gerando PDFs…' : clientIds.length ? `Gerar PDFs (${clientIds.length})` : 'Gerar PDFs'}</button>
          </div>

          <fieldset className="order-3 m-0 min-w-0 border-0 p-0 lg:order-none"><legend className="mb-3 flex w-full items-center justify-between gap-2 text-sm font-bold"><span>Clientes</span><span aria-live="polite" className="rounded-full bg-app-brand-soft px-2.5 py-1 text-xs text-app-brand">{clientIds.length}/50 selecionados</span></legend>
            <div className="overflow-hidden rounded-xl border border-app-border-strong">
              <input aria-label="Buscar cliente" className="min-h-11 w-full min-w-0 border-0 border-b border-app-border bg-app-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-brand" disabled={busy} onChange={event => setClientQuery(event.target.value)} placeholder="Buscar cliente pelo nome…" type="search" value={clientQuery} />
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border bg-app-surface-muted px-3 py-2"><button className="text-xs font-semibold text-app-brand disabled:opacity-40" disabled={busy || clientIds.length >= 50 || !visibleClients.length} onClick={selectVisibleClients} type="button">Selecionar visíveis</button><button className="text-xs font-semibold text-app-muted disabled:opacity-40" disabled={busy || !clientIds.length} onClick={() => setClientIds([])} type="button">Limpar seleção</button></div>
              <div aria-label="Lista de clientes" className="grid max-h-60 gap-1 overflow-y-auto p-2">
                {visibleClients.map(client => {
                  const checked = clientIds.includes(client.id), disabled = busy || (!checked && clientIds.length >= 50);
                  return <label key={client.id} className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${checked ? 'bg-app-brand-soft text-app-brand' : 'hover:bg-app-surface-hover'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}><input className={CHECKBOX} checked={checked} disabled={disabled} onChange={event => toggleClient(client.id, event.target.checked)} type="checkbox" /><span className="min-w-0 break-words leading-snug">{client.name}</span></label>;
                })}
                {!visibleClients.length ? <p className="m-0 p-6 text-center text-sm text-app-muted">{busy ? 'Carregando clientes…' : clients.length ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente disponível.'}</p> : null}
              </div>
            </div>
            <p className="mb-0 mt-2 text-xs text-app-muted">{clientIds.length === 50 ? 'Limite do lote atingido. Desmarque um cliente para escolher outro.' : `${visibleClients.length} cliente(s) na lista. A busca mantém suas seleções.`}</p>
          </fieldset>
        </div>
      </form>

      <section className={`${CARD} overflow-hidden`} aria-labelledby="available-reports-title">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-app-border p-5"><div><h2 id="available-reports-title" className="m-0 text-base font-extrabold">Arquivos disponíveis <span className="ml-1 text-sm font-normal text-app-muted">({files.length})</span></h2><p className="mb-0 mt-1 text-xs text-app-muted">{names.length ? `${names.length} arquivo(s) selecionado(s)` : 'Selecione arquivos para baixar em ZIP ou excluir em lote.'}</p></div><div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>button]:grow">
          <button className={SECONDARY} type="button" disabled={busy} onClick={() => void action(() => refresh(), 'Atualizando arquivos…')}>Atualizar</button>
          <button className={SECONDARY} type="button" disabled={busy || !names.length} onClick={() => void action(() => apiDownload('reports/archive/download', 'relatorios.zip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }) }), 'Preparando download…')}>Baixar selecionados{names.length ? ` (${names.length})` : ''}</button>
          <button className={appButtonClass('danger')} type="button" disabled={busy || !names.length} onClick={() => {
            if (window.confirm(`Excluir ${names.length} PDF(s) selecionado(s)?`)) void action(async () => { await apiRequest('reports/archive', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }) }); await refresh(); setMessage('PDFs excluídos.'); }, 'Excluindo arquivos…');
          }}>Excluir selecionados</button>
        </div></header>
        {files.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><caption className="sr-only">PDFs gerados e suas datas de expiração</caption><thead className="bg-app-surface-muted text-xs text-app-muted"><tr>
          <th scope="col" className="w-12 px-5 py-3"><input className={CHECKBOX} type="checkbox" aria-label="Selecionar todos os arquivos" disabled={busy} checked={names.length === files.length} ref={input => { if (input) input.indeterminate = names.length > 0 && names.length < files.length; }} onChange={event => setNames(event.target.checked ? files.map(file => file.name) : [])} /></th>
          {['Arquivo', 'Gerado em', 'Expira em', 'Tamanho', 'Download'].map(label => <th scope="col" className="whitespace-nowrap px-3 py-3 font-semibold" key={label}>{label}</th>)}
        </tr></thead><tbody>{files.map(file => <tr key={file.name} className={`border-t border-app-border ${names.includes(file.name) ? 'bg-app-brand-soft' : 'hover:bg-app-surface-hover'}`}>
          <td className="px-5 py-4"><input className={CHECKBOX} type="checkbox" aria-label={`Selecionar ${file.name}`} disabled={busy} checked={names.includes(file.name)} onChange={event => setNames(current => event.target.checked ? [...new Set([...current, file.name])] : current.filter(name => name !== file.name))} /></td>
          <td className="max-w-[360px] px-3 py-4"><span className="flex items-center gap-2.5"><span className="shrink-0 rounded-lg bg-app-surface-muted p-2 text-app-brand"><NavigationIcon name="file" className="size-4" /></span><span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]" title={file.name}>{file.name}</span></span></td>
          <td className="whitespace-nowrap px-3 py-4 text-xs text-app-muted">{dateLabel(file.modifiedAt)}</td><td className="whitespace-nowrap px-3 py-4 text-xs text-app-muted">{dateLabel(file.expiresAt)}</td><td className="whitespace-nowrap px-3 py-4">{sizeLabel(file.size)}</td>
          <td className="px-3 py-4"><button className={appButtonClass('secondary', 'sm')} type="button" aria-label={`Baixar ${file.name}`} disabled={busy} onClick={() => void action(() => apiDownload(`reports/archive/${encodeURIComponent(file.name)}`, file.name), 'Preparando download…')}>Baixar PDF</button></td>
        </tr>)}</tbody></table></div> : <div className="grid justify-items-center gap-2 px-5 py-12 text-center"><span className="mb-1 rounded-2xl bg-app-surface-muted p-4 text-app-muted"><NavigationIcon name="folder" className="size-8" /></span><h3 className="m-0 text-sm font-bold">{busy ? 'Carregando arquivos…' : 'Nenhum relatório disponível'}</h3><p className="m-0 max-w-md text-sm text-app-muted">{error ? 'Não foi possível atualizar os arquivos. Tente novamente em Atualizar.' : 'Escolha o período e os clientes acima para gerar seu primeiro lote de PDFs.'}</p></div>}
      </section>
    </div>
  </main>;
}
