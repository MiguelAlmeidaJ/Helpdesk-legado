const {test}=require('node:test');const assert=require('node:assert/strict');
const {AppPermission:P,PermissionScope:S,Sector}=require('../packages/contracts/dist');
const {MediaAccess}=require('../apps/api/dist/modules/media/application/media-access.service');
const {MediaService}=require('../apps/api/dist/modules/media/application/media.service');
const {ForbiddenException}=require('../apps/api/node_modules/@nestjs/common');
const user=(grants,id=7)=>({id,grants,roleAssignments:[]});
const grant=(permission,scope=S.All)=>({permission,scope});
function access(record,external=false,linked=true){return new MediaAccess({async $queryRawUnsafe(sql){if(sql.includes('FROM dbo.usuarios'))return[{tipo_usuario:external?2:1}];if(sql.includes('clientes_usuarios'))return linked?[{cliente_id:10}]:[];return record?[record]:[];}},{findByUserId:async()=>({sectors:[Sector.IT,Sector.DevOps],permissions:{[Sector.IT]:{read:true,execute:true,edit:true,manageOthers:true},[Sector.DevOps]:{read:true,execute:true,edit:true,manageOthers:true}}})});}
test('media denies wrong module and own-scope record access',async()=>{
  const record={id:1,client_id:10,owner_id:8,sector_id:1};
  await assert.rejects(access(record).assert(user([]),{type:'catalog',id:'1'}));
  await assert.rejects(access(record).assert(user([grant(P.CatalogTiRead,S.Own)]),{type:'catalog',id:'1'}));
  await assert.rejects(access(record).assert(user([grant(P.DevOpsProjectsRead,S.Own)]),{type:'project',id:'1'}));
  await access({...record,owner_id:7}).assert(user([grant(P.CatalogTiRead,S.Own)]),{type:'catalog',id:'1'});
});
test('external users cannot access records from another client',async()=>{
  const record={id:1,client_id:10,owner_id:7,sector_id:1};
  await assert.rejects(access(record,true,false).assert(user([grant(P.CatalogTiRead)]),{type:'catalog',id:'1'}));
  await access(record,true,true).assert(user([grant(P.CatalogTiRead)]),{type:'catalog',id:'1'});
});
test('system media is admin-only and deleted/missing parents are denied even to admin',async()=>{
  await assert.rejects(access({}).assert(user([]),{type:'system',id:'global'}));
  await access({}).assert(user([grant(P.SystemAdmin)]),{type:'system',id:'global'});
  await assert.rejects(access(null).assert(user([grant(P.SystemAdmin)]),{type:'ticket',id:'1'}));
});
test('shared media only exposes visible links and cannot be deleted through a partial scope',async()=>{
  const id='00000000-0000-4000-8000-000000000001';let mutated=false;
  const service=new MediaService({client:{async $queryRawUnsafe(sql){if(sql.includes('FROM dbo.media_objects'))return[{id,provider:'local',provider_key:'private-key',original_name:'fixture.png',mime_type:'image/png',size_bytes:10,sha256:'hash',status:'active',created_at:new Date()}];return[{context_type:'catalog',context_id:'1'},{context_type:'catalog',context_id:'2'}];},async $transaction(){mutated=true;}}},{async assert(actor,context){if(context.id==='2')throw new ForbiddenException();}});
  const item=await service.get(user([]),id);assert.deepEqual(item.links,[{type:'catalog',id:'1'}]);assert.equal(item.provider_key,undefined);
  await assert.rejects(service.softDelete(user([]),id));assert.equal(mutated,false);
});
test('write grants cannot widen an own-scoped or missing read permission',async()=>{
  const record={id:1,client_id:10,owner_id:8,sector_id:1};
  await assert.rejects(access(record).assert(user([grant(P.DevOpsProjectsRead,S.Own),grant(P.DevOpsProjectsEdit)]),{type:'project',id:'1'},true));
  await assert.rejects(access(record).assert(user([grant(P.DevOpsTasksEdit)]),{type:'task',id:'1'},true));
});
