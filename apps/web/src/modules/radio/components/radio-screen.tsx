"use client";

import type { CurrentUserResponse } from '@helpdesk/contracts';
import { useRef, useState } from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';

const STATIONS = [
  {
    category: 'Pop / Hits / Outras',
    items: [
      ['Web Radio Atividade FM', 'https://stream.zeno.fm/zyygz61qachvv'],
      ['Rock FM', 'https://stream.zeno.fm/ntdot1fib96tv'],
      ['Churrasco FM', 'https://stream.zeno.fm/f67fcdnvpqzvv'],
      ['Light FM', 'https://stream.zeno.fm/jzyoimijevptv'],
      ['Radio Hits', 'https://wz7.servidoresbrasil.com:8162/stream'],
      ['Rádio FM O DIA', 'http://streaming.livespanel.com:20000/live'],
      ['Rádio JOVEM PAM', 'https://stream-170.zeno.fm/c45wbq2us3buv'],
      ['Nightride FM', 'https://stream.nightride.fm/nightride.mp3'],
      ['Lofi 24h', 'https://stream-169.zeno.fm/k7catc4s91zuv'],
      ['Alok', 'https://stream-170.zeno.fm/3as8dzs98a0uv'],
    ],
  },
  {
    category: 'Gospel',
    items: [
      ['Maranata Rio 107.3 FM', 'https://s03.svrdedicado.org:7564/stream'],
      ['Multisom Gospel 99.3 FM', 'https://servidor38-2.brlogic.com:8156/live'],
      ['Melodia FM', 'https://27433.live.streamtheworld.com/MELODIAFMAAC.aac'],
      ['Gospel Brasil', 'https://stm2.alphanetdigital.com.br:9818/stream'],
      ['Gospel FM', 'https://stm43.srvstm.com:8954/stream'],
      ['Rádio Shekinah', 'https://player.voxpainel.com.br/proxy/7076'],
      ['Rádio Louvor', 'https://stream-153.zeno.fm/35rk7gcpn3quv'],
      ['Louvor e Avivamento', 'https://stm1.xcast.com.br:9616/stream'],
      ['Gospel FM Vós Sois a Luz', 'https://stream-178.zeno.fm/a7yw68sbqxhvv'],
      ['Recordações Gospel', 'https://stream-154.zeno.fm/v170rpknne2vv'],
    ],
  },
] as const;

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover';

export function RadioScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState('');

  async function play(name: string, url: string) {
    const audio = audioRef.current;
    if (!audio) return;
    setError('');
    setCurrent({ name, url });
    audio.src = url;
    try {
      await audio.play();
    } catch {
      setError(
        url.startsWith('http://')
          ? 'Este stream usa HTTP e pode ser bloqueado pelo navegador quando o Helpdesk estiver em HTTPS.'
          : 'Não foi possível iniciar este stream. A emissora pode estar temporariamente indisponível.',
      );
    }
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setCurrent(null);
    setError('');
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          current ? (
            <button className={BUTTON} onClick={stop} type="button">
              Parar rádio
            </button>
          ) : undefined
        }
        subtitle="Ouça as emissoras que já estavam disponíveis no sistema legado."
        title="Rádio"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1200px] px-6 py-6 max-sm:px-3.5">
        <section className="mb-4 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.06em] text-app-muted">
                Reproduzindo
              </span>
              <h2 className="m-0 mt-1 text-lg font-bold">
                {current?.name ?? 'Selecione uma emissora'}
              </h2>
            </div>
            <audio className="w-full max-w-[520px]" controls ref={audioRef} />
          </div>
          {error ? (
            <p className="m-0 mt-3 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-2 text-xs text-app-danger">
              {error}
            </p>
          ) : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {STATIONS.map((group) => (
            <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm" key={group.category}>
              <div className="mb-3 border-b border-app-border-soft pb-3">
                <h2 className="m-0 text-sm font-extrabold">{group.category}</h2>
                <p className="m-0 mt-1 text-xs text-app-muted">
                  {group.items.length} emissora(s)
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map(([name, url]) => {
                  const active = current?.url === url;
                  return (
                    <button
                      className={[
                        'min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-bold transition',
                        active
                          ? 'border-app-brand bg-app-brand-soft text-app-brand'
                          : 'border-app-border bg-app-surface-muted text-app-text hover:bg-app-surface-hover',
                      ].join(' ')}
                      key={url}
                      onClick={() => void play(name, url)}
                      type="button"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
