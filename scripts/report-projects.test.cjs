const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');
const base='../apps/api/dist/modules/reports/';
const {PrismaTicketAnalyticsRepository}=require(base+'infrastructure/prisma-ticket-analytics.repository');
const {analyticsFilters}=require(base+'presentation/http/ticket-analytics.controller');
const {analyticsPdf}=require(base+'infrastructure/pdf/analytics-pdf');
const fixtures=`WITH fixture_records AS (
 SELECT kind,id,cliente,tecnico,nome,id_projeto FROM (VALUES
 ('p',101,1,1,N'Projeto A',NULL),('p',201,2,2,N'Projeto privado',NULL),
 ('t',1,1,1,N'Tarefa A',101),('t',2,2,2,N'Tarefa privada',201),('t',3,1,1,N'Vínculo inconsistente',201),('t',4,1,1,N'Avulsa',NULL)
 ) v(kind,id,cliente,tecnico,nome,id_projeto)
), fixture_common AS (
 SELECT *,CAST('2026-10-01' AS datetime2) AS abertura,CAST(NULL AS datetime2) AS fechamento,
 0 AS local,0 AS pessoa,0 AS categoria,0 AS subcategoria,0 AS item,0 AS tipo,0 AS nivel,0 AS forma,1 AS status,'' AS desc_abertura,'' AS desc_fechamento
 FROM fixture_records
), fixture_tarefas AS (SELECT *,nome AS nome_tarefa FROM fixture_common WHERE kind='t'),
 fixture_projetos AS (SELECT *,nome AS nome_proj FROM fixture_common WHERE kind='p'),
 fixture_usuarios AS (SELECT user_id,user_nome,user_funcao FROM (VALUES (1,N'Pessoa A',1),(2,N'Pessoa B',1)) v(user_id,user_nome,user_funcao)),
 fixture_cargos_n3 AS (SELECT 1 AS cargo_id,N'Analista DevOps' AS cargo_nome,0 AS is_global_admin),
 fixture_clientes AS (SELECT clt_id,clt_nomef,clt_nomer,1 AS clt_sts FROM (VALUES (1,N'Cliente A',N'Cliente A'),(2,N'Cliente privado',N'Cliente privado')) v(clt_id,clt_nomef,clt_nomer)),
 fixture_pessoas AS (SELECT 0 AS pessoa_id,'' AS pessoa_nom WHERE 1=0),
 fixture_locais AS (SELECT 0 AS local_id,'' AS local_nom,'' AS local_end,'' AS local_city,'' AS local_uf WHERE 1=0),
 fixture_categorias AS (SELECT 0 AS cat_id,'' AS cat_nome,0 AS cat_setor WHERE 1=0),
 fixture_subcategorias AS (SELECT 0 AS scat_id,'' AS scat_nome WHERE 1=0),
 fixture_itens AS (SELECT 0 AS itens_id,'' AS itens_nome WHERE 1=0) `;
function repository(sql){return new PrismaTicketAnalyticsRepository({$queryRawUnsafe:async(query,...values)=>{
 if(query.includes('SELECT tipo_usuario'))return[{tipo_usuario:2}];
 if(query.includes('FROM clientes_usuarios'))return[{cliente_id:1}];
 if(query.includes('AS sector FROM usuarios u')||query.includes('FROM categorias'))return[];
 return sql.$queryRawUnsafe(fixtures+query.replace(/\b(tarefas|projetos|usuarios|cargos_n3|clientes|pessoas|locais|categorias|subcategorias|itens)\b/g,table=>'fixture_'+table),...values);
}});}

test('SQL Server task/project reports and catalog honor company scope and protect names of inconsistent parent links',async()=>{
 const sql=createNivel3Client();try{
  const repo=repository(sql),filters=analyticsFilters({startDate:'2026-10-01',endDate:'2026-10-28',source:'tasks'});
  const tasks=await repo.analytics(1,filters);
  assert.equal(tasks.total,3);
  assert.equal(tasks.rows.find(row=>row.id===1).projectName,'Projeto A');
  assert.equal(tasks.rows.find(row=>row.id===3).projectName,'');
  assert.ok(!JSON.stringify(tasks).includes('Projeto privado'));
  assert.equal((await repo.analytics(1,{...filters,projectId:101})).total,1);
  assert.equal((await repo.analytics(1,{...filters,clientIds:[2]})).total,0);
  const projects=await repo.analytics(1,{...filters,source:'projects'});
  assert.equal(projects.total,1);assert.equal(projects.rows[0].title,'Projeto A');assert.equal(projects.rows[0].projectId,101);
  assert.equal((await repo.analytics(1,{...filters,source:'projects',projectId:201})).total,0);
  const catalog=await repo.catalog(1,0,false,true);
  assert.deepEqual(catalog.projects,[{id:101,name:'Projeto A'}]);
  assert.ok(analyticsPdf(projects).toString('latin1').includes('Projeto A'));
 }finally{await sql.$disconnect();}
});

test('project filter accepts only positive IDs and project-capable sources',()=>{
 assert.equal(analyticsFilters({source:'projects',projectId:'101'}).projectId,101);
 assert.throws(()=>analyticsFilters({source:'tickets',projectId:'101'}));
 assert.throws(()=>analyticsFilters({source:'tasks',projectId:'1 OR 1=1'}));
});
