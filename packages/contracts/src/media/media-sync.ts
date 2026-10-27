import type { MediaContext, MediaProvider } from './media';

export interface MediaSyncEntry {
  key: string;
  sourceType: string;
  sourceId: string;
  name: string;
  context: MediaContext;
  identitySha256: string;
  sha256: string | null;
  size: number;
  availability: 'file' | 'missing' | 'external' | 'unsupported';
}
export interface MediaSyncManifest {
  schema: 1;
  origin: string;
  dump: string;
  complete: boolean;
  provider: MediaProvider;
  entries: MediaSyncEntry[];
}
export type MediaSyncAction = 'new' | 'changed' | 'duplicate' | 'unchanged' | 'missing' | 'external' | 'unsupported' | 'invalid-link' | 'absent' | 'deleted';
export interface MediaSyncRun {
  id: string; origin: string; dump: string; status: string;
  createdAt: string; manifestHash: string; approvedBy: number | null;
  checkpoint: number; total: number;
}
export interface MediaSyncReport {
  run: MediaSyncRun;
  summary: { action: string; state: string; count: number; bytes: number; saved: number }[];
  items: { sequence: number; key: string; sourceType:string; sourceId:string; context:MediaContext; action: string; state: string; error: string | null; mediaId: string | null }[];
  hasMore: boolean;
  batches: MediaSyncBatch[];
}
export interface MediaSyncBatch {
  id:string; status:string; fromSequence:number; toSequence:number|null;
  processed:number; failed:number; startedAt:string; completedAt:string|null;
}
