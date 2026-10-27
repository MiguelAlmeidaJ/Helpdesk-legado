import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type MediaProviderName = 'local' | 'nextcloud' | 'cloudinary';
export interface StoredMedia { provider: MediaProviderName; key: string; sizeBytes: number; sha256: string; }
export interface MediaStorageProvider {
  readonly name: MediaProviderName;
  put(data: Buffer, extension: string, mimeType: string): Promise<StoredMedia>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
export class MediaStorageError extends Error {
  constructor(readonly code: 'unavailable' | 'missing' | 'invalid' | 'too-large', message = 'Falha no armazenamento de mídia.') { super(message); }
}
export function mediaMaxBytes(): number {
  const mb = Number(process.env.MEDIA_MAX_UPLOAD_MB ?? 25);
  return Math.floor((Number.isFinite(mb) ? Math.max(1, Math.min(100, mb)) : 25) * 1048576);
}
export const mediaHash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
function fileKey(extension: string): string {
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (!/^(png|jpe?g|webp|gif|pdf)$/.test(ext)) throw new MediaStorageError('invalid');
  return `${new Date().toISOString().slice(0,7).replace('-', '/')}/${randomUUID()}.${ext}`;
}
function result(provider: MediaProviderName, key: string, data: Buffer): StoredMedia {
  return { provider, key, sizeBytes: data.length, sha256: mediaHash(data) };
}
export function validateMediaKey(key: string): string {
  if (!/^\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(png|jpeg|jpg|gif|webp|pdf)$/.test(key)) throw new MediaStorageError('invalid', 'Identificador de mídia inválido.');
  return key;
}
export class LocalMediaProvider implements MediaStorageProvider {
  readonly name = 'local';
  constructor(private readonly root: string) {
    if (!path.isAbsolute(root)) throw new MediaStorageError('invalid', 'MEDIA_LOCAL_ROOT precisa ser absoluto.');
  }
  private async resolve(key: string, create = false): Promise<string> {
    const parts = validateMediaKey(key).split('/');
    let current = path.parse(this.root).root;
    // Refuse junctions/symlinks at every component, including root ancestors.
    for (const part of path.resolve(this.root).slice(current.length).split(path.sep).filter(Boolean).concat(parts.slice(0, -1))) {
      current = path.join(current, part);
      if (create) await mkdir(current).catch((e: NodeJS.ErrnoException) => { if (e.code !== 'EEXIST') throw e; });
      const info = await lstat(current);
      if (info.isSymbolicLink() || !info.isDirectory()) throw new MediaStorageError('invalid', 'Links simbólicos não são permitidos no storage.');
    }
    const physical = path.join(await realpath(current), parts[parts.length - 1]!);
    const resolvedRoot = await realpath(this.root);
    const relative = path.relative(resolvedRoot,physical);
    if (relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) throw new MediaStorageError('invalid');
    return physical;
  }
  async put(data: Buffer, extension: string): Promise<StoredMedia> {
    if (!data.length || data.length > mediaMaxBytes()) throw new MediaStorageError('too-large');
    const key = fileKey(extension);
    await writeFile(await this.resolve(key, true), data, { flag: 'wx', mode: 0o600 });
    return result(this.name, key, data);
  }
  async read(key: string): Promise<Buffer> {
    const physical = await this.resolve(key), info = await lstat(physical);
    if (info.isSymbolicLink() || !info.isFile()) throw new MediaStorageError('invalid');
    if (info.size > mediaMaxBytes()) throw new MediaStorageError('too-large');
    const handle = await open(physical, 'r');
    try {
      const opened = await handle.stat();
      if (opened.size !== info.size || opened.ino !== info.ino) throw new MediaStorageError('invalid');
      const data = Buffer.alloc(info.size);
      let offset = 0;
      while (offset < data.length) {
        const { bytesRead } = await handle.read(data,offset,data.length-offset,offset);
        if (!bytesRead) throw new MediaStorageError('invalid');
        offset += bytesRead;
      }
      const after = await handle.stat();
      if (after.size !== info.size || after.mtimeMs !== info.mtimeMs) throw new MediaStorageError('invalid');
      return data;
    } finally { await handle.close(); }
  }
  async remove(key: string): Promise<void> {
    const physical = await this.resolve(key), info = await lstat(physical);
    if (!info.isFile() || info.isSymbolicLink()) throw new MediaStorageError('invalid');
    await unlink(physical);
  }
}
async function request(url: string, init: RequestInit): Promise<Response> {
  try { return await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(30000) }); }
  catch { throw new MediaStorageError('unavailable'); }
}
async function content(response: Response): Promise<Buffer> {
  if (!response.ok) throw new MediaStorageError(response.status === 404 ? 'missing' : 'unavailable');
  if (Number(response.headers.get('content-length')) > mediaMaxBytes()) {
    await response.body?.cancel().catch(()=>undefined);
    throw new MediaStorageError('too-large');
  }
  if (!response.body) throw new MediaStorageError('missing');
  const reader = response.body.getReader(), chunks: Buffer[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > mediaMaxBytes()) throw new MediaStorageError('too-large');
      chunks.push(Buffer.from(next.value));
    }
    return Buffer.concat(chunks);
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
export class NextcloudMediaProvider implements MediaStorageProvider {
  readonly name = 'nextcloud';
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly user: string, private readonly appPassword: string) {
    let url: URL;
    try { url = new URL(baseUrl); } catch { throw new MediaStorageError('invalid', 'Configure o WebDAV Nextcloud.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !user || !appPassword) throw new MediaStorageError('invalid', 'Configuração Nextcloud inválida.');
    this.baseUrl = url.toString().replace(/\/$/, '');
  }
  private url(key: string) { return this.baseUrl + '/' + validateMediaKey(key).split('/').map(encodeURIComponent).join('/'); }
  private headers() { return { Authorization: 'Basic ' + Buffer.from(this.user + ':' + this.appPassword).toString('base64') }; }
  private async folder(url: string) {
    const response = await request(url, { method: 'MKCOL', headers: this.headers() });
    if (![201,405].includes(response.status)) throw new MediaStorageError('unavailable');
  }
  async put(data: Buffer, extension: string, mimeType: string): Promise<StoredMedia> {
    if (!data.length || data.length > mediaMaxBytes()) throw new MediaStorageError('too-large');
    const key = fileKey(extension), parts = key.split('/');
    await this.folder(this.baseUrl + '/' + parts[0]);
    await this.folder(this.baseUrl + '/' + parts[0] + '/' + parts[1]);
    const response = await request(this.url(key), { method: 'PUT', headers: { ...this.headers(), 'Content-Type': mimeType, 'If-None-Match': '*', 'OC-Checksum': 'SHA256:' + mediaHash(data) }, body: new Uint8Array(data) });
    if (response.status !== 201) throw new MediaStorageError('unavailable');
    return result(this.name, key, data);
  }
  async read(key: string): Promise<Buffer> { return content(await request(this.url(key), { headers: this.headers() })); }
  async remove(key: string) {
    const response = await request(this.url(key), { method: 'DELETE', headers: this.headers() });
    if (!response.ok && response.status !== 404) throw new MediaStorageError('unavailable');
  }
}
export function cloudinarySignature(params: Record<string, string>, secret: string): string {
  return createHash('sha256').update(Object.keys(params).sort().map(key => key + '=' + params[key]).join('&') + secret).digest('hex');
}
export class CloudinaryMediaProvider implements MediaStorageProvider {
  readonly name = 'cloudinary';
  constructor(private readonly cloud: string, private readonly apiKey: string, private readonly apiSecret: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(cloud) || !apiKey || !apiSecret) throw new MediaStorageError('invalid', 'Configure as credenciais Cloudinary no servidor.');
  }
  private signed(params: Record<string,string>) { return { ...params, api_key: this.apiKey, signature: cloudinarySignature(params,this.apiSecret) }; }
  private endpoint(action: string) { return `https://api.cloudinary.com/v1_1/${this.cloud}/${action}`; }
  private identity(key: string) {
    const match = key.match(/^(image|raw):([a-zA-Z0-9_-]{10,100}):(helpdesk\/\d{4}\/(?:0[1-9]|1[0-2])\/[a-f0-9-]{36}(?:\.(?:png|jpeg|jpg|gif|webp|pdf))?)$/);
    if (!match) throw new MediaStorageError('invalid');
    return { resourceType: match[1]!, assetId: match[2]!, publicId: match[3]! };
  }
  async put(data: Buffer, extension: string, mimeType: string): Promise<StoredMedia> {
    if (!data.length || data.length > mediaMaxBytes()) throw new MediaStorageError('too-large');
    const key = fileKey(extension), resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
    const publicId = 'helpdesk/' + (resourceType === 'raw' ? key : key.replace(/\.[^.]+$/, ''));
    const params = this.signed({ public_id: publicId, timestamp: String(Math.floor(Date.now()/1000)), type: 'authenticated', overwrite: 'false' });
    const body = new FormData();
    body.append('file', new Blob([new Uint8Array(data)], { type: mimeType }), key.split('/').pop()!);
    for (const [name,value] of Object.entries(params)) body.append(name,value);
    const response = await request(this.endpoint(resourceType + '/upload'), { method: 'POST', body });
    if (!response.ok) throw new MediaStorageError('unavailable');
    const output = await response.json() as { public_id?: string; resource_type?: string; type?: string; asset_id?: string; bytes?: number };
    if (output.public_id !== publicId || output.resource_type !== resourceType || output.type !== 'authenticated' || !output.asset_id || (output.bytes !== undefined && output.bytes !== data.length)) throw new MediaStorageError('invalid');
    const storedKey = `${resourceType}:${output.asset_id}:${publicId}`;
    this.identity(storedKey);
    return result(this.name, storedKey, data);
  }
  async read(key: string): Promise<Buffer> {
    const { assetId } = this.identity(key), now = Math.floor(Date.now()/1000);
    const params = this.signed({ asset_id: assetId, timestamp: String(now), expires_at: String(now+60) });
    return content(await request(this.endpoint('asset/download'), { method: 'POST', body: new URLSearchParams(params) }));
  }
  async remove(key: string): Promise<void> {
    const { resourceType, publicId } = this.identity(key);
    const params = this.signed({ public_id: publicId, timestamp: String(Math.floor(Date.now()/1000)), type: 'authenticated', invalidate: 'true' });
    const response = await request(this.endpoint(resourceType + '/destroy'), { method: 'POST', body: new URLSearchParams(params) });
    if (!response.ok) throw new MediaStorageError('unavailable');
    const output = await response.json() as { result?: string };
    if (!['ok','not found'].includes(output.result ?? '')) throw new MediaStorageError('unavailable');
  }
}
export function mediaProvider(name: MediaProviderName): MediaStorageProvider {
  if (name === 'local') return new LocalMediaProvider(process.env.MEDIA_LOCAL_ROOT || 'C:\\HelpdeskMedia');
  if (name === 'nextcloud') return new NextcloudMediaProvider(process.env.MEDIA_NEXTCLOUD_WEBDAV_URL ?? '', process.env.MEDIA_NEXTCLOUD_USER ?? '', process.env.MEDIA_NEXTCLOUD_APP_PASSWORD ?? '');
  if (name === 'cloudinary') return new CloudinaryMediaProvider(process.env.MEDIA_CLOUDINARY_CLOUD_NAME ?? '', process.env.MEDIA_CLOUDINARY_API_KEY ?? '', process.env.MEDIA_CLOUDINARY_API_SECRET ?? '');
  throw new MediaStorageError('invalid');
}
export function configuredMediaProvider(): MediaStorageProvider { return mediaProvider((process.env.MEDIA_DEFAULT_PROVIDER || 'local') as MediaProviderName); }
