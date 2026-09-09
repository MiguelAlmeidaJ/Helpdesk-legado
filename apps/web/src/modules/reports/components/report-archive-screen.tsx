'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CurrentUserResponse, TicketReportCatalog } from '@helpdesk/contracts';
import { apiDownload, apiRequest } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { reportError } from '../lib/report-export';
import styles from './ticket-client-totals-report-screen.module.css';

interface ArchivedReport { name: string; size: number; modifiedAt: string }

export function ReportArchiveScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [files, setFiles] = useState<ArchivedReport[]>([]);
  const [clients, setClients] = useState<TicketReportCatalog['clients']>([]);
  const [clientIds, setClientIds] = useState<number[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function refresh() {
    const [archive, catalog] = await Promise.all([apiRequest<ArchivedReport[]>('reports/archive'), apiRequest<TicketReportCatalog>('reports/tickets/catalog')]);
    setFiles(archive); setClients(catalog.clients); setNames([]);
  }
  useEffect(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    setStartDate(`${today.slice(0, 7)}-01`); setEndDate(today);
    refresh().catch(reason => setError(reportError(reason))).finally(() => setBusy(false));
  }, []);
  async function action(operation: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await operation(); } catch (reason) { setError(reportError(reason)); } finally { setBusy(false); }
  }
  return <main className={styles.page}>
    <header className={styles.header}><div className={styles.headerLeft}><AppSidebar /><Link className={styles.brand} href="/dashboard"><strong>Helpdesk</strong><span>Relatórios</span></Link></div><SessionUserMenu user={currentUser} /></header>
    <div className={styles.content}>
      <section className={styles.hero}><div><h1>Relatórios PDF</h1><p>Gere um relatório unificado por cliente e consulte os PDFs arquivados.</p></div></section>
      <form className={styles.filters} onSubmit={event => { event.preventDefault(); void action(async () => {
        const result = await apiRequest<{ files: string[]; errors: Array<{ clientId: number; message: string }> }>('reports/archive/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds, startDate, endDate }) });
        await refresh(); setMessage(`${result.files.length} PDF(s) gerado(s).`);
        if (result.errors.length) setError(result.errors.map(row => `Cliente ${row.clientId}: ${row.message}`).join(' '));
      }); }}>
        <label><span>De</span><input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label><span>Até</span><input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
        <label><span>Clientes (até 50)</span><select multiple required value={clientIds.map(String)} onChange={e => setClientIds(Array.from(e.target.selectedOptions, option => Number(option.value)))}>{clients.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <div className={styles.actions}><button disabled={busy || !clientIds.length}>{busy ? 'Aguarde…' : 'Gerar PDFs'}</button></div>
      </form>
      <div className={styles.exportActions}>
        <button disabled={busy} onClick={() => void action(refresh)}>Atualizar</button>
        <button disabled={busy || !names.length} onClick={() => void action(() => apiDownload('reports/archive/download', 'relatorios.zip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }) }))}>Baixar selecionados</button>
        <button disabled={busy || !names.length} onClick={() => {
          if (window.confirm(`Excluir ${names.length} PDF(s) selecionado(s)?`)) void action(async () => { await apiRequest('reports/archive', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }) }); await refresh(); setMessage('PDFs excluídos.'); });
        }}>Excluir selecionados</button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}{message ? <p role="status">{message}</p> : null}
      <section className={styles.reportCard}><div className={styles.tableWrap}><table><thead><tr><th><input type="checkbox" aria-label="Selecionar todos" disabled={busy} checked={files.length > 0 && names.length === files.length} onChange={e => setNames(e.target.checked ? files.map(row => row.name) : [])} /></th><th>Arquivo</th><th>Modificado</th><th>Tamanho</th><th>Download</th></tr></thead><tbody>{files.map(file => <tr key={file.name}>
        <td><input type="checkbox" aria-label={`Selecionar ${file.name}`} disabled={busy} checked={names.includes(file.name)} onChange={e => setNames(e.target.checked ? [...names, file.name] : names.filter(name => name !== file.name))} /></td><td>{file.name}</td><td>{new Date(file.modifiedAt).toLocaleString('pt-BR')}</td><td>{Math.ceil(file.size / 1024)} KB</td><td><button disabled={busy} onClick={() => void action(() => apiDownload(`reports/archive/${encodeURIComponent(file.name)}`, file.name))}>Baixar PDF</button></td>
      </tr>)}</tbody></table>{!busy && !files.length ? <p className={styles.empty}>Nenhum PDF arquivado.</p> : null}</div></section>
    </div>
  </main>;
}
