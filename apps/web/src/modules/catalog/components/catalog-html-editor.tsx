"use client";

import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

type CatalogHtmlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const TOOL =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-app-border bg-app-surface px-2.5 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50';

function cleanDocumentHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export function CatalogHtmlEditor({
  value,
  onChange,
  disabled = false,
}: CatalogHtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (mode !== 'visual' || !editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [mode, value]);

  useEffect(() => {
    if (!expanded) return;

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false);
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  function syncVisual() {
    if (!editorRef.current) return;
    onChange(cleanDocumentHtml(editorRef.current.innerHTML));
  }

  function command(name: string, argument?: string) {
    if (disabled || mode !== 'visual') return;
    editorRef.current?.focus();
    document.execCommand(name, false, argument);
    syncVisual();
  }

  function createLink() {
    if (disabled || mode !== 'visual') return;
    const url = window.prompt('Informe a URL do link:');
    if (!url?.trim()) return;
    const normalized = url.trim();
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(normalized)) {
      window.alert('Use uma URL iniciada por http://, https://, mailto: ou tel:.');
      return;
    }
    command('createLink', normalized);
  }

  async function addImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled || mode !== 'visual') return;

    if (!file.type.startsWith('image/')) {
      window.alert('Selecione um arquivo de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert('A imagem deve ter no máximo 5 MB.');
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Falha ao ler a imagem.'));
      reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler a imagem.'));
      reader.readAsDataURL(file);
    });

    editorRef.current?.focus();
    document.execCommand('insertImage', false, dataUrl);
    syncVisual();
  }

  function switchMode(next: 'visual' | 'html') {
    if (next === mode) return;
    if (mode === 'visual') syncVisual();
    setMode(next);
  }

  function handleShortcut(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      command('bold');
    } else if (key === 'i') {
      event.preventDefault();
      command('italic');
    } else if (key === 'u') {
      event.preventDefault();
      command('underline');
    }
  }

  const editor = (
    <div
      className={[
        'overflow-hidden rounded-xl border border-app-border-strong bg-app-surface shadow-sm',
        expanded
          ? 'fixed inset-4 z-[130] flex flex-col shadow-2xl max-sm:inset-0 max-sm:rounded-none'
          : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-app-border-soft bg-app-surface-muted p-2">
        <div className="mr-1 flex rounded-lg border border-app-border bg-app-surface p-0.5">
          <button
            aria-pressed={mode === 'visual'}
            className="rounded-md px-3 py-1.5 text-xs font-bold text-app-muted transition hover:bg-app-surface-hover aria-pressed:bg-app-brand aria-pressed:text-white"
            onClick={() => switchMode('visual')}
            type="button"
          >
            Visual
          </button>
          <button
            aria-pressed={mode === 'html'}
            className="rounded-md px-3 py-1.5 text-xs font-bold text-app-muted transition hover:bg-app-surface-hover aria-pressed:bg-app-brand aria-pressed:text-white"
            onClick={() => switchMode('html')}
            type="button"
          >
            HTML
          </button>
        </div>

        {mode === 'visual' ? (
          <>
            <select
              aria-label="Estilo do parágrafo"
              className="min-h-9 rounded-lg border border-app-border bg-app-surface px-2 text-xs font-semibold text-app-text outline-none"
              disabled={disabled}
              onChange={(event) => command('formatBlock', event.target.value)}
              value=""
            >
              <option value="" disabled>Formato</option>
              <option value="p">Parágrafo</option>
              <option value="h2">Título</option>
              <option value="h3">Subtítulo</option>
              <option value="blockquote">Citação</option>
              <option value="pre">Código</option>
            </select>

            <button className={TOOL} disabled={disabled} onClick={() => command('bold')} title="Negrito (Ctrl+B)" type="button">B</button>
            <button className={`${TOOL} italic`} disabled={disabled} onClick={() => command('italic')} title="Itálico (Ctrl+I)" type="button">I</button>
            <button className={`${TOOL} underline`} disabled={disabled} onClick={() => command('underline')} title="Sublinhado (Ctrl+U)" type="button">U</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('strikeThrough')} title="Tachado" type="button">S̶</button>

            <span className="mx-0.5 h-6 w-px bg-app-border" />

            <button className={TOOL} disabled={disabled} onClick={() => command('insertUnorderedList')} title="Lista com marcadores" type="button">• Lista</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('insertOrderedList')} title="Lista numerada" type="button">1. Lista</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('outdent')} title="Diminuir recuo" type="button">←</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('indent')} title="Aumentar recuo" type="button">→</button>

            <span className="mx-0.5 h-6 w-px bg-app-border" />

            <button className={TOOL} disabled={disabled} onClick={() => command('justifyLeft')} title="Alinhar à esquerda" type="button">≡</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('justifyCenter')} title="Centralizar" type="button">≡</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('justifyRight')} title="Alinhar à direita" type="button">≡</button>
            <button className={TOOL} disabled={disabled} onClick={createLink} title="Inserir link" type="button">Link</button>
            <button className={TOOL} disabled={disabled} onClick={() => imageInputRef.current?.click()} title="Inserir imagem" type="button">Imagem</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('removeFormat')} title="Limpar formatação" type="button">Limpar</button>

            <span className="mx-0.5 h-6 w-px bg-app-border" />

            <button className={TOOL} disabled={disabled} onClick={() => command('undo')} title="Desfazer" type="button">↶</button>
            <button className={TOOL} disabled={disabled} onClick={() => command('redo')} title="Refazer" type="button">↷</button>
          </>
        ) : null}

        <div className="ml-auto">
          <button
            className={TOOL}
            onClick={() => setExpanded((current) => !current)}
            title={expanded ? 'Sair da tela cheia' : 'Editar em tela cheia'}
            type="button"
          >
            {expanded ? 'Reduzir' : 'Tela cheia'}
          </button>
        </div>

        <input
          accept="image/*"
          className="hidden"
          onChange={(event) => void addImage(event)}
          ref={imageInputRef}
          type="file"
        />
      </div>

      {mode === 'visual' ? (
        <div
          className={[
            'catalog-rich-editor min-h-[420px] overflow-auto bg-white px-5 py-4 text-[15px] leading-7 text-slate-900 outline-none',
            expanded ? 'min-h-0 flex-1' : 'max-h-[620px]',
            disabled ? 'cursor-not-allowed opacity-60' : '',
            '[&_h1]:text-3xl [&_h1]:font-bold [&_h2]:my-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:my-3 [&_h3]:text-xl [&_h3]:font-bold',
            '[&_p]:my-3 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-7 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-7',
            '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600',
            '[&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm',
            '[&_a]:text-blue-700 [&_a]:underline [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg',
            '[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2',
          ].join(' ')}
          contentEditable={!disabled}
          onBlur={syncVisual}
          onInput={syncVisual}
          onKeyDown={handleShortcut}
          ref={editorRef}
          suppressContentEditableWarning
        />
      ) : (
        <textarea
          className={[
            'w-full resize-none bg-slate-950 p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none',
            expanded ? 'min-h-0 flex-1' : 'min-h-[420px]',
          ].join(' ')}
          disabled={disabled}
          onChange={(event) => onChange(cleanDocumentHtml(event.target.value))}
          spellCheck={false}
          value={value}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border-soft bg-app-surface-muted px-3 py-2 text-[11px] text-app-muted">
        <span>
          Editor visual com HTML compatível com os catálogos atuais.
        </span>
        <span>{value.length.toLocaleString('pt-BR')} caracteres</span>
      </div>
    </div>
  );

  return editor;
}
