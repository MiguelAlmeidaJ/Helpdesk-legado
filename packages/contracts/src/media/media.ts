export type MediaProvider = 'local' | 'nextcloud' | 'cloudinary';
export type MediaContextType = 'system' | 'catalog' | 'ticket' | 'project' | 'task';
export interface MediaContext { type: MediaContextType; id: string; }
export interface MediaItem {
  id: string;
  provider: MediaProvider;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: 'active' | 'quarantined' | 'missing' | 'deleted';
  createdAt: string;
  links: MediaContext[];
}
export interface MediaList { items: MediaItem[]; offset: number; limit: number; hasMore: boolean; canWrite: boolean; }
export interface MediaStatus {
  enabled: boolean; available: boolean; defaultProvider: MediaProvider; maxUploadBytes: number;
  providers: { name: MediaProvider; configured: boolean }[];
  usage: { provider: MediaProvider; status: string; count: number; bytes: number }[];
  recentAudit: { action: string; result: string; createdAt: string }[];
}
