// Explicit, resumable migration. Default is read-only dry-run; never removes/rewrites legacy sources.
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..');
process.loadEnvFile(path.join(root,'.env'));
const {createNivel3Client}=require('../packages/database/dist');
const {MediaDatabase}=require('../apps/api/dist/modules/media/infrastructure/media-database.service');
const {MediaAccess}=require('../apps/api/dist/modules/media/application/media-access.service');
const {MediaService}=require('../apps/api/dist/modules/media/application/media.service');
const {validateMedia}=require('../apps/api/dist/modules/media/application/media-validation');
const {mediaProvider,mediaHash}=require('../apps/api/dist/modules/media/infrastructure/media-providers');
const {AppPermission,PermissionScope}=require('../packages/contracts/dist');

const args=process.argv.slice(2),apply=args.includes('--apply');
function option(name,fallback){const index=args.indexOf(name);return index<0?fallback:args[index+1];}
const known=new Set(['--apply','--dry-run','--source-root','--batch-size','--limit','--provider','--report']);
for(let i=0;i<args.length;i++){if(!known.has(args[i]))throw new Error('Unknown argument.');if(!['--apply','--dry-run'].includes(args[i]))i++;}
if(apply && args.includes('--dry-run'))throw new Error('Choose --dry-run or --apply.');
if(apply && process.env.MEDIA_MIGRATION_ALLOW_APPLY!=='true')throw new Error('Real migration requires explicit authorization: set MEDIA_MIGRATION_ALLOW_APPLY=true for this invocation and pass --apply.');
const sourceRoot=path.resolve(option('--source-root',root));
const batchSize=Number(option('--batch-size','25')),limit=Number(option('--limit','100000'));
if(!Number.isInteger(batchSize)||batchSize<1||batchSize>100||!Number.isInteger(limit)||limit<1||limit>100000)throw new Error('Invalid migration batch/limit.');
const providerName=option('--provider',process.env.MEDIA_DEFAULT_PROVIDER || 'local');
if(!['local','nextcloud','cloudinary'].includes(providerName))throw new Error('Invalid provider.');
const legacy=createNivel3Client(),metadata=new MediaDatabase();
const access=new MediaAccess(legacy,{findByUserId:async()=>({sectors:[],permissions:{}})});
const service=new MediaService(metadata,access);
const admin={id:0,name:'Explicit media migration',login:'migration',functionId:null,accessSource:'rbac',roleAssignments:[],grants:[{permission:AppPermission.SystemAdmin,scope:PermissionScope.All}]};
const runId=randomUUID(),startedAt=new Date().toISOString();
const output=path.resolve(option('--report',path.join(root,'docs/reports','media-migration-'+runId+'.jsonl')));
const counts={examined:0,located:0,missing:0,external:0,distinctExternal:0,unsupported:0,migrated:0,duplicate:0,alreadyMigrated:0,skippedDeleted:0,failed:0,bytes:0};
const seen=new Map();
const externalReferences=new Set();
const roots={catalog:[process.env.CATALOG_UPLOAD_DIR || path.join(sourceRoot,'storage/uploads/catalog')],tickets:[process.env.TICKET_UPLOAD_DIR || path.join(sourceRoot,'storage/uploads/tickets'),path.join(sourceRoot,'uploads')]};
function fingerprint(item){return createHash('sha256').update([item.sourceType,item.sourceId,item.reference].join('\0')).digest('hex');}
async function emit(item,status,extra={}){
  // Never export image data, private URLs, credentials, or provider exception messages.
  await fs.appendFile(output,JSON.stringify({runId,sourceType:item.sourceType,sourceId:item.sourceId,referenceFingerprint:fingerprint(item),status,...extra})+'\n');
}
async function safeRead(relative,allowedRoots){
  const normalized=relative.replace(/\\/g,'/').replace(/^(\.\.\/)+/,'').replace(/^\/+/, '').replace(/^uploads\//,'');
  for(const directory of allowedRoots){
    const base=path.resolve(directory),candidate=path.resolve(base,normalized);
    if(!candidate.startsWith(base+path.sep))continue;
    try{
      const realBase=await fs.realpath(base),realFile=await fs.realpath(candidate);
      if(!realFile.startsWith(realBase+path.sep))continue;
      const stat=await fs.stat(realFile);
      if(!stat.isFile())continue;
      if(stat.size>100*1048576)throw new Error('Legacy file exceeds the bounded read limit.');
      const data=await fs.readFile(realFile),after=await fs.stat(realFile);
      if(stat.size!==after.size || stat.mtimeMs!==after.mtimeMs || data.length!==stat.size)throw new Error('Legacy file changed during read.');
      return data;
    }catch(error){if(!['ENOENT','ENOTDIR'].includes(error.code))throw error;}
  }
  return null;
}
async function* tableRows(table,fields){
  let last=0;
  while(true){const rows=await legacy.$queryRawUnsafe(`SELECT TOP (${batchSize}) id,${fields} FROM dbo.${table} WHERE id>@P1 ORDER BY id`,last);if(!rows.length)return;
    for(const row of rows){last=Number(row.id);yield row;}
  }
}
async function* sources(){
  for(const [table,column,parent,type] of [['imagens','img_atd','atd_id','ticket'],['imagens_tarefa','img_tarefa','tarefa_id','task']]){
    for await(const row of tableRows(table,`${column},${parent}`))yield{sourceType:table,sourceId:String(row.id),reference:`binary:${table}:${row.id}:${column}`,context:row[parent]?{type,id:String(row[parent])}:null,name:`${table}-${row.id}`,data:row[column]?Buffer.from(row[column]):null};
  }
  for await(const row of tableRows('catalog_images','catalog_id,storage_path,original_name'))yield{sourceType:'catalog_images',sourceId:String(row.id),reference:row.storage_path,context:row.catalog_id?{type:'catalog',id:String(row.catalog_id)}:null,name:row.original_name,load:()=>safeRead(row.storage_path,roots.catalog)};
  for await(const row of tableRows('documentos','atd_id,caminho_arquivo,nome_arquivo,tipo_arquivo')){
    if(!/^image\//i.test(row.tipo_arquivo || '')&&!/\.(png|jpe?g|webp|gif)$/i.test(row.nome_arquivo || ''))continue;
    const external=/^https?:\/\//i.test(row.caminho_arquivo || '');
    yield{sourceType:'documentos',sourceId:String(row.id),reference:row.caminho_arquivo,context:row.atd_id?{type:'ticket',id:String(row.atd_id)}:null,name:row.nome_arquivo,external,load:()=>safeRead(row.caminho_arquivo,roots.tickets)};
  }
  for(const [table,column,type] of [['catalogos','conteudo','catalog'],['running_balance','remarks','system']]){
    for await(const row of tableRows(table,column)){
      const text=String(row[column] || '');let ordinal=0;
      for(const match of text.matchAll(/data:image\/([a-z0-9.+-]+);base64,([a-z0-9+/=\r\n\t ]+)/gi)){
        ordinal++;
        yield{sourceType:table+'-inline',sourceId:row.id+':'+ordinal,reference:`inline:${table}:${row.id}:${column}:${ordinal}`,context:{type,id:type==='system'?'global':String(row.id)},name:`${table}-${row.id}-${ordinal}`,data:Buffer.from(match[2].replace(/\s/g,''),'base64')};
      }
      if(type==='catalog'){
        const urls=new Set();
        for(const match of text.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)){
          if(/^data:image\//i.test(match[1])||/(?:catalog\/images\/\d+\/content|catalog-images\/\d+)/i.test(match[1]))continue;
          if(urls.has(match[1]))continue;urls.add(match[1]);
          const external=/^(?:https?:)?\/\//i.test(match[1]);
          yield{sourceType:'catalog-html-reference',sourceId:row.id+':'+urls.size,reference:match[1],context:{type:'catalog',id:String(row.id)},name:'catalog-reference',external,load:()=>safeRead(match[1],roots.tickets)};
        }
      }
    }
  }
}
async function legacyReference(item,status,mediaId=null){
  if(!apply)return;
  const sourceFingerprint=fingerprint(item);
  await metadata.client.$executeRawUnsafe(`MERGE dbo.media_legacy_references WITH(HOLDLOCK) AS target
    USING(SELECT @P1 AS source_type,@P2 AS source_id,@P3 AS source_fingerprint) AS source
    ON target.source_type=source.source_type AND target.source_id=source.source_id AND target.source_fingerprint=source.source_fingerprint
    WHEN MATCHED THEN UPDATE SET verification_status=@P5,media_id=@P6,checked_at=SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT(source_type,source_id,source_fingerprint,original_reference,verification_status,media_id,checked_at)
    VALUES(@P1,@P2,@P3,@P4,@P5,@P6,SYSUTCDATETIME());`,item.sourceType,item.sourceId,sourceFingerprint,item.reference,status,mediaId);
}
async function processItem(item){
  counts.examined++;
  if(item.external){counts.external++;externalReferences.add(item.reference);counts.distinctExternal=externalReferences.size;await legacyReference(item,'external');await emit(item,'external');return;}
  if(item.load)item.data=await item.load();
  if(!item.data){counts.missing++;await legacyReference(item,'missing');await emit(item,'missing');return;}
  let format;
  try{format=validateMedia(item.data);}catch{counts.unsupported++;await legacyReference(item,'pending');await emit(item,'unsupported');return;}
  if(!item.context){counts.failed++;await legacyReference(item,'pending');await emit(item,'failed',{reason:'missing-parent'});return;}
  await access.assert(admin,item.context,true);
  const hash=mediaHash(item.data);
  if(!apply){const duplicate=seen.has(hash);seen.set(hash,true);counts[duplicate?'duplicate':'located']++;counts.bytes+=item.data.length;await emit(item,duplicate?'duplicate':'located',{bytes:item.data.length,sha256:hash});return;}
  const [removed]=await metadata.client.$queryRawUnsafe(`SELECT TOP (1) m.id FROM dbo.media_objects m JOIN dbo.media_legacy_references r ON r.media_id=m.id
    WHERE r.source_type=@P1 AND r.source_id=@P2 AND r.source_fingerprint=@P3 AND m.status='deleted'`,item.sourceType,item.sourceId,fingerprint(item));
  if(removed){counts.skippedDeleted++;await emit(item,'skipped-deleted',{mediaId:removed.id});return;}
  const [existing]=await metadata.client.$queryRawUnsafe(`SELECT TOP (1) m.id FROM dbo.media_objects m
    JOIN dbo.media_legacy_references r ON r.media_id=m.id WHERE r.source_type=@P1 AND r.source_id=@P2 AND r.source_fingerprint=@P3 AND m.status='active' AND m.sha256=@P4`,item.sourceType,item.sourceId,fingerprint(item),hash);
  if(existing){await service.content(admin,existing.id);await service.associate(admin,existing.id,item.context);counts.alreadyMigrated++;await emit(item,'already-migrated',{mediaId:existing.id});return;}
  const [duplicate]=await metadata.client.$queryRawUnsafe("SELECT TOP (1) id FROM dbo.media_objects WHERE sha256=@P1 AND size_bytes=@P2 AND status='active' AND provider=@P3 ORDER BY created_at",hash,item.data.length,providerName);
  let object;
  if(duplicate){await service.content(admin,duplicate.id);object=await service.associate(admin,duplicate.id,item.context);counts.duplicate++;}
  else{object=await service.upload(admin,item.context,{data:item.data,originalName:item.name+'.'+format.extension,mimeType:format.mimeType,provider:providerName});counts.migrated++;}
  await legacyReference(item,duplicate?'duplicate':'located',object.id);
  counts.bytes+=item.data.length;
  await emit(item,duplicate?'duplicate':'migrated',{mediaId:object.id,bytes:item.data.length,sha256:hash});
}
async function main(){
  await fs.access(path.join(sourceRoot,'pnpm-workspace.yaml'));
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,'',{flag:'wx',mode:0o600});
  if(apply)mediaProvider(providerName);
  console.log('Media migration mode:',apply?'EXPLICIT APPLY':'DRY-RUN (no SQL writes or provider uploads)');
  for await(const item of sources()){
    if(counts.examined>=limit)break;
    try{await processItem(item);}catch{counts.failed++;await emit(item,'failed',{reason:'access-storage-or-metadata-error'});}
    if(counts.examined%batchSize===0)console.log('Processed:',counts.examined);
  }
  const summary={runId,startedAt,completedAt:new Date().toISOString(),mode:apply?'apply':'dry-run',provider:providerName,limit,counts};
  await fs.appendFile(output,JSON.stringify({summary})+'\n');console.log(JSON.stringify(summary,null,2));console.log('Audit report:',output);
  if(counts.failed)process.exitCode=2;
}
main().catch(async()=>{await fs.appendFile(output,JSON.stringify({runId,interrupted:true,counts})+'\n').catch(()=>undefined);console.error('Migration interrupted. Check configuration and the local audit report; no original media was modified.');process.exitCode=1;}).finally(async()=>{await legacy.$disconnect();await metadata.onModuleDestroy();});
