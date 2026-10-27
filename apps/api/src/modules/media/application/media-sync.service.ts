import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { MediaContext, MediaSyncEntry, MediaSyncManifest, MediaSyncReport, MediaSyncRun, MediaSyncAction, MediaSyncBatch } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { randomUUID } from 'node:crypto';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { MediaDatabase } from '../infrastructure/media-database.service';
import { mediaHash } from '../infrastructure/media-providers';
import { MediaService } from './media.service';
import { MediaAccess, requireMediaAdmin } from './media-access.service';
import { mediaId, validateMedia } from './media-validation';
import { classifyEntry, contentId, referenceKey, syncHash, syncManifest } from './media-sync-model';
import { verifiedSyncBackup } from './media-sync-backups';
import { mediaRecordIdentity } from './media-sync-identity';

type Sql = Pick<Nivel3DatabaseClient,'$queryRawUnsafe'|'$executeRawUnsafe'>;
type RunRow = { id:string; origin:string; dump:string; status:string; created_at:Date; manifest_hash:string; manifest_json:string; approved_by:number|null; backup_receipt:string|null; checkpoint:number; total:number; base_revision:number };
type RefRow = { reference_key:string; descriptor:string; media_id:string; version:number; status:string };
type ItemRow = { sequence:number; reference_key:string; descriptor:string; action:MediaSyncAction; state:string; media_id:string|null; error_code:string|null };
const actionable = new Set(['new','changed','duplicate','unchanged']);
class SyncItemError extends Error { constructor(readonly code:string) { super(code); } }
const dto = (r: RunRow): MediaSyncRun => ({ id:r.id.toLowerCase(),origin:r.origin,dump:r.dump,status:r.status,createdAt:new Date(r.created_at).toISOString(),manifestHash:r.manifest_hash,approvedBy:r.approved_by,checkpoint:r.checkpoint,total:r.total });

@Injectable()
export class MediaSyncService {
  constructor(private readonly metadata: MediaDatabase, private readonly media: MediaService, private readonly access: MediaAccess, @Inject(NIVEL3_DATABASE) private readonly business: Nivel3DatabaseClient) {}

  private async lock<T>(work:(sql:Sql)=>Promise<T>):Promise<T> {
    return this.metadata.client.$transaction(async sql=>{
      const [row] = await sql.$queryRawUnsafe<Array<{code:number}>>("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource='helpdesk-media-sync-v1',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=0; SELECT @r AS code;");
      if (!row || row.code < 0) throw new ConflictException('Outra operação de sincronização está em andamento.');
      return work(sql);
    },{ timeout:600000,maxWait:5000 });
  }
  async identity(context:MediaContext):Promise<string> {
    return mediaRecordIdentity(this.business,context);
  }
  private async binding(user:AuthenticatedUser,entry:MediaSyncEntry) {
    await this.access.assert(user,entry.context,true);
    if (await this.identity(entry.context) !== entry.identitySha256) throw new ConflictException('Identidade do registro diverge do mapa do dump.');
  }
  private async run(sql:Sql,id:string):Promise<RunRow> {
    const [row] = await sql.$queryRawUnsafe<RunRow[]>('SELECT * FROM dbo.media_sync_runs WHERE id=@P1',mediaId(id));
    if (!row) throw new NotFoundException('Execução não encontrada.');
    if(syncHash(row.manifest_json)!==row.manifest_hash)throw new ConflictException('Manifesto persistido diverge do relatório aprovado.');
    return row;
  }
  private async legacyBaseline(origin:string,entry:MediaSyncEntry):Promise<RefRow|null> {
    if(process.env.MEDIA_SYNC_LEGACY_ORIGIN!==origin)return null;
    const [legacy]=await this.metadata.client.$queryRawUnsafe<Array<{id:string;status:string;sha256:string;size_bytes:bigint}>>(`SELECT TOP(1) m.id,m.status,m.sha256,m.size_bytes FROM dbo.media_legacy_references r JOIN dbo.media_objects m ON m.id=r.media_id
      WHERE CONCAT(r.source_type,':',r.source_id)=@P1 AND m.sha256 IS NOT NULL ORDER BY r.checked_at DESC,r.id DESC`,entry.key);
    return legacy ? {reference_key:referenceKey(entry),media_id:legacy.id,version:1,status:legacy.status,descriptor:JSON.stringify({...entry,sha256:legacy.sha256,size:Number(legacy.size_bytes),availability:'file'})} : null;
  }
  async compare(user:AuthenticatedUser,input:unknown):Promise<MediaSyncReport> {
    requireMediaAdmin(user);
    const manifest = syncManifest(input), json = JSON.stringify(manifest), id = randomUUID();
    await this.lock(async sql=>{
      await sql.$executeRawUnsafe('IF NOT EXISTS(SELECT 1 FROM dbo.media_sync_origins WHERE origin=@P1) INSERT INTO dbo.media_sync_origins(origin) VALUES(@P1)',manifest.origin);
      const [origin] = await sql.$queryRawUnsafe<Array<{revision:number}>>('SELECT revision FROM dbo.media_sync_origins WHERE origin=@P1',manifest.origin);
      const references = await sql.$queryRawUnsafe<RefRow[]>('SELECT r.*,m.status FROM dbo.media_sync_references r JOIN dbo.media_objects m ON m.id=r.media_id WHERE r.origin=@P1',manifest.origin);
      const previous = new Map(references.map(r=>[r.reference_key,r]));
      const active = await sql.$queryRawUnsafe<Array<{sha256:string;size_bytes:bigint}>>("SELECT sha256,size_bytes FROM dbo.media_objects WHERE status='active'");
      const content = new Set(active.map(r=>r.sha256+':'+String(r.size_bytes)));
      const plan:Array<{entry:MediaSyncEntry;action:MediaSyncAction}> = [];
      for (const entry of manifest.entries) {
        const prior = previous.get(referenceKey(entry)) ?? await this.legacyBaseline(manifest.origin,entry);
        let action:MediaSyncAction;
        try { await this.binding(user,entry); action = classifyEntry(entry,prior ? JSON.parse(prior.descriptor) as MediaSyncEntry : null,content.has(entry.sha256+':'+entry.size),prior?.status==='deleted'); }
        catch { action='invalid-link'; }
        plan.push({entry,action});
        if (actionable.has(action)) content.add(entry.sha256+':'+entry.size);
        previous.delete(referenceKey(entry));
      }
      if (manifest.complete) for (const prior of previous.values()) plan.push({entry:JSON.parse(prior.descriptor) as MediaSyncEntry,action:'absent'});
      await sql.$executeRawUnsafe("INSERT INTO dbo.media_sync_runs(id,origin,dump,provider,manifest_hash,manifest_json,base_revision,status,created_by,total) VALUES(@P1,@P2,@P3,@P4,@P5,@P6,@P7,'compared',@P8,@P9)",id,manifest.origin,manifest.dump,manifest.provider,syncHash(json),json,origin.revision,user.id,plan.length);
      for (const [index,item] of plan.entries()) await sql.$executeRawUnsafe('INSERT INTO dbo.media_sync_items(run_id,sequence,reference_key,descriptor,action,bytes,error_code) VALUES(@P1,@P2,@P3,@P4,@P5,@P6,@P7)',id,index+1,referenceKey(item.entry),JSON.stringify(item.entry),item.action,item.entry.size,item.action==='invalid-link'?'identity-or-access-mismatch':null);
    });
    return this.report(user,id);
  }
  async history(user:AuthenticatedUser,offset=0):Promise<MediaSyncRun[]> {
    requireMediaAdmin(user);
    if (!Number.isInteger(offset) || offset<0 || offset>100000) throw new BadRequestException('Página inválida.');
    return (await this.metadata.client.$queryRawUnsafe<RunRow[]>('SELECT * FROM dbo.media_sync_runs ORDER BY created_at DESC,id OFFSET @P1 ROWS FETCH NEXT 30 ROWS ONLY',offset)).map(dto);
  }
  async report(user:AuthenticatedUser,id:string,offset=0):Promise<MediaSyncReport> {
    requireMediaAdmin(user);
    if (!Number.isInteger(offset)||offset<0||offset>100000) throw new BadRequestException('Página inválida.');
    const sql = this.metadata.client, run = await this.run(sql,id);
    const summary = await sql.$queryRawUnsafe<Array<{action:string;state:string;count:number;bytes:bigint;saved:bigint}>>('SELECT action,state,COUNT(*) AS count,SUM(bytes) AS bytes,SUM(saved_bytes) AS saved FROM dbo.media_sync_items WHERE run_id=@P1 GROUP BY action,state',id);
    const items = await sql.$queryRawUnsafe<ItemRow[]>('SELECT sequence,reference_key,descriptor,action,state,media_id,error_code FROM dbo.media_sync_items WHERE run_id=@P1 ORDER BY sequence OFFSET @P2 ROWS FETCH NEXT 101 ROWS ONLY',id,offset);
    return { run:dto(run),summary:summary.map(s=>({...s,bytes:Number(s.bytes),saved:Number(s.saved)})),items:items.slice(0,100).map(i=>{const e=JSON.parse(i.descriptor) as MediaSyncEntry;return {sequence:i.sequence,key:e.key,sourceType:e.sourceType,sourceId:e.sourceId,context:e.context,action:i.action,state:i.state,error:i.error_code,mediaId:i.media_id};}),hasMore:items.length>100,batches:await this.batches(user,id) };
  }
  async batches(user:AuthenticatedUser,id:string,offset=0):Promise<MediaSyncBatch[]> {
    requireMediaAdmin(user);mediaId(id);
    if(!Number.isInteger(offset)||offset<0||offset>100000)throw new BadRequestException('Página inválida.');
    const rows=await this.metadata.client.$queryRawUnsafe<Array<{id:string;status:string;from_sequence:number;to_sequence:number|null;processed:number;failed:number;started_at:Date;completed_at:Date|null}>>('SELECT * FROM dbo.media_sync_batches WHERE run_id=@P1 ORDER BY started_at DESC,id OFFSET @P2 ROWS FETCH NEXT 30 ROWS ONLY',id,offset);
    return rows.map(b=>({id:b.id,status:b.status,fromSequence:b.from_sequence,toSequence:b.to_sequence,processed:b.processed,failed:b.failed,startedAt:new Date(b.started_at).toISOString(),completedAt:b.completed_at?new Date(b.completed_at).toISOString():null}));
  }
  async approve(user:AuthenticatedUser,id:string,confirmation:unknown,receipt:unknown) {
    requireMediaAdmin(user);mediaId(id);
    if (confirmation !== 'APROVAR '+id || typeof receipt!=='string') throw new BadRequestException('Confirme explicitamente APROVAR e o identificador da execução.');
    await verifiedSyncBackup(receipt);
    await this.lock(async sql=>{
      const run = await this.run(sql,id);
      const [origin] = await sql.$queryRawUnsafe<Array<{revision:number;active_run:string|null}>>('SELECT revision,active_run FROM dbo.media_sync_origins WHERE origin=@P1',run.origin);
      const [invalid] = await sql.$queryRawUnsafe<Array<{count:number}>>("SELECT COUNT(*) AS count FROM dbo.media_sync_items WHERE run_id=@P1 AND action='invalid-link'",id);
      if (run.status!=='compared' || run.base_revision!==origin.revision || origin.active_run || invalid.count>0 || !(JSON.parse(run.manifest_json) as MediaSyncManifest).complete) throw new ConflictException('Compare novamente um inventário completo, corrija vínculos e conclua ou cancele a execução anterior.');
      await sql.$executeRawUnsafe("UPDATE dbo.media_sync_runs SET status='approved',approved_by=@P2,backup_receipt=@P3,updated_at=SYSUTCDATETIME() WHERE id=@P1",id,user.id,receipt);
      await sql.$executeRawUnsafe('UPDATE dbo.media_sync_origins SET active_run=@P2 WHERE origin=@P1',run.origin,id);
      await sql.$executeRawUnsafe("INSERT INTO dbo.media_audit(actor_id,action,result,detail) VALUES(@P1,'sync-approve','success',@P2)",user.id,id);
    });
    return this.report(user,id);
  }
  async cancel(user:AuthenticatedUser,id:string) {
    requireMediaAdmin(user);
    await this.lock(async sql=>{
      const run = await this.run(sql,id);
      if (!['compared','approved','partial'].includes(run.status)) throw new ConflictException('Execução não pode ser cancelada.');
      await sql.$executeRawUnsafe("UPDATE dbo.media_sync_runs SET status='cancelled',updated_at=SYSUTCDATETIME() WHERE id=@P1",id);
      await sql.$executeRawUnsafe("UPDATE dbo.media_sync_batches SET status='interrupted',completed_at=SYSUTCDATETIME() WHERE run_id=@P1 AND status='started'",id);
      await sql.$executeRawUnsafe('UPDATE dbo.media_sync_origins SET active_run=NULL WHERE origin=@P1 AND active_run=@P2',run.origin,id);
      await sql.$executeRawUnsafe("INSERT INTO dbo.media_audit(actor_id,action,result,detail) VALUES(@P1,'sync-cancel','success',@P2)",user.id,id);
    });
  }
  // Called only by the explicit CLI, never a timer or an HTTP background job.
  async applyBatch(id:string,confirmation:string,load:(entry:MediaSyncEntry)=>Promise<Buffer>,batchSize=10):Promise<MediaSyncReport> {
    if (process.env.MEDIA_MIGRATION_ALLOW_APPLY!=='true' || confirmation!==id) throw new ConflictException('Aplicação real exige autorização explícita nesta invocação.');
    if (!Number.isInteger(batchSize)||batchSize<1||batchSize>10) throw new BadRequestException('Lote deve conter 1 a 10 referências.');
    let actor!:AuthenticatedUser;
    await this.lock(async sql=>{
      const run = await this.run(sql,id);
      if (!['approved','partial'].includes(run.status) || run.approved_by===null || !run.backup_receipt) throw new ConflictException('Execução sem aprovação administrativa.');
      // Approval is not a substitute for a still-active real administrator.
      const { resolveUserGrants } = await import('./media-sync-user');
      actor = await resolveUserGrants(this.business,run.approved_by);
      await verifiedSyncBackup(run.backup_receipt);
      const [origin] = await sql.$queryRawUnsafe<Array<{revision:number;active_run:string|null}>>('SELECT revision,active_run FROM dbo.media_sync_origins WHERE origin=@P1',run.origin);
      if (origin.active_run?.toLowerCase()!==id.toLowerCase() || origin.revision!==run.base_revision) throw new ConflictException('A origem mudou após a comparação.');
      const manifest = JSON.parse(run.manifest_json) as MediaSyncManifest;
      const items = await sql.$queryRawUnsafe<ItemRow[]>("SELECT TOP (@P2) * FROM dbo.media_sync_items WHERE run_id=@P1 AND state='pending' ORDER BY sequence",id,batchSize);
      const batchId=randomUUID();
      // This receipt commits outside the checkpoint transaction, so a crash leaves a visible started batch.
      await this.metadata.client.$transaction(async audit=>{
        await audit.$executeRawUnsafe("UPDATE dbo.media_sync_batches SET status='interrupted',completed_at=SYSUTCDATETIME() WHERE run_id=@P1 AND status='started'",id);
        await audit.$executeRawUnsafe("INSERT INTO dbo.media_sync_batches(id,run_id,status,from_sequence) VALUES(@P1,@P2,'started',@P3)",batchId,id,items[0]?.sequence??run.checkpoint+1);
      });
      let failed=0;
      for (const item of items) {
        await sql.$executeRawUnsafe('SAVE TRANSACTION media_sync_item');
        try {
          const entry = JSON.parse(item.descriptor) as MediaSyncEntry;
          if (actionable.has(item.action)) await this.importEntry(sql,run,item,entry,actor,manifest.provider,load);
          else await sql.$executeRawUnsafe("UPDATE dbo.media_sync_items SET state='done' WHERE run_id=@P1 AND sequence=@P2",id,item.sequence);
        } catch (error) {
          failed++;
          await sql.$executeRawUnsafe('ROLLBACK TRANSACTION media_sync_item');
          await sql.$executeRawUnsafe("UPDATE dbo.media_sync_items SET state='failed',error_code=@P3 WHERE run_id=@P1 AND sequence=@P2",id,item.sequence,error instanceof SyncItemError?error.code:'source-storage-or-metadata');
        }
      }
      const [progress] = await sql.$queryRawUnsafe<Array<{pending:number;failed:number;checkpoint:number}>>("SELECT SUM(CASE WHEN state='pending' THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN state='failed' THEN 1 ELSE 0 END) AS failed,COALESCE(MIN(CASE WHEN state<>'done' THEN sequence END)-1,MAX(sequence),0) AS [checkpoint] FROM dbo.media_sync_items WHERE run_id=@P1",id);
      const complete = !progress.pending&&!progress.failed;
      await sql.$executeRawUnsafe("UPDATE dbo.media_sync_batches SET status=@P2,to_sequence=@P3,processed=@P4,failed=@P5,completed_at=SYSUTCDATETIME() WHERE id=@P1",batchId,failed?'partial':'completed',items.at(-1)?.sequence??run.checkpoint,items.length,failed);
      await sql.$executeRawUnsafe('UPDATE dbo.media_sync_origins SET revision=revision+1,active_run=@P2 WHERE origin=@P1',run.origin,complete?null:id);
      await sql.$executeRawUnsafe('UPDATE dbo.media_sync_runs SET status=@P2,[checkpoint]=@P3,base_revision=base_revision+1,updated_at=SYSUTCDATETIME() WHERE id=@P1',id,complete?'completed':'partial',progress.checkpoint);
    });
    return this.report(actor,id);
  }
  async retry(user:AuthenticatedUser,id:string) {
    requireMediaAdmin(user);
    await this.lock(async sql=>{
      const run=await this.run(sql,id);
      if(run.status!=='partial')throw new ConflictException('Somente falhas parciais podem ser retomadas.');
      await sql.$executeRawUnsafe("UPDATE dbo.media_sync_items SET state='pending',error_code=NULL WHERE run_id=@P1 AND state='failed'",id);
    });
  }
  private async importEntry(sql:Sql,run:RunRow,item:ItemRow,entry:MediaSyncEntry,user:AuthenticatedUser,provider:MediaSyncManifest['provider'],load:(entry:MediaSyncEntry)=>Promise<Buffer>) {
    try{await this.binding(user,entry);}catch{throw new SyncItemError('identity-or-access-mismatch');}
    const data=await load(entry);
    validateMedia(data);
    if (data.length!==entry.size || mediaHash(data)!==entry.sha256) throw new SyncItemError('source-changed-after-comparison');
    let [prior]=await sql.$queryRawUnsafe<RefRow[]>('SELECT r.*,m.status FROM dbo.media_sync_references r JOIN dbo.media_objects m ON m.id=r.media_id WHERE r.origin=@P1 AND r.reference_key=@P2',run.origin,item.reference_key);
    if(!prior){
      const baseline=await this.legacyBaseline(run.origin,entry);
      if(baseline){
        prior=baseline;
        await sql.$executeRawUnsafe('INSERT INTO dbo.media_sync_versions(origin,reference_key,version,run_id,media_id,descriptor) VALUES(@P1,@P2,1,@P3,@P4,@P5)',run.origin,item.reference_key,run.id,baseline.media_id,baseline.descriptor);
      }
    }
    if (prior?.status==='deleted') throw new SyncItemError('deleted-reference-needs-review');
    const [duplicate]=await this.metadata.client.$queryRawUnsafe<Array<{id:string}>>("SELECT TOP(1) id FROM dbo.media_objects WHERE sha256=@P1 AND size_bytes=@P2 AND status='active' ORDER BY created_at",entry.sha256,entry.size);
    let mediaId:string,saved=0;
    if (duplicate) {
      await this.media.content(user,duplicate.id);
      await this.media.associate(user,duplicate.id,entry.context);
      mediaId=duplicate.id;saved=entry.size;
    } else {
      const reserved=contentId(provider,entry.sha256!,entry.size);
      // A persisted pending/quarantined reservation is never uploaded twice after a crash.
      const [old]=await this.metadata.client.$queryRawUnsafe<Array<{id:string}>>('SELECT id FROM dbo.media_objects WHERE id=@P1',reserved);
      if(old) throw new SyncItemError('incomplete-reservation-needs-review');
      const uploaded=await this.media.upload(user,entry.context,{data,originalName:entry.name,provider},reserved);
      mediaId=uploaded.id;
    }
    const changed=!prior || prior.media_id.toLowerCase()!==mediaId.toLowerCase() || prior.descriptor!==JSON.stringify(entry);
    // A retained historical link must not grant access if its numeric ID is reused by another dump.
    const [link]=await this.metadata.client.$queryRawUnsafe<Array<{metadata_json:string|null}>>("SELECT metadata_json FROM dbo.media_links WHERE media_id=@P1 AND context_type=@P2 AND context_id=@P3 AND purpose='attachment'",mediaId,entry.context.type,entry.context.id);
    const oldTag=link?.metadata_json ? JSON.parse(link.metadata_json) as Record<string,unknown> : {};
    const oldIdentity=oldTag.syncIdentity;
    if(oldIdentity && oldIdentity!==entry.identitySha256)throw new SyncItemError('historical-link-needs-review');
    const tag=JSON.stringify({...oldTag,syncIdentity:entry.identitySha256});
    await this.metadata.client.$executeRawUnsafe("UPDATE dbo.media_links SET metadata_json=@P4 WHERE media_id=@P1 AND context_type=@P2 AND context_id=@P3 AND purpose='attachment'",mediaId,entry.context.type,entry.context.id,tag);
    const version=(prior?.version ?? 0)+(changed?1:0);
    if(changed) await sql.$executeRawUnsafe('INSERT INTO dbo.media_sync_versions(origin,reference_key,version,run_id,media_id,descriptor) VALUES(@P1,@P2,@P3,@P4,@P5,@P6)',run.origin,item.reference_key,version,run.id,mediaId,JSON.stringify(entry));
    await sql.$executeRawUnsafe(`MERGE dbo.media_sync_references WITH(HOLDLOCK) AS t USING(SELECT @P1 AS origin,@P2 AS reference_key) AS s ON t.origin=s.origin AND t.reference_key=s.reference_key
      WHEN MATCHED THEN UPDATE SET descriptor=@P3,media_id=@P4,version=@P5,last_seen_run=@P6
      WHEN NOT MATCHED THEN INSERT(origin,reference_key,descriptor,media_id,version,last_seen_run) VALUES(@P1,@P2,@P3,@P4,@P5,@P6);`,run.origin,item.reference_key,JSON.stringify(entry),mediaId,version,run.id);
    await sql.$executeRawUnsafe("UPDATE dbo.media_sync_items SET state='done',media_id=@P3,saved_bytes=@P4 WHERE run_id=@P1 AND sequence=@P2",run.id,item.sequence,mediaId,saved);
  }
}
