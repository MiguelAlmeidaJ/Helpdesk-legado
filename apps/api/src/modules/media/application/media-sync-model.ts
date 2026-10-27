import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { MediaSyncEntry, MediaSyncManifest, MediaSyncAction } from '@helpdesk/contracts';
import { mediaContext, mediaFilename } from './media-validation';
import { validMediaProvider } from './media.service';

export const syncHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const referenceKey = (entry: MediaSyncEntry) => syncHash(entry.key);
export function contentId(provider: string, sha: string, size: number): string {
  const hash = syncHash(`helpdesk-sync-v1:${provider}:${sha}:${size}`);
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
export function syncManifest(input: unknown): MediaSyncManifest {
  if (!input || typeof input !== 'object') throw new BadRequestException('Manifesto inválido.');
  const m = input as MediaSyncManifest;
  const label = (v: unknown) => typeof v === 'string' && /^[a-z0-9][a-z0-9_.-]{0,99}$/.test(v);
  if (m.schema !== 1 || !label(m.origin) || !label(m.dump) || typeof m.complete !== 'boolean' || !Array.isArray(m.entries) || m.entries.length > 50000) throw new BadRequestException('Origem, dump ou inventário inválido.');
  const keys = new Set<string>();
  const entries = m.entries.map(e => {
    if (!e || typeof e.key !== 'string' || !/^[a-zA-Z0-9_:.-]{1,200}$/.test(e.key) || keys.has(e.key) || typeof e.sourceType !== 'string' || !/^[a-z_-]{1,50}$/.test(e.sourceType) || typeof e.sourceId !== 'string' || !/^[a-zA-Z0-9:.-]{1,100}$/.test(e.sourceId) || typeof e.name !== 'string' || e.name.length > 255 || !/^[a-f0-9]{64}$/.test(e.identitySha256) || !['file','missing','external','unsupported'].includes(e.availability) || !Number.isSafeInteger(e.size) || e.size < 0 || e.size > 104857600 || (e.availability === 'file' ? !/^[a-f0-9]{64}$/.test(e.sha256 ?? '') : e.sha256 !== null)) throw new BadRequestException('Referência inválida ou repetida.');
    keys.add(e.key);
    return { key:e.key, sourceType:e.sourceType, sourceId:e.sourceId, name:mediaFilename(e.name), context:mediaContext(e.context?.type,e.context?.id), identitySha256:e.identitySha256, sha256:e.sha256, size:e.size, availability:e.availability };
  }).sort((a,b)=>a.key.localeCompare(b.key,'en'));
  return { schema:1,origin:m.origin,dump:m.dump,complete:m.complete,provider:validMediaProvider(m.provider),entries };
}
export function classifyEntry(entry: MediaSyncEntry, previous: MediaSyncEntry | null, duplicate: boolean, deleted = false): MediaSyncAction {
  if (previous && entry.identitySha256 !== previous.identitySha256) return 'invalid-link';
  if (deleted) return 'deleted';
  if (entry.availability !== 'file') return entry.availability;
  if (previous && previous.sha256 === entry.sha256 && previous.size === entry.size && previous.context.type === entry.context.type && previous.context.id === entry.context.id) return 'unchanged';
  if (previous) return 'changed';
  return duplicate ? 'duplicate' : 'new';
}
