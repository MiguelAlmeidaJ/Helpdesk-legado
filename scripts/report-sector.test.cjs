const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');
const base='../apps/api/dist/modules/reports/';
const {reportSector,appendReportSector,sectorFunctionNames}=require(base+'infrastructure/report-sector');
const {analyticsFilters,TicketAnalyticsController}=require(base+'presentation/http/ticket-analytics.controller');
const {PrismaTicketAnalyticsRepository}=require(base+'infrastructure/prisma-ticket-analytics.repository');
const {TicketBreakdownReportService}=require(base+'application/ticket-breakdown-report.service');
const {analyticsPdf}=require(base+'infrastructure/pdf/analytics-pdf');
const {ReportsController}=require(base+'presentation/http/reports.controller');
const {ReportArchiveController}=require(base+'presentation/http/report-archive.controller');
const fixtures=`WITH fixture_roles AS (
 SELECT cargo_id,cargo_nome,CASE WHEN cargo_id IN (8,14) THEN 1 ELSE 0 END AS is_global_admin FROM (VALUES
 (1,N'Gestor TI'),(2,N'Analista TI'),(3,N'Técnico TI'),
 (4,N'Gestor DevOps'),(5,N'Analista DevOps'),(6,N'Tecnico DevOps'),
 (7,N'Marketing'),(8,N'Administrador global'),(9,N'Técnico'),
 (10,N'  TÉCNICO TI  '),(11,N'Gestor TI externo'),(14,N'Diretoria protegida')
 ) r(cargo_id,cargo_nome)
), fixture_users AS (
 SELECT cargo_id AS user_id,cargo_id AS user_funcao,CONCAT('Pessoa ',cargo_id) AS user_nome,
 CASE WHEN cargo_id=10 THEN 0 ELSE 1 END AS user_sts FROM fixture_roles
 UNION ALL SELECT 12,NULL,'Sem função',1
), fixture_tickets AS (
 SELECT user_id AS tecnico,user_id AS id,1 AS status,1 AS nivel,1 AS cliente,CAST('2026-10-28' AS datetime2) AS abertura FROM fixture_users
 UNION ALL SELECT NULL,13,1,1,1,CAST('2026-10-28' AS datetime2)
), fixture_espera AS (
 SELECT CAST(NULL AS int) AS espera_atd,CAST(NULL AS datetime2) AS espera_start,CAST(NULL AS datetime2) AS espera_end WHERE 1=0
) `;

test('sector validates an exact enum and defaults to all',()=>{
 for(const value of [undefined,'','all'])assert.equal(reportSector(value),'all');
 for(const value of ['ti','devops'])assert.equal(reportSector(value),value);
 for(const value of [null,1,[],{},'TI',"ti' OR 1=1",'marketing'])assert.throws(()=>reportSector(value));
 assert.equal(analyticsFilters({sector:'devops'}).sector,'devops');
 assert.throws(()=>analyticsFilters({sector:['ti','devops']}));
});

test('SQL Server fixtures: sectors match functions and global administration, including renamed protected roles',async()=>{
 const db=createNivel3Client();try{
  for(const [sector,expected]of [['ti',[1,2,3,10]],['devops',[4,5,6,8,14]],['all',[1,2,3,4,5,6,7,8,9,10,11,12,13,14]]]){
   const where=[],params=[];appendReportSector(where,params,sector);
   const query=fixtures+`SELECT a.id FROM fixture_tickets a WHERE ${where.join(' AND ')||'1=1'} ORDER BY a.id`;
   const rows=await db.$queryRawUnsafe(query.replaceAll('FROM usuarios rs_user','FROM fixture_users rs_user').replaceAll('JOIN cargos_n3 rs_role','JOIN fixture_roles rs_role'),...params);
   assert.deepEqual(rows.map(r=>r.id),expected);
  }
  const repo=new PrismaTicketAnalyticsRepository({$queryRawUnsafe:async(query,...values)=>{
   if(query.includes('SELECT tipo_usuario'))return[{tipo_usuario:1}];
   if(query.includes('AS sector FROM usuarios u'))return db.$queryRawUnsafe(fixtures+query.replace('FROM usuarios u','FROM fixture_users u').replace('JOIN cargos_n3 rs_role','JOIN fixture_roles rs_role'),...values);
   return[];
  }});
  const technicians=(await repo.catalog(1,0)).technicians;
  assert.deepEqual(technicians.map(r=>r.id).sort((a,b)=>a-b),[1,2,3,4,5,6,8,14]);
  assert.ok(technicians.every(r=>r.sector===(r.id<=3?'ti':'devops')));
  assert.equal(technicians.find(r=>r.id===8).isGlobalAdmin,true);
  assert.equal(technicians.find(r=>r.id===14).isGlobalAdmin,true);
  assert.equal(technicians.find(r=>r.id===14).functionName,'Diretoria protegida');
  assert.equal(technicians.find(r=>r.id===1).isGlobalAdmin,false);
 }finally{await db.$disconnect();}
});

function captureDatabase(calls){return{$queryRawUnsafe:async(sql,...params)=>{
 if(sql.includes('SELECT tipo_usuario'))return[{tipo_usuario:1}];
 calls.push({sql,params});return[];
}};}

test('every report query binds sector functions, including all unified sources and workload',async()=>{
 const calls=[],db=captureDatabase(calls),repo=new PrismaTicketAnalyticsRepository(db);
 const filters=analyticsFilters({sector:'ti',source:'unified'});
 await repo.analytics(1,filters);
 assert.equal(calls.length,2);
 await repo.analytics(1,{...filters,source:'improvements'});
 await repo.technicianTiming(1,{...filters,technicianIds:[]});
 await repo.workload(1,'ti');
 const query={userId:1,...filters};
 for(const name of ['Client','Category','Technician']){
  const {['PrismaTicket'+name+'TotalsReportRepository']:Repo}=require(base+'infrastructure/prisma-ticket-'+name.toLowerCase()+'-totals-report.repository');
  await new Repo(db).get(query);
 }
 for(const mode of ['client-daily','technician-daily','requester'])await new TicketBreakdownReportService(db).get({...query,mode});
 assert.equal(calls.length,11);
 for(const {sql,params}of calls){
  assert.match(sql,/EXISTS \(SELECT 1 FROM usuarios rs_user/);
  assert.ok(sql.includes('rs_user.user_id = a.tecnico')||sql.includes('rs_user.user_id = u.user_id'));
  assert.ok(!sql.includes('gestor ti'));
  for(const name of sectorFunctionNames('ti'))assert.ok(params.includes(name));
 }
});

test('SQL Server executes workload aggregation for all sectors without counting unassigned tickets',async()=>{
 const db=createNivel3Client();try{
  const repo=new PrismaTicketAnalyticsRepository({$queryRawUnsafe:async(sql,...params)=>{
   if(sql.includes('SELECT tipo_usuario'))return[{tipo_usuario:1}];
   return db.$queryRawUnsafe(fixtures+sql.replaceAll('FROM usuarios u','FROM fixture_users u').replaceAll('FROM usuarios rs_user','FROM fixture_users rs_user').replaceAll('JOIN cargos_n3 rs_role','JOIN fixture_roles rs_role').replaceAll('FROM atendimentos a','FROM fixture_tickets a').replaceAll('FROM espera','FROM fixture_espera'),...params);
  }});
  for(const [sector,expected]of [['all',8],['ti',3],['devops',5]]){
   const report=await repo.workload(1,sector);
   assert.equal(report.rows.length,expected);
   assert.ok(report.rows.every(row=>row.open===1&&row.waiting===0));
  }
 }finally{await db.$disconnect();}
});

test('timing and workload reject invalid sectors at the HTTP boundary; PDFs identify the applied sector',async()=>{
 const controller=new TicketAnalyticsController({technicianTiming:(_id,filters)=>filters,workload:(_id,sector)=>sector});
 assert.throws(()=>controller.technicianTiming({id:1},{sector:'invalid'}));
 assert.throws(()=>controller.workload({id:1},'invalid'));
 assert.equal(controller.technicianTiming({id:1},{sector:'ti'}).sector,'ti');
 assert.equal(controller.workload({id:1},'devops'),'devops');
 const pdf=analyticsPdf({filters:analyticsFilters({sector:'devops'}),total:0,rows:[]});
 assert.ok(pdf.toString('latin1').includes('Setor: DevOps'));
});

test('totals, breakdown and archived PDF generation forward the same validated sector',async()=>{
 const service={execute:input=>input,get:input=>input};
 const controller=new ReportsController(service,service,service,service);
 for(const method of ['getTicketClientTotals','getTicketCategoryTotals','getTicketTechnicianTotals']){
  const args=[{id:1},...Array(8).fill(undefined)];
  assert.equal(controller[method](...args,'ti').sector,'ti');
  assert.throws(()=>controller[method](...args,'invalid'));
 }
 assert.equal(controller.getTicketBreakdown({id:1},'requester',...Array(8).fill(undefined),'devops').sector,'devops');
 let received;
 const archive=new ReportArchiveController({authorize:async()=>{},save:async()=> 'fixture.pdf'},{
  catalog:async()=>({clients:[{id:1,name:'Cliente'}]}),
  analytics:async(_id,filters)=>{received=filters;return{filters,total:0,rows:[]};},
 });
 const body={clientIds:[1],startDate:'2026-10-01',endDate:'2026-10-28',sector:'devops'};
 assert.deepEqual((await archive.generate({id:1},body)).files,['fixture.pdf']);
 assert.equal(received.sector,'devops');
 await assert.rejects(archive.generate({id:1},{...body,sector:'invalid'}));
});
