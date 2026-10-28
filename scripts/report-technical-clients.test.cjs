const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');
const {PrismaTicketAnalyticsRepository}=require('../apps/api/dist/modules/reports/infrastructure/prisma-ticket-analytics.repository');
const {ReportArchiveController}=require('../apps/api/dist/modules/reports/presentation/http/report-archive.controller');
const FIXTURES=`WITH fixture_clients AS (
 SELECT clt_id,clt_nomef,clt_sts,clt_ti,clt_adm,clt_mkt FROM (VALUES
 (1,N'TI',1,1,0,0),(2,N'DevOps',1,0,1,0),(3,N'Marketing',1,0,0,1),
 (4,N'TI e Marketing',1,1,0,1),(5,N'DevOps e Marketing',1,0,1,1),
 (6,N'Inativo TI',0,1,0,0),(7,N'Sem serviços',1,0,0,0),(8,N'Nulos',1,NULL,NULL,1),(9,N'TI e DevOps',1,1,1,0)
 ) AS c(clt_id,clt_nomef,clt_sts,clt_ti,clt_adm,clt_mkt)
) `;
function fixtureRepository(sql,type){
 return new PrismaTicketAnalyticsRepository({$queryRawUnsafe:async(query,...values)=>{
  if(query.includes('SELECT tipo_usuario'))return type===null?[]:[{tipo_usuario:type}];
  if(query.includes('FROM clientes_usuarios'))return[{cliente_id:1},{cliente_id:3},{cliente_id:4}];
  if(query.includes('FROM clientes c'))return sql.$queryRawUnsafe(FIXTURES+query.replace('FROM clientes c','FROM fixture_clients c'),...values);
  return[];
 }});
}
test('SQL Server: archive includes TI/DevOps and mixed clients; excludes marketing-only, inactive and missing service flags',async()=>{
 const sql=createNivel3Client();try{
  const repo=fixtureRepository(sql,1);
  assert.deepEqual((await repo.catalog(10,0,true)).clients.map(c=>c.id).sort((a,b)=>a-b),[1,2,4,5,9]);
  assert.deepEqual((await repo.catalog(10,0)).clients.map(c=>c.id).sort((a,b)=>a-b),[1,2,3,4,5,7,8,9]);
 }finally{await sql.$disconnect();}
});
test('SQL Server: technical filter preserves company scope and fails closed for missing users',async()=>{
 const sql=createNivel3Client();try{
  assert.deepEqual((await fixtureRepository(sql,2).catalog(10,0,true)).clients.map(c=>c.id).sort((a,b)=>a-b),[1,4]);
  assert.deepEqual((await fixtureRepository(sql,null).catalog(10,0,true)).clients,[]);
 }finally{await sql.$disconnect();}
});
test('archive listing and generation use the same eligibility; invalid batches are rejected before creating any PDF',async()=>{
 const saved=[],catalogCalls=[];
 const controller=new ReportArchiveController({authorize:async()=>{},save:async(clientId,_start,_end,pdf)=>{assert.ok(pdf.toString().startsWith('%PDF'));saved.push(clientId);return`fixture-${clientId}.pdf`;}},{
  catalog:async(userId,clientId,technicalOnly)=>{catalogCalls.push({userId,clientId,technicalOnly});return{clients:[{id:1,name:'TI'},{id:2,name:'DevOps'}],locations:[],technicians:[],categories:[]};},
  analytics:async(_userId,filters)=>({filters,generatedAt:new Date().toISOString(),total:0,rows:[]}),
 });
 const user={id:10};const body={startDate:'2026-10-01',endDate:'2026-10-28'};
 assert.equal((await controller.catalog(user)).clients.length,2);
 for(const clientIds of [[3],[6],[1,3]])await assert.rejects(controller.generate(user,{...body,clientIds}),e=>e.getStatus()===400);
 assert.equal(saved.length,0);
 assert.deepEqual((await controller.generate(user,{...body,clientIds:[1,2]})).files,['fixture-1.pdf','fixture-2.pdf']);
 assert.deepEqual(saved,[1,2]);assert.ok(catalogCalls.every(call=>call.userId===10&&call.clientId===0&&call.technicalOnly===true));
});
