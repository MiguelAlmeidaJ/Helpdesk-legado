"use client";
import type { CurrentUserResponse, MediaProvider, MediaStatus } from '@helpdesk/contracts';
import { useEffect,useState } from 'react';
import { apiRequest } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { MEDIA_BUTTON,MediaPanel,mediaBytes,mediaError } from './media-panel';

export function MediaAdminScreen({currentUser}:{currentUser:CurrentUserResponse}) {
  const [status,setStatus]=useState<MediaStatus | null>(null);
  const [provider,setProvider]=useState<MediaProvider>('local');
  const [feedback,setFeedback]=useState<string | null>(null);
  const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    apiRequest<MediaStatus>('media/status',{signal:controller.signal}).then(value=>{setStatus(value);setProvider(value.defaultProvider);}).catch(error=>{if(!controller.signal.aborted)setFeedback(mediaError(error));});
    return ()=>controller.abort();
  },[revision]);
  return <main className="min-h-screen bg-app-bg text-app-text">
    <AppPageHeader title="Central de Mídias" subtitle="Armazenamento privado, associações e integridade dos arquivos." user={currentUser}/>
    <div className="mx-auto grid max-w-[1500px] gap-5 p-5">
      <section className="grid gap-4 rounded-xl border border-app-border bg-app-surface p-5">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="m-0 text-lg font-bold">Configuração de armazenamento</h2><button type="button" className={MEDIA_BUTTON} onClick={()=>setRevision(value=>value+1)}>Atualizar status</button></div>
        {status && !status.available?<p role="status" className="text-app-muted">A Central está {status.enabled?'aguardando a configuração do banco de metadados':'desabilitada'}. Configure a conexão independente no servidor.</p>:null}
        <form className="flex flex-wrap items-end gap-3" onSubmit={async event=>{
          event.preventDefault();setBusy(true);setFeedback(null);
          try{await apiRequest('media/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({defaultProvider:provider})});setFeedback('Provedor padrão atualizado para novos uploads.');setRevision(value=>value+1);}catch(error){setFeedback(mediaError(error));}finally{setBusy(false);}
        }}>
          <label className="grid gap-1 text-sm font-semibold">Provedor para novos uploads<select className="min-h-10 rounded-lg border border-app-border-strong bg-app-surface px-3" value={provider} onChange={event=>setProvider(event.target.value as MediaProvider)}>{(status?.providers ?? []).map(item=><option key={item.name} value={item.name} disabled={!item.configured}>{item.name}{item.configured?'':' · credenciais pendentes'}</option>)}</select></label>
          <button className={MEDIA_BUTTON} disabled={busy || !status?.available} type="submit">Salvar provedor padrão</button>
        </form>
        <p className="m-0 text-xs text-app-muted">Limite por arquivo: {mediaBytes(status?.maxUploadBytes ?? 0)}. Cada mídia mantém seu provedor original. Exclusões lógicas preservam os arquivos e continuam ocupando armazenamento.</p>
        {feedback?<p role="status" className="m-0 text-sm text-app-muted">{feedback}</p>:null}
      </section>
      <section aria-label="Armazenamento utilizado" className="grid gap-3 md:grid-cols-3">{(status?.providers ?? []).map(item=>{
        const usage=(status?.usage ?? []).filter(row=>row.provider===item.name);
        return <div key={item.name} className="rounded-xl border border-app-border bg-app-surface p-4"><h2 className="m-0 text-base font-bold">{item.name}</h2><strong className="mt-2 block text-xl">{mediaBytes(usage.reduce((sum,row)=>sum+row.bytes,0))}</strong><p className="mb-0 text-sm text-app-muted">{usage.reduce((sum,row)=>sum+row.count,0)} objeto(s) · {item.configured?'configurado':'configuração pendente'}</p>{usage.map(row=><p key={row.status} className="mb-0 text-xs text-app-muted">{row.status}: {row.count} · {mediaBytes(row.bytes)}</p>)}</div>;
      })}</section>
      {status?.available?<><MediaPanel title="Mídias de sistema" contextType="system" contextId="global" admin refreshToken={revision} onChanged={()=>setRevision(value=>value+1)}/><MediaPanel title="Acervo de mídias" admin refreshToken={revision} onChanged={()=>setRevision(value=>value+1)}/>
        <section className="rounded-xl border border-app-border bg-app-surface p-4"><h2 className="text-lg font-bold">Auditoria recente</h2><ul className="grid list-none gap-2 p-0">{status.recentAudit.map((item,index)=><li key={index} className="text-sm">{new Date(item.createdAt).toLocaleString('pt-BR')} · {item.action} · {item.result}</li>)}</ul></section>
      </>:null}
    </div>
  </main>;
}
