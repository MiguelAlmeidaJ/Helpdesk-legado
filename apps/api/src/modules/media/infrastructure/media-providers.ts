import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type MediaProviderName = 'local' | 'nextcloud' | 'cloudinary';
export interface StoredMedia {
  provider: MediaProviderName;
  key: string;
  sizeBytes: number;
  sha256: string;
}
export interface MediaStorageProvider {
  readonly name: MediaProviderName;
  put(data: Buffer, extension: string, mimeType: string): Promise<StoredMedia>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

function safeExtension(value: string): string {
  const ext = value.toLowerCase().replace(/^\./, '');
  if (!/^(png|jpe?g|webp|gif|pdf)$/.test(ext)) throw new Error('Extensão de mídia não autorizada.');
  return ext;
}
function fileKey(extension: string): string {
  const today = new Date();
  return `${today.getUTCFullYear()}/${String(today.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${safeExtension(extension)}`;
}
function result(provider: MediaProviderName, key: string, data: Buffer): StoredMedia {
  return { provider, key, sizeBytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
}
function validateKey(key: string): string {
  if (!/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.(png|jpeg|jpg|gif|webp|pdf)$/.test(key))
    throw new Error('Identificador de mídia inválido.');
  return key;
}
export class LocalMediaProvider implements MediaStorageProvider {
  readonly name = 'local';
  constructor(private readonly root: string) {
    if (!path.isAbsolute(root)) throw new Error('MEDIA_LOCAL_ROOT precisa ser absoluto.');
  }
  private resolve(key: string): string { return path.join(this.root, ...validateKey(key).split('/')); }
  async put(data: Buffer, extension: string): Promise<StoredMedia> {
    const key = fileKey(extension), physical = this.resolve(key);
    await mkdir(path.dirname(physical), { recursive: true });
    await writeFile(physical, data, { flag: 'wx' });
    return result(this.name, key, data);
  }
  read(key: string) { return readFile(this.resolve(key)); }
  async remove(key: string) { await unlink(this.resolve(key)); }
}

export class NextcloudMediaProvider implements MediaStorageProvider {
  readonly name = 'nextcloud';
  constructor(private readonly baseUrl: string, private readonly user: string, private readonly appPassword: string) {
    if (!baseUrl.startsWith('https://')) throw new Error('Nextcloud WebDAV deve usar HTTPS.');
  }
  private url(key: string) { return this.baseUrl.replace(/\/$/, '') + '/' + validateKey(key).split('/').map(encodeURIComponent).join('/'); }
  private headers(): Record<string, string> {
    return { Authorization: 'Basic ' + Buffer.from(this.user + ':' + this.appPassword).toString('base64') };
  }
  private async folder(url: string) {
    const response = await fetch(url, { method: 'MKCOL', headers: this.headers() });
    if (![201, 405].includes(response.status)) throw new Error('Falha criando pasta WebDAV: ' + response.status);
  }
  async put(data: Buffer, extension: string, mimeType: string): Promise<StoredMedia> {
    const key = fileKey(extension);
    const parts = key.split('/');
    const base = this.baseUrl.replace(/\/$/, '');
    await this.folder(base + '/' + encodeURIComponent(parts[0] ?? ''));
    await this.folder(base + '/' + encodeURIComponent(parts[0] ?? '') + '/' + encodeURIComponent(parts[1] ?? ''));
    const response = await fetch(this.url(key), { method: 'PUT', headers: { ...this.headers(), 'Content-Type': mimeType }, body: new Uint8Array(data) });
    if (!response.ok) throw new Error('Upload Nextcloud falhou: ' + response.status);
    return result(this.name, key, data);
  }
  async read(key: string): Promise<Buffer> {
    const response = await fetch(this.url(key), { headers: this.headers() });
    if (!response.ok) throw new Error('Leitura Nextcloud falhou: ' + response.status);
    return Buffer.from(await response.arrayBuffer());
  }
  async remove(key: string) {
    const response = await fetch(this.url(key), { method: 'DELETE', headers: this.headers() });
    if (!response.ok && response.status !== 404) throw new Error('Exclusão Nextcloud falhou: ' + response.status);
  }
}

export class CloudinaryMediaProvider implements MediaStorageProvider {
  readonly name = 'cloudinary';
  constructor(private readonly cloud: string, private readonly apiKey: string, private readonly apiSecret: string) {}
  async put(data: Buffer, extension: string, mimeType: string): Promise<StoredMedia> {
    const key = fileKey(extension), publicId = 'helpdesk/' + key.replace(/\.[^.]+$/, '');
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
    const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${this.apiSecret}`).digest('hex');
    const body = new FormData();
    body.append('file', new Blob([new Uint8Array(data)], { type: mimeType }), key.split('/').pop() ?? 'media');
    body.append('public_id', publicId);
    body.append('timestamp', String(timestamp));
    body.append('api_key', this.apiKey);
    body.append('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloud)}/${resourceType}/upload`, { method: 'POST', body });
    if (!response.ok) throw new Error('Upload Cloudinary falhou: ' + response.status);
    const output = await response.json() as { public_id: string; resource_type: string };
    return result(this.name, output.resource_type + ':' + output.public_id, data);
  }
  async read(_key: string): Promise<Buffer> {
    throw new Error('Leitura privada Cloudinary requer URL assinada de entrega; não disponibilizar URL pública implicitamente.');
  }
  async remove(_key: string): Promise<void> {
    throw new Error('Exclusão Cloudinary requer validação de propriedade e API assinada.');
  }
}

export function configuredMediaProvider(): MediaStorageProvider {
  const name = process.env.MEDIA_DEFAULT_PROVIDER ?? 'local';
  if (name === 'local') return new LocalMediaProvider(process.env.MEDIA_LOCAL_ROOT ?? '');
  if (name === 'nextcloud') return new NextcloudMediaProvider(
    process.env.MEDIA_NEXTCLOUD_WEBDAV_URL ?? '',
    process.env.MEDIA_NEXTCLOUD_USER ?? '',
    process.env.MEDIA_NEXTCLOUD_APP_PASSWORD ?? '',
  );
  if (name === 'cloudinary') return new CloudinaryMediaProvider(
    process.env.MEDIA_CLOUDINARY_CLOUD_NAME ?? '',
    process.env.MEDIA_CLOUDINARY_API_KEY ?? '',
    process.env.MEDIA_CLOUDINARY_API_SECRET ?? '',
  );
  throw new Error('MEDIA_DEFAULT_PROVIDER desconhecido.');
}
