'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CurrentUserResponse, TicketReportCatalog } from '@helpdesk/contracts';
import { apiDownload, apiRequest } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { reportError } from '../lib/report-export';
import { reportScreenStyles as styles } from './report-screen-styles';

interface ArchivedReport { name: string; size: number; modifiedAt: string; expiresAt: string }

function FileDownloadIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
    <path d="M7 3.75h6.5L18 8.25V20.25H7z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    <path d="M13.5 3.75v4.5H18M12.5 11v5m0 0-2-2m2 2 2-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
  </svg>;
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

  const visibleClients = useMemo(() => {
    const query = clientQuery.trim().toLocaleLowerCase('pt-BR');
    if (!query) return clients;
    return clients.filter(client => client.name.toLocaleLowerCase('pt-BR').includes(query));
  }, [clientQuery, clients]);

  function toggleClient(clientId: number, checked: boolean) {
    setClientIds(current => {
      if (!checked) return current.filter(id => id !== clientId);
      if (current.includes(clientId) || current.length >= 50) return current;
      return [...current, clientId];
    });
  }

  function selectVisibleClients() {
    setClientIds(current => {
      const next = new Set(current);
      for (const client of visibleClients) {
        if (next.size >= 50) break;
        next.add(client.id);
      }
      return [...next];
    });
  }

  return <main className={styles.page}>
    <AppPageHeader
      subtitle="Gere relatórios por cliente. Os PDFs ficam disponíveis por 15 dias."
      title="Relatórios gerados"
      user={currentUser}
    />
    <div className={styles.content}>
      <form className={styles.filters} onSubmit={event => { event.preventDefault(); void action(async () => {
        const result = await apiRequest<{ files: string[]; errors: Array<{ clientId: number; message: string }> }>('reports/archive/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds, startDate, endDate }) });
        await refresh(); setMessage(`${result.files.length} PDF(s) gerado(s).`);
        if (result.errors.length) setError(result.errors.map(row => `Cliente ${row.clientId}: ${row.message}`).join(' '));
      }); }}>
        <label><span>De</span><input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label><span>Até</span><input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
        <fieldset className={styles.clientPicker}>
          <div className={styles.clientPickerHeader}>
            <span>Clientes</span>
            <strong>{clientIds.length}/50 selecionados</strong>
          </div>
          <div className={styles.clientPickerBox}>
            <input
              aria-label="Buscar cliente"
              className={styles.clientSearch}
              onChange={event => setClientQuery(event.target.value)}
              placeholder="Buscar cliente..."
              type="search"
              value={clientQuery}
            />
            <div className={styles.clientPickerActions}>
              <button disabled={busy || clientIds.length >= 50 || visibleClients.length === 0} onClick={selectVisibleClients} type="button">Selecionar visíveis</button>
              <button disabled={busy || clientIds.length === 0} onClick={() => setClientIds([])} type="button">Limpar</button>
            </div>
            <div className={styles.clientList}>
              {visibleClients.length ? visibleClients.map(client => {
                const checked = clientIds.includes(client.id);
                return <label className={styles.clientOption} key={client.id}>
                  <input
                    checked={checked}
                    disabled={busy || (!checked && clientIds.length >= 50)}
                    onChange={event => toggleClient(client.id, event.target.checked)}
                    type="checkbox"
                  />
                  <span>{client.name}</span>
                </label>;
              }) : <div className={styles.clientEmpty}>Nenhum cliente encontrado.</div>}
            </div>
          </div>
        </fieldset>
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
      <section className={styles.reportCard}><div className={styles.tableWrap}><table><thead><tr><th><input type="checkbox" aria-label="Selecionar todos" disabled={busy} checked={files.length > 0 && names.length === files.length} onChange={e => setNames(e.target.checked ? files.map(row => row.name) : [])} /></th><th>Arquivo</th><th>Gerado em</th><th>Expira em</th><th>Tamanho</th><th>Download</th></tr></thead><tbody>{files.map(file => <tr key={file.name}>
        <td><input type="checkbox" aria-label={`Selecionar ${file.name}`} disabled={busy} checked={names.includes(file.name)} onChange={e => setNames(e.target.checked ? [...names, file.name] : names.filter(name => name !== file.name))} /></td><td>{file.name}</td><td>{new Date(file.modifiedAt).toLocaleString('pt-BR')}</td><td>{new Date(file.expiresAt).toLocaleString('pt-BR')}</td><td>{Math.ceil(file.size / 1024)} KB</td><td><button aria-label={`Baixar ${file.name}`} className={styles.downloadIconButton} disabled={busy} onClick={() => void action(() => apiDownload(`reports/archive/${encodeURIComponent(file.name)}`, file.name))} title="Baixar PDF"><FileDownloadIcon /></button></td>
      </tr>)}</tbody></table>{!busy && !files.length ? <p className={styles.empty}>Nenhum relatório gerado disponível.</p> : null}</div></section>
    </div>
  </main>;
}
