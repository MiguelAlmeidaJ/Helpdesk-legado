const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');
const base='../apps/api/dist/modules/reports/';
const {TicketBreakdownReportService}=require(base+'application/ticket-breakdown-report.service');
const {PrismaTicketAnalyticsRepository}=require(base+'infrastructure/prisma-ticket-analytics.repository');
const {analyticsFilters}=require(base+'presentation/http/ticket-analytics.controller');
const FIXTURES=`WITH fixture_atendimentos AS (
 SELECT id,CAST(opened AS datetime2) AS abertura,nivel,cliente,tecnico,pessoa,1 AS status,
 0 AS local,0 AS categoria,0 AS subcategoria,0 AS item,0 AS tipo,0 AS forma,
 CAST(NULL AS datetime2) AS fechamento,'' AS desc_abertura,'' AS desc_fechamento
 FROM (VALUES
 (1,'2026-10-01T08:00:00',1,1,1,1),(2,'2026-10-01T18:00:00',2,1,1,1),
 (3,'2026-10-02T09:00:00',3,2,2,2),(4,'2026-10-02T10:00:00',1,2,NULL,NULL),
 (5,'2026-10-02T11:00:00',1,1,3,1),(6,'2026-10-02T12:00:00',4,1,1,1),
 (7,'2026-10-03T00:00:00',1,1,1,1)
 ) v(id,opened,nivel,cliente,tecnico,pessoa)
), fixture_clientes AS (
 SELECT clt_id,clt_nomef,clt_nomer FROM (VALUES (1,N'Cliente A',N'Cliente A'),(2,N'Cliente B',N'Cliente B')) v(clt_id,clt_nomef,clt_nomer)
), fixture_usuarios AS (
 SELECT user_id,user_nome,user_funcao FROM (VALUES (1,N'Pessoa TI',1),(2,N'Pessoa DevOps',2),(3,N'Pessoa Legada',3)) v(user_id,user_nome,user_funcao)
), fixture_cargos_n3 AS (
 SELECT cargo_id,cargo_nome FROM (VALUES (1,N'Analista TI'),(2,N'Analista DevOps'),(3,N'Técnico')) v(cargo_id,cargo_nome)
), fixture_pessoas AS (
 SELECT pessoa_id,pessoa_nom FROM (VALUES (1,N'Solicitante A'),(2,N'Solicitante B')) v(pessoa_id,pessoa_nom)
), fixture_locais AS (SELECT 0 AS local_id,'' AS local_nom,'' AS local_end,'' AS local_city,'' AS local_uf WHERE 1=0),
 fixture_categorias AS (SELECT 0 AS cat_id,'' AS cat_nome,0 AS cat_setor WHERE 1=0),
 fixture_subcategorias AS (SELECT 0 AS scat_id,'' AS scat_nome WHERE 1=0),
 fixture_itens AS (SELECT 0 AS itens_id,'' AS itens_nome WHERE 1=0) `;
function fixtureDatabase(sql,external=false){return{$queryRawUnsafe:async(query,...params)=>{
 if(query.includes('SELECT tipo_usuario'))return[{tipo_usuario:external?2:1}];
 if(query.includes('FROM clientes_usuarios'))return[{cliente_id:1}];
 const tables=/\b(atendimentos|clientes|usuarios|cargos_n3|pessoas|locais|categorias|subcategorias|itens)\b/g;
 return sql.$queryRawUnsafe(FIXTURES+query.replace(tables,table=>'fixture_'+table),...params);
}};}
const filters={userId:1,startDate:'2026-10-01',endDate:'2026-10-02',level:0,clientId:0,clientIds:[],technicianId:0,categoryId:0,status:0};

const analyticsQuery={startDate:filters.startDate,endDate:filters.endDate};

test('SQL Server executes daily client, daily technician and requester reports and reconciles all sector buckets',async()=>{
 const sql=createNivel3Client();try{
  const db=fixtureDatabase(sql),service=new TicketBreakdownReportService(db),analytics=new PrismaTicketAnalyticsRepository(db);
  for(const mode of ['client-daily','technician-daily','requester']){
   for(const [sector,expected]of [['all',5],['ti',2],['devops',1]]){
    const result=await service.get({...filters,mode,sector});
    assert.equal(result.total,expected,mode+' '+sector);
    assert.equal(result.rows.reduce((sum,row)=>sum+row.total,0),expected);
    if(mode==='client-daily'&&sector==='all'){
     const row=result.rows.find(row=>row.date==='2026-10-01');
     assert.equal(row.total,2);assert.equal(row.level1,1);assert.equal(row.level2,1);
    }
    if(mode==='technician-daily'&&sector==='all')assert.ok(result.rows.some(row=>row.label==='Não atribuído'&&row.total===1));
    const detail=await analytics.analytics(1,analyticsFilters({...analyticsQuery,sector,levels:'1,2,3'}));
    assert.equal(detail.total,result.total);
    const coverage=detail.sectorCoverage;
    assert.equal(coverage.ti+coverage.devops+coverage.other+coverage.unassigned,coverage.total);
    if(sector==='all')assert.deepEqual(coverage,{total:5,ti:2,devops:1,other:1,unassigned:1});
   }
  }
  const detail=await analytics.analytics(1,analyticsFilters({...analyticsQuery,levels:'1,2,3'}));
  assert.ok(detail.rows.some(row=>row.technicianFunction==='Técnico'&&row.technicianSector===null));
  assert.equal((await analytics.analytics(1,analyticsFilters(analyticsQuery))).total,6,'Standalone analytics still includes levels 4 and 5 by default');
  assert.throws(()=>analyticsFilters({levels:'0,6'}));
 }finally{await sql.$disconnect();}
});

test('daily sector filters preserve client scope, explicit technician filters and exclusive end date',async()=>{
 const sql=createNivel3Client();try{
  const service=new TicketBreakdownReportService(fixtureDatabase(sql,true));
  for(const mode of ['client-daily','technician-daily','requester']){
   assert.equal((await service.get({...filters,mode,sector:'all'})).total,3);
   assert.equal((await service.get({...filters,mode,sector:'ti'})).total,2);
   assert.equal((await service.get({...filters,mode,sector:'devops'})).total,0);
   assert.equal((await service.get({...filters,mode,clientIds:[2]})).total,0);
   assert.equal((await service.get({...filters,mode,technicianId:1,sector:'devops'})).total,0);
  }
 }finally{await sql.$disconnect();}
});
