'use client';

import { useEffect, useRef, useState } from 'react';
import { apiBlob } from '../../../shared/api/api-client';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { reportError } from '../lib/report-export';

export function ReportPdfPreview({ name, onClose }: { name: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    dialog.current?.showModal();
    const controller = new AbortController();
    let objectUrl = '';
    apiBlob(`reports/archive/${encodeURIComponent(name)}/preview`, { signal: controller.signal })
      .then(blob => {
        if (controller.signal.aborted) return;
        if (blob.type !== 'application/pdf') throw new Error('Resposta de visualização inválida.');
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch(reason => { if (!controller.signal.aborted) setError(reportError(reason)); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [name]);

  return <dialog ref={dialog} aria-labelledby="pdf-preview-title" onClose={onClose} className="h-[90dvh] max-h-[90dvh] w-[1100px] max-w-[95vw] rounded-2xl border border-app-border bg-app-surface p-0 text-app-text shadow-xl backdrop:bg-black/50">
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-app-border p-4">
        <h2 id="pdf-preview-title" className="m-0 min-w-0 break-all text-sm font-bold">{name}</h2>
        <button autoFocus type="button" className={appButtonClass('secondary', 'sm')} onClick={() => dialog.current?.close()}>Fechar</button>
      </header>
      {error ? <p role="alert" className="p-4 text-app-danger">{error}</p> : url
        ? <iframe title={`Visualização de ${name}`} src={url} className="min-h-0 w-full flex-1 border-0" />
        : <p role="status" className="p-4 text-app-muted">Carregando visualização…</p>}
    </div>
  </dialog>;
}
