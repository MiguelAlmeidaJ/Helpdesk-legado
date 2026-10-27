// Explicit one-batch runner. No automatic jobs or legacy writes.
const fs=require('node:fs/promises'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');
const {MediaDatabase}=require('../apps/api/dist/modules/media/infrastructure/media-database.service');
const {MediaService}=require('../apps/api/dist/modules/media/application/media.service');
const {MediaSyncService}=require('../apps/api/dist/modules/media/application/media-sync.service');
const {MediaAccess}=require('../apps/api/dist/modules/media/application/media-access.service');
const {resolveUserGrants}=require('../apps/api/dist/modules/media/application/media-sync-user');
const {validateMedia}=require('../apps/api/dist/modules/media/application/media-validation');
const {syncManifest,syncHash}=require('../apps/api/dist/modules/media/application/media-sync-model');
const {mediaHash}=require('../apps/api/dist/modules/media/infrastructure/media-providers');
const {createLegacySources}=require('./media-legacy-sources.cjs');
const args=process.argv.slice(2),flags=new Set(['--apply','--compare','--dry-run']);
const values=new Set(['--run','--confirm','--origin','--dump','--source-root','--map','--manifest','--report','--admin-id','--batch-size','--provider']);
for(let i=0;i<args.length;i++){if(flags.has(args[i]))continue;if(!values.has(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid argument.');i++;}
const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const business=createNivel3Client(),metadata=new MediaDatabase(),access=new MediaAccess(business,{}),media=new MediaService(metadata,access),sync=new MediaSyncService(metadata,media,access,business);
const root=path.resolve(option('--source-root',path.resolve(__dirname,'..')));
let aliases={};
function key(item){return aliases[item.sourceType+':'+item.sourceId]?.key || item.sourceType+':'+item.sourceId;}
async function write(file,value){await fs.writeFile(path.resolve(file),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
async function fullReport(report,user){
  const items=[...report.items];
  for(let offset=100;offset<report.run.total;offset+=100)items.push(...(await sync.report(user,report.run.id,offset)).items);
  const batches=[...report.batches];
  while(batches.length&&batches.length%30===0){const next=await sync.batches(user,report.run.id,batches.length);batches.push(...next);if(next.length<30)break;}
  return {...report,items,batches,hasMore:false};
}
async function scan(){
  const entries=[];
  for await(const item of createLegacySources(business,root)()){
    const mapped=aliases[item.sourceType+':'+item.sourceId],context=mapped?.context || item.context;
    if(!context)throw Error('Inventory has an unresolved parent; provide an audited identity map.');
    const identitySha256=mapped?.identitySha256 || await sync.identity(context);
    let availability='file',data,sha256=null,size=0;
    if(item.external)availability='external';
    else {data=item.load?await item.load():item.data;if(!data)availability='missing';else {try{validateMedia(data);sha256=mediaHash(data);size=data.length;}catch{availability='unsupported';}}}
    entries.push({key:key(item),sourceType:item.sourceType,sourceId:item.sourceId,name:item.name || 'media',context,identitySha256,sha256,size,availability});
    if(entries.length>50000)throw Error('Inventory exceeds bounded size; split by origin.');
  }
  return syncManifest({schema:1,origin:option('--origin'),dump:option('--dump'),complete:true,provider:option('--provider','local'),entries});
}
async function read(entry){
  for await(const item of createLegacySources(business,root)())if(key(item)===entry.key){
    if(item.sourceType!==entry.sourceType || item.sourceId!==entry.sourceId)throw Error('Source map changed after comparison.');
    const data=item.load?await item.load():item.data;
    if(!data)throw Error('Source disappeared.');return data;
  }
  throw Error('Source disappeared.');
}
(async()=>{
  if(option('--map')){aliases=JSON.parse(await fs.readFile(option('--map'),'utf8'));if(!aliases||typeof aliases!=='object'||Array.isArray(aliases))throw Error('Invalid map.');}
  if(args.includes('--apply')){
    if(args.includes('--compare')||args.includes('--dry-run'))throw Error('Choose one operation.');
    const run=option('--run'),confirmation=option('--confirm');
    if(!run||confirmation!==run||process.env.MEDIA_MIGRATION_ALLOW_APPLY!=='true')throw Error('Explicit apply authorization required.');
    const report=await sync.applyBatch(run,confirmation,read,Number(option('--batch-size','10')));
    if(option('--report'))await write(option('--report'),await fullReport(report,await resolveUserGrants(business,report.run.approvedBy)));
    console.log(JSON.stringify({run:report.run,summary:report.summary}));if(report.summary.some(s=>s.state==='failed'))process.exitCode=2;return;
  }
  const manifest=await scan();
  if(option('--manifest'))await write(option('--manifest'),manifest);
  if(args.includes('--compare')){
    const user=await resolveUserGrants(business,Number(option('--admin-id')));
    const report=await sync.compare(user,manifest);
    if(option('--report'))await write(option('--report'),await fullReport(report,user));
    console.log(JSON.stringify({run:report.run,summary:report.summary}));
  }else console.log(JSON.stringify({mode:'dry-run',origin:manifest.origin,dump:manifest.dump,count:manifest.entries.length,hash:syncHash(JSON.stringify(manifest)),persisted:false}));
})().catch(()=>{console.error('Synchronization stopped. Check the administrative report, identity map and server configuration. Originals preserved; secrets not logged.');process.exitCode=1;}).finally(async()=>{await business.$disconnect();await metadata.onModuleDestroy();});
