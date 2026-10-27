import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { MediaContext, MediaItem, MediaList, MediaProvider, MediaStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { randomUUID } from 'node:crypto';
import { MediaDatabase } from '../infrastructure/media-database.service';
import { mediaHash, mediaMaxBytes, mediaProvider, type StoredMedia } from '../infrastructure/media-providers';
import { MediaAccess, mediaAdmin, requireMediaAdmin } from './media-access.service';
import { mediaContext, mediaFilename, mediaId, validateMedia } from './media-validation';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';

type Sql = Pick<Nivel3DatabaseClient,'$executeRawUnsafe' | '$queryRawUnsafe'>;
type ObjectRow = { id: string; provider: MediaProvider; provider_key: string; original_name: string; mime_type: string; size_bytes: number | bigint; sha256: string; status: MediaItem['status']; created_at: Date };
const FIELDS = 'm.id,m.provider,m.provider_key,m.original_name,m.mime_type,m.size_bytes,m.sha256,m.status,m.created_at';
const names: MediaProvider[] = ['local','nextcloud','cloudinary'];
export function validMediaProvider(value: unknown): MediaProvider {
  if (!names.includes(value as MediaProvider)) throw new BadRequestException('Provedor de mídia inválido.');
  return value as MediaProvider;
}
@Injectable()
export class MediaService {
  constructor(private readonly database: MediaDatabase, private readonly access: MediaAccess) {}
  private async audit(sql: Sql, id: string | null, actor: number | null, action: string, result: string, detail: string | null = null) {
    await sql.$executeRawUnsafe('INSERT INTO dbo.media_audit(media_id,actor_id,action,result,detail) VALUES(@P1,@P2,@P3,@P4,@P5)', id,actor,action,result,detail);
  }
  private async row(id: string): Promise<ObjectRow> {
    const [row] = await this.database.client.$queryRawUnsafe<ObjectRow[]>(`SELECT ${FIELDS} FROM dbo.media_objects m WHERE m.id=@P1`,mediaId(id));
    if (!row || row.status === 'deleted') throw new NotFoundException('Mídia não encontrada.');
    return row;
  }
  private async links(id: string, sql: Sql = this.database.client): Promise<MediaContext[]> {
    const rows = await sql.$queryRawUnsafe<Array<{ context_type: MediaContext['type']; context_id: string }>>('SELECT context_type,context_id FROM dbo.media_links WHERE media_id=@P1',id);
    return rows.map(row => ({ type: row.context_type, id: row.context_id }));
  }
  private async authorize(user: AuthenticatedUser, id: string, write = false): Promise<MediaContext[]> {
    const links = await this.links(id);
    if (mediaAdmin(user)) return links;
    if (!links.length) throw new NotFoundException('Mídia não encontrada.');
    const visible: MediaContext[] = [];
    for (const link of links) {
      try {
        await this.access.assert(user,link,write);
        const stored=await this.database.client.$queryRawUnsafe<Array<{metadata_json:string|null}>>("SELECT metadata_json FROM dbo.media_links WHERE media_id=@P1 AND context_type=@P2 AND context_id=@P3 AND purpose='attachment'",id,link.type,link.id);
        const identity=stored[0]?.metadata_json ? (JSON.parse(stored[0].metadata_json) as {syncIdentity?:string}).syncIdentity : undefined;
        if(identity)await this.access.assertStoredIdentity(link,identity);
        visible.push(link);
      }
      catch (error) { if (!(error instanceof HttpException) || ![403,404].includes(error.getStatus())) throw error; }
    }
    // Reading requires any authorized association; changing shared media requires all of them.
    if (!visible.length || (write && visible.length !== links.length)) throw new NotFoundException('Mídia não encontrada ou fora do seu escopo.');
    return visible;
  }
  private dto(row: ObjectRow, links: MediaContext[]): MediaItem {
    return { id: row.id.toLowerCase(), provider: row.provider, originalName: row.original_name, mimeType: row.mime_type, sizeBytes: Number(row.size_bytes), sha256: row.sha256, status: row.status, createdAt: new Date(row.created_at).toISOString(), links };
  }
  async get(user: AuthenticatedUser,id: string) { const row = await this.row(id); return this.dto(row,await this.authorize(user,row.id)); }
  async list(user: AuthenticatedUser, context?: MediaContext, offset = 0, limit = 30, search = ''): Promise<MediaList> {
    if (!context) requireMediaAdmin(user);
    else await this.access.assert(user,context);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000000 || !Number.isInteger(limit) || limit < 1 || limit > 100 || search.length > 100) throw new BadRequestException('Paginação ou filtro inválido.');
    const rows = await this.database.client.$queryRawUnsafe<ObjectRow[]>(`SELECT ${FIELDS} FROM dbo.media_objects m
      WHERE m.status<>'deleted' AND (@P1='' OR CHARINDEX(@P1,m.original_name)>0)
      ${context ? 'AND EXISTS(SELECT 1 FROM dbo.media_links l WHERE l.media_id=m.id AND l.context_type=@P4 AND l.context_id=@P5)' : ''}
      ORDER BY m.created_at DESC,m.id OFFSET @P2 ROWS FETCH NEXT @P3 ROWS ONLY`,search,offset,limit+1,...(context ? [context.type,context.id] : []));
    const items: MediaItem[] = [];
    for (const row of rows.slice(0,limit)) items.push(this.dto(row,await this.authorize(user,row.id)));
    let canWrite = mediaAdmin(user);
    if (context && !canWrite) {
      try { await this.access.assert(user,context,true); canWrite = true; }
      catch (error) { if (!(error instanceof HttpException) || ![403,404].includes(error.getStatus())) throw error; }
    }
    return { items, offset, limit, hasMore: rows.length > limit, canWrite };
  }
  async defaultProvider(): Promise<MediaProvider> {
    const [setting] = await this.database.client.$queryRawUnsafe<Array<{ default_provider: MediaProvider }>>('SELECT default_provider FROM dbo.media_settings WHERE id=1');
    return validMediaProvider(setting?.default_provider ?? process.env.MEDIA_DEFAULT_PROVIDER ?? 'local');
  }
  async upload(user: AuthenticatedUser, context: MediaContext, input: { data: Buffer; originalName: string; mimeType?: string; provider?: MediaProvider }, reservationId?: string): Promise<MediaItem> {
    await this.access.assert(user,context);
    await this.access.assert(user,context,true);
    const format = validateMedia(input.data,input.mimeType);
    if (input.provider) requireMediaAdmin(user);
    const providerName = input.provider ? validMediaProvider(input.provider) : await this.defaultProvider();
    const provider = mediaProvider(providerName), id = reservationId ? mediaId(reservationId) : randomUUID(), hash = mediaHash(input.data);
    await this.database.client.$transaction(async tx => {
      await tx.$executeRawUnsafe(`INSERT INTO dbo.media_objects(id,provider,provider_key,original_name,mime_type,size_bytes,sha256,status,created_by,metadata_json)
        VALUES(@P1,@P2,@P3,@P4,@P5,@P6,@P7,'quarantined',@P8,N'{"phase":"uploading"}')`,id,providerName,'pending:'+id,mediaFilename(input.originalName),format.mimeType,input.data.length,hash,user.id);
      await this.audit(tx,id,user.id,'upload','started');
    });
    let stored: StoredMedia | null = null;
    try {
      stored = await provider.put(input.data,format.extension,format.mimeType);
      // Persist the locator before read-back so interrupted uploads remain discoverable for recovery.
      await this.database.client.$executeRawUnsafe('UPDATE dbo.media_objects SET provider_key=@P1,updated_at=SYSUTCDATETIME() WHERE id=@P2',stored.key,id);
      const verified = await provider.read(stored.key);
      if (stored.sha256 !== hash || stored.sizeBytes !== input.data.length || verified.length !== input.data.length || mediaHash(verified) !== hash) throw new ConflictException('O provedor não preservou a integridade da mídia.');
      validateMedia(verified,format.mimeType);
      await this.database.client.$transaction(async tx => {
        await tx.$executeRawUnsafe("UPDATE dbo.media_objects SET status='active',metadata_json=NULL,updated_at=SYSUTCDATETIME() WHERE id=@P1",id);
        await tx.$executeRawUnsafe('INSERT INTO dbo.media_links(media_id,context_type,context_id) VALUES(@P1,@P2,@P3)',id,context.type,context.id);
        await this.audit(tx,id,user.id,'upload','success');
      });
      return { id,provider:providerName,originalName:mediaFilename(input.originalName),mimeType:format.mimeType,sizeBytes:input.data.length,sha256:hash,status:'active',createdAt:new Date().toISOString(),links:[context] };
    } catch (error) {
      // Keep failed objects quarantined, never active or associated. Original sources are untouched.
      await this.database.client.$executeRawUnsafe("UPDATE dbo.media_objects SET status='quarantined',metadata_json=N'{\"phase\":\"failed\"}',updated_at=SYSUTCDATETIME() WHERE id=@P1",id).catch(() => undefined);
      await this.audit(this.database.client,id,user.id,'upload','failed',stored ? 'Objeto retido em quarentena para conferência.' : 'Upload não concluído.').catch(() => undefined);
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('O provedor não concluiu o upload verificado. Consulte a auditoria.');
    }
  }
  async content(user: AuthenticatedUser,id: string) {
    const row = await this.row(id);
    await this.authorize(user,row.id);
    if (row.status !== 'active') throw new ConflictException('Mídia indisponível até a verificação de integridade.');
    let data: Buffer;
    try { data = await mediaProvider(row.provider).read(row.provider_key); }
    catch { throw new ServiceUnavailableException('Não foi possível recuperar a mídia no provedor.'); }
    if (data.length !== Number(row.size_bytes) || mediaHash(data) !== row.sha256) throw new ConflictException('A mídia diverge do checksum registrado.');
    validateMedia(data,row.mime_type);
    return { data, mimeType: row.mime_type, originalName: row.original_name };
  }
  async verify(user: AuthenticatedUser,id: string) {
    requireMediaAdmin(user);
    const row = await this.row(id);
    try {
      const data = await mediaProvider(row.provider).read(row.provider_key);
      if (data.length !== Number(row.size_bytes) || mediaHash(data) !== row.sha256) throw new ConflictException('Checksum divergente.');
      validateMedia(data,row.mime_type);
      await this.audit(this.database.client,row.id,user.id,'integrity','success');
      return { valid: true, checkedAt: new Date().toISOString() };
    } catch {
      await this.audit(this.database.client,row.id,user.id,'integrity','failed');
      // A provider outage alone must not change the object's state or checksum.
      return { valid: false, checkedAt: new Date().toISOString() };
    }
  }
  async associate(user: AuthenticatedUser,id: string, context: MediaContext) {
    const row = await this.row(id);
    if (row.status !== 'active') throw new ConflictException('Somente mídias ativas podem ser associadas.');
    await this.authorize(user,row.id,true);
    await this.access.assert(user,context,true);
    await this.database.client.$transaction(async tx => {
      await tx.$executeRawUnsafe(`IF NOT EXISTS(SELECT 1 FROM dbo.media_links WITH(UPDLOCK,HOLDLOCK) WHERE media_id=@P1 AND context_type=@P2 AND context_id=@P3 AND purpose='attachment')
        INSERT INTO dbo.media_links(media_id,context_type,context_id) VALUES(@P1,@P2,@P3)`,row.id,context.type,context.id);
      await this.audit(tx,row.id,user.id,'associate','success',context.type+':'+context.id);
    });
    return this.get(user,id);
  }
  async unlink(user: AuthenticatedUser,id: string, context: MediaContext) {
    const row = await this.row(id);
    await this.access.assert(user,context,true);
    await this.authorize(user,row.id,true);
    await this.database.client.$transaction(async tx => {
      await tx.$executeRawUnsafe('DELETE FROM dbo.media_links WHERE media_id=@P1 AND context_type=@P2 AND context_id=@P3',row.id,context.type,context.id);
      await this.audit(tx,row.id,user.id,'unlink','success',context.type+':'+context.id);
    });
  }
  async softDelete(user: AuthenticatedUser,id: string): Promise<void> {
    const row = await this.row(id);
    await this.authorize(user,row.id,true);
    await this.database.client.$transaction(async tx => {
      await tx.$executeRawUnsafe("UPDATE dbo.media_objects SET status='deleted',updated_at=SYSUTCDATETIME() WHERE id=@P1",row.id);
      await this.audit(tx,row.id,user.id,'soft-delete','success');
    });
    // Physical content and legacy originals are retained; there is deliberately no purge endpoint.
  }
  async configure(user: AuthenticatedUser,name: unknown) {
    requireMediaAdmin(user);
    const provider = validMediaProvider(name);
    try { mediaProvider(provider); } // Missing credentials must not replace a working configuration.
    catch { throw new ServiceUnavailableException('Configure as credenciais deste provedor no servidor.'); }
    await this.database.client.$transaction(async tx => {
      await tx.$executeRawUnsafe(`MERGE dbo.media_settings WITH(HOLDLOCK) AS target USING(SELECT 1 AS id) AS source ON target.id=source.id
        WHEN MATCHED THEN UPDATE SET default_provider=@P1,updated_by=@P2,updated_at=SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT(id,default_provider,updated_by) VALUES(1,@P1,@P2);`,provider,user.id);
      await this.audit(tx,null,user.id,'configure','success',provider);
    });
    return { defaultProvider: provider };
  }
  async status(user: AuthenticatedUser): Promise<MediaStatus> {
    requireMediaAdmin(user);
    const providers = names.map(name => { try { mediaProvider(name); return { name,configured:true }; } catch { return { name,configured:false }; } });
    const base: MediaStatus = { enabled:this.database.enabled,available:false,defaultProvider:'local',maxUploadBytes:mediaMaxBytes(),providers,usage:[],recentAudit:[] };
    try {
      base.defaultProvider = await this.defaultProvider();
      const usage = await this.database.client.$queryRawUnsafe<Array<{ provider: MediaProvider; status:string; count: number | bigint; bytes: number | bigint }>>("SELECT provider,status,COUNT_BIG(*) AS count,COALESCE(SUM(CASE WHEN provider_key LIKE 'pending:%' THEN 0 ELSE size_bytes END),0) AS bytes FROM dbo.media_objects GROUP BY provider,status");
      base.usage = usage.map(row => ({ ...row,count:Number(row.count),bytes:Number(row.bytes) }));
      const audit = await this.database.client.$queryRawUnsafe<Array<{ action:string; result:string; created_at:Date }>>('SELECT TOP (30) action,result,created_at FROM dbo.media_audit ORDER BY id DESC');
      base.recentAudit = audit.map(row => ({ action:row.action,result:row.result,createdAt:new Date(row.created_at).toISOString() }));
      base.available = true;
    } catch { /* Expose readiness without connection strings or SQL diagnostics. */ }
    return base;
  }
}
