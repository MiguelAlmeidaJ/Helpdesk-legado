"use client";

import type { MediaContextType, MediaItem, MediaList } from '@helpdesk/contracts';
import { useEffect, useId, useRef, useState } from 'react';
import { ApiError, apiDownload, apiRequest, apiUrl } from '../../../shared/api/api-client';

export const MEDIA_BUTTON = 'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm font-semibold text-app-text hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const CONTROL = 'min-h-10 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text';
export function mediaBytes(bytes: number) { return (bytes/1048576).toLocaleString('pt-BR',{maximumFractionDigits:2})+' MiB'; }
export function mediaError(error: unknown) {
  if (error instanceof ApiError) {
    const body = error.body as { message?: unknown } | null;
    if (typeof body?.message === 'string') return body.message;
    return 'Não foi possível concluir a operação de mídia ('+error.status+').';
  }
  return 'Não foi possível concluir a operação de mídia.';
}
export function MediaPanel({ contextType, contextId, admin = false, title = 'Central de Mídias', refreshToken = 0, onChanged }: { contextType?: MediaContextType; contextId?: string; admin?: boolean; title?: string; refreshToken?: number; onChanged?: ()=>void }) {
  const [result,setResult] = useState<MediaList | null>(null);
  const [offset,setOffset] = useState(0);
  const [draftSearch,setDraftSearch] = useState('');
  const [search,setSearch] = useState('');
  const [revision,setRevision] = useState(0);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [feedback,setFeedback] = useState<string | null>(null);
  const [file,setFile] = useState<File | null>(null);
  const [sourceId,setSourceId] = useState('');
  const [preview,setPreview] = useState<{ url:string; name:string } | null>(null);
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);setResult(null);
    const query = new URLSearchParams({offset:String(offset),limit:'20',search});
    if (contextType && contextId) { query.set('contextType',contextType);query.set('contextId',contextId); }
    apiRequest<MediaList>('media?'+query,{signal:controller.signal}).then(setResult).catch(error=>{
      if (!controller.signal.aborted) setFeedback(mediaError(error));
    }).finally(()=>{ if (!controller.signal.aborted) setLoading(false); });
    return ()=>controller.abort();
  },[contextType,contextId,offset,search,revision,refreshToken]);
  useEffect(()=>()=>{ if(preview) URL.revokeObjectURL(preview.url); },[preview]);
  useEffect(()=>{if(preview)dialog.current?.showModal();},[preview]);
  async function run(operation:()=>Promise<unknown>,message:string) {
    setBusy(true);setFeedback(null);
    try { await operation();setFeedback(message);setRevision(value=>value+1);onChanged?.(); }
    catch(error){ setFeedback(mediaError(error)); }
    finally { setBusy(false); }
  }
  async function view(item:MediaItem) {
    setBusy(true);
    try {
      const response=await fetch(apiUrl('media/'+item.id+'/content?inline=true'),{credentials:'include',cache:'no-store'});
      if(!response.ok) throw new ApiError(response.status,await response.json().catch(()=>null));
      setPreview({url:URL.createObjectURL(await response.blob()),name:item.originalName});
    }catch(error){setFeedback(mediaError(error));}finally{setBusy(false);}
  }
  return <section className="my-4 grid gap-4 rounded-xl border border-app-border bg-app-surface p-4 text-app-text" aria-label="Central de Mídias">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="m-0 text-lg font-bold">{title}</h2><p className="mb-0 mt-1 text-xs text-app-muted">Arquivos privados vinculados a este registro. As mídias legadas permanecem preservadas.</p></div>
      <button className={MEDIA_BUTTON} type="button" disabled={busy || loading} onClick={()=>setRevision(value=>value+1)}>Atualizar mídias</button>
    </div>
    {result?.canWrite && contextType && contextId ? <>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event=>{
        event.preventDefault();if(!file)return;
        const data=new FormData();data.set('file',file);data.set('contextType',contextType);data.set('contextId',contextId);
        void run(async()=>{await apiRequest('media',{method:'POST',body:data});setFile(null);if(fileInput.current)fileInput.current.value='';},'Mídia enviada e verificada.');
      }}>
        <label className="grid gap-1 text-xs font-semibold" htmlFor={inputId}><span>Enviar PNG, JPEG, WebP, GIF ou PDF</span><input ref={fileInput} id={inputId} type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" disabled={busy} onChange={event=>setFile(event.target.files?.[0] ?? null)} /></label>
        <button type="submit" className={MEDIA_BUTTON} disabled={busy || !file}>{busy?'Processando…':'Enviar mídia'}</button>
      </form>
      <form className="flex flex-wrap gap-2" onSubmit={event=>{
        event.preventDefault();void run(async()=>{await apiRequest('media/'+encodeURIComponent(sourceId)+'/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contextType,contextId})});setSourceId('');},'Mídia associada.');
      }}>
        <label className="flex flex-wrap items-center gap-2 text-xs font-semibold">Associar mídia existente<input className={CONTROL} value={sourceId} placeholder="ID da mídia" maxLength={36} required onChange={event=>setSourceId(event.target.value)} /></label>
        <button type="submit" className={MEDIA_BUTTON} disabled={busy || !sourceId}>Associar</button>
      </form>
    </> : null}
    <form className="flex flex-wrap gap-2" onSubmit={event=>{event.preventDefault();setOffset(0);setSearch(draftSearch);}}>
      <input aria-label="Pesquisar mídias pelo nome" className={CONTROL} maxLength={100} value={draftSearch} onChange={event=>setDraftSearch(event.target.value)} placeholder="Pesquisar por nome" />
      <button className={MEDIA_BUTTON} type="submit" disabled={busy}>Pesquisar</button>
    </form>
    {feedback ? <p role="status" className="m-0 text-sm text-app-muted">{feedback}</p>:null}
    {loading ? <p role="status">Carregando mídias…</p>:null}
    <ul className="m-0 grid list-none gap-3 p-0">{(result?.items ?? []).map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-app-border p-3">
      <div className="min-w-0"><strong className="break-all text-sm">{item.originalName}</strong><p className="mb-0 mt-1 text-xs text-app-muted">{mediaBytes(item.sizeBytes)} · {item.mimeType} · {item.provider} · {item.status}</p><p className="mb-0 mt-1 break-all text-xs text-app-muted">ID: {item.id}</p></div>
      <div className="flex flex-wrap gap-2">
        {item.status==='active' && item.mimeType.startsWith('image/')?<button className={MEDIA_BUTTON} disabled={busy} type="button" onClick={()=>void view(item)}>Visualizar</button>:null}
        <button className={MEDIA_BUTTON} disabled={busy || item.status!=='active'} type="button" onClick={()=>void run(()=>apiDownload('media/'+item.id+'/content',item.originalName),'Download concluído.')}>Baixar</button>
        {contextType==='catalog' && item.status==='active' && item.mimeType.startsWith('image/')?<button className={MEDIA_BUTTON} disabled={busy} type="button" onClick={()=>void run(()=>navigator.clipboard.writeText('/api/media/'+item.id+'/content?inline=true'),'Referência privada copiada para usar no catálogo.')}>Copiar referência</button>:null}
        {admin?<button className={MEDIA_BUTTON} disabled={busy} type="button" onClick={()=>void run(async()=>{const outcome=await apiRequest<{valid:boolean}>('media/'+item.id+'/verify',{method:'POST'});if(!outcome.valid)throw new ApiError(409,{message:'Não foi possível confirmar a integridade. Consulte o provedor e a auditoria.'});},'Integridade SHA-256 confirmada.')}>Verificar integridade</button>:null}
        {result?.canWrite?<button className={MEDIA_BUTTON} disabled={busy} type="button" onClick={()=>{if(window.confirm('Marcar esta mídia como excluída? O arquivo físico será preservado.'))void run(()=>apiRequest('media/'+item.id,{method:'DELETE'}),'Mídia excluída logicamente.');}}>Excluir logicamente</button>:null}
      </div>
    </li>)}</ul>
    {!loading && result?.items.length===0?<p className="m-0 text-sm text-app-muted">Nenhuma mídia encontrada.</p>:null}
    <div className="flex gap-2"><button className={MEDIA_BUTTON} disabled={loading || busy || offset===0} type="button" onClick={()=>setOffset(value=>Math.max(0,value-20))}>Anteriores</button><button className={MEDIA_BUTTON} disabled={loading || busy || !result?.hasMore} type="button" onClick={()=>setOffset(value=>value+20)}>Próximas</button></div>
    {preview?<dialog ref={dialog} aria-label={preview.name} onCancel={event=>{event.preventDefault();setPreview(null);}} className="fixed inset-0 z-50 h-[90vh] w-[95vw] max-w-none border-0 bg-app-surface p-5 text-app-text backdrop:bg-black/90"><div className="flex h-full flex-col gap-3"><div className="flex items-center justify-between gap-3"><strong>{preview.name}</strong><button autoFocus className={MEDIA_BUTTON} onClick={()=>setPreview(null)} type="button">Fechar visualização</button></div><img className="min-h-0 flex-1 object-contain" src={preview.url} alt={preview.name} /></div></dialog>:null}
  </section>;
}
