"use client";
import type { MediaSyncReport, MediaSyncRun } from '@helpdesk/contracts';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../../shared/api/api-client';
import { MEDIA_BUTTON, mediaBytes, mediaError } from './media-panel';

const LABELS:Record<string,string>={new:'Novos',changed:'Alterados',duplicate:'Duplicatas',unchanged:'Sem alteração',missing:'Arquivos ausentes',absent:'Referências ausentes no dump',external:'Externas',unsupported:'Formato não suportado','invalid-link':'Vínculos inválidos',deleted:'Excluídos, aguardando revisão',compared:'Comparação pronta',approved:'Aprovada',partial:'Parcial',completed:'Concluída',cancelled:'Cancelada',pending:'Pendente',done:'Conferido',failed:'Falhou'};
export function MediaSyncPanel() {
  const [runs,setRuns]=useState<MediaSyncRun[]>([]),[report,setReport]=useState<MediaSyncReport|null>(null);
  const [revision,setRevision]=useState(0),[page,setPage]=useState(0),[offset,setOffset]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const [receipt,setReceipt]=useState(''),[confirmation,setConfirmation]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    apiRequest<MediaSyncRun[]>(`media/sync?offset=${page}`,{signal:controller.signal}).then(setRuns).catch(e=>{if(!controller.signal.aborted)setError(mediaError(e));});
    return ()=>controller.abort();
  },[revision,page]);
  const runId=report?.run.id;
  useEffect(()=>{
    if(!runId)return;
    const controller=new AbortController();
    apiRequest<MediaSyncReport>(`media/sync/${runId}?offset=${offset}`,{signal:controller.signal}).then(setReport).catch(e=>{if(!controller.signal.aborted)setError(mediaError(e));});
    return ()=>controller.abort();
  },[runId,offset,revision]);
  async function select(id:string){setBusy(true);setError(null);setConfirmation('');setReceipt('');setOffset(0);try{setReport(await apiRequest<MediaSyncReport>(`media/sync/${id}`));}catch(e){setError(mediaError(e));}finally{setBusy(false);}}
  async function action(name:'approve'|'retry'|'cancel'){
    if(!report)return;setBusy(true);setError(null);
    try{await apiRequest(`media/sync/${report.run.id}/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receipt,confirmation})});setRevision(v=>v+1);setConfirmation('');}catch(e){setError(mediaError(e));}finally{setBusy(false);}
  }
  return <section aria-labelledby="media-sync-title" className="grid gap-4 rounded-xl border border-app-border bg-app-surface p-5">
    <div className="flex flex-wrap justify-between gap-3"><h2 id="media-sync-title" className="m-0 text-lg font-bold">Migração e Sincronização</h2><button type="button" className={MEDIA_BUTTON} disabled={busy} onClick={()=>setRevision(v=>v+1)}>Atualizar histórico</button></div>
    <p className="m-0 text-sm text-app-muted">Compare o inventário do dump validado em ambiente isolado. Arquivos e versões anteriores são preservados. A aplicação em lotes exige aprovação deste relatório, confirmação no servidor e backups verificados dos dois bancos.</p>
    <form onSubmit={async event=>{
      event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setError(null);
      try{const result=await apiRequest<MediaSyncReport>('media/sync/compare',{method:'POST',body:data});setReport(result);setOffset(0);setRevision(v=>v+1);form.reset();}catch(e){setError(mediaError(e));}finally{setBusy(false);}
    }} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm font-semibold">Manifesto do dump (JSON, até 20 MiB)<input name="manifest" type="file" accept="application/json,.json" required disabled={busy}/></label>
      <button className={MEDIA_BUTTON} type="submit" disabled={busy}>Comparar sem transferir arquivos</button>
    </form>
    {error?<p role="alert" className="text-sm text-app-muted">{error}</p>:null}
    <ul className="m-0 grid list-none gap-2 p-0">{runs.map(run=><li key={run.id}><button type="button" className={MEDIA_BUTTON} disabled={busy} onClick={()=>void select(run.id)}>{run.origin} · {run.dump} · {LABELS[run.status]??run.status} · {run.checkpoint}/{run.total} · {new Date(run.createdAt).toLocaleString('pt-BR')}</button></li>)}</ul>
    {!runs.length?<p className="text-sm text-app-muted">Nenhuma comparação registrada nesta página.</p>:null}
    <div className="flex gap-2"><button className={MEDIA_BUTTON} disabled={busy||page===0} onClick={()=>setPage(v=>Math.max(0,v-30))}>Histórico anterior</button><button className={MEDIA_BUTTON} disabled={busy||runs.length<30} onClick={()=>setPage(v=>v+30)}>Mais histórico</button></div>
    {report?<div className="grid gap-3 border-t border-app-border pt-4">
      <h3 className="m-0 font-semibold">Relatório · {report.run.dump} · {LABELS[report.run.status]??report.run.status}</h3>
      <p className="m-0 break-all text-xs text-app-muted">Execução: {report.run.id}<br/>SHA-256 do manifesto: {report.run.manifestHash}<br/>Checkpoint: {report.run.checkpoint}/{report.run.total}</p>
      {report.batches?.length?<details><summary className="cursor-pointer text-sm font-semibold">Lotes recentes desta execução</summary><ul className="grid list-none gap-1 p-0 text-xs">{report.batches.map(batch=><li key={batch.id}>{batch.id} · {batch.status} · itens {batch.fromSequence}–{batch.toSequence??'…'} · {batch.processed} processados · {batch.failed} falhas · {new Date(batch.startedAt).toLocaleString('pt-BR')}</li>)}</ul></details>:null}
      <ul className="m-0 grid list-none gap-1 p-0 text-sm">{report.summary.map(s=><li key={s.action+':'+s.state}>{LABELS[s.action]??s.action}: {s.count} · {LABELS[s.state]??s.state} · {mediaBytes(s.bytes)} · economia confirmada: {mediaBytes(s.saved)}</li>)}</ul>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Integridade e resultado por referência</caption><thead><tr><th>Referência e destino</th><th>Comparação</th><th>Resultado</th><th>Falha</th></tr></thead><tbody>{report.items.map(item=><tr key={item.sequence}><td>{item.sequence} · {item.key}<br/>{item.context.type}:{item.context.id}</td><td>{LABELS[item.action]??item.action}</td><td>{LABELS[item.state]??item.state}</td><td>{item.error??'—'}</td></tr>)}</tbody></table></div>
      <div className="flex gap-2"><button className={MEDIA_BUTTON} disabled={busy||offset===0} onClick={()=>setOffset(v=>Math.max(0,v-100))}>Itens anteriores</button><button className={MEDIA_BUTTON} disabled={busy||!report.hasMore} onClick={()=>setOffset(v=>v+100)}>Mais itens</button></div>
      {report.run.status==='compared'?<form className="grid gap-3" onSubmit={event=>{event.preventDefault();void action('approve');}}>
        <label className="grid gap-1 text-sm">Comprovante de backups verificados (UUID)<input className="rounded border border-app-border bg-app-surface p-2" value={receipt} onChange={e=>setReceipt(e.target.value)} required/></label>
        <label className="grid gap-1 text-sm">Digite APROVAR {report.run.id}<input className="rounded border border-app-border bg-app-surface p-2" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" required/></label>
        <button type="submit" className={MEDIA_BUTTON} disabled={busy||confirmation!=='APROVAR '+report.run.id||!receipt}>Aprovar aplicação pelo operador</button>
      </form>:null}
      {report.run.status==='partial'?<button className={MEDIA_BUTTON} disabled={busy} onClick={()=>void action('retry')}>Preparar retomada dos itens com falha</button>:null}
      {['compared','approved','partial'].includes(report.run.status)?<button className={MEDIA_BUTTON} disabled={busy} onClick={()=>void action('cancel')}>Cancelar execução e preservar importações concluídas</button>:null}
    </div>:null}
  </section>;
}
