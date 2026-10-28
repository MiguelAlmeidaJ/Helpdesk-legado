const {test}=require('node:test'),assert=require('node:assert/strict');
const {groupReportRows,reportChartGroups}=require('../apps/web/src/modules/reports/lib/report-center.ts');

const rows=Array.from({length:65},(_,i)=>({id:i+1,source:'tasks',clientId:i+1,clientName:'Cliente '+i,
 technicianId:i%3,technicianName:i%3?'Pessoa '+i%3:'Sem técnico',requesterId:i+1,requesterName:'Nome repetido',categoryId:i+1,categoryName:'Categoria',
 projectId:i%2?101:0,projectName:i%2?'Projeto A':'',openedAt:`2026-10-${i%2?'02':'01'}T08:00:00`,level:i%6,status:1}));

test('all center views preserve total, every level and distinct identities with identical labels',()=>{
 const snapshot=JSON.stringify(rows);
 for(const grouping of ['client','technician','category','requester','client-daily','technician-daily','project','status']){
  const groups=groupReportRows(rows,grouping);
  assert.equal(groups.reduce((sum,row)=>sum+row.total,0),rows.length);
  assert.ok(groups.every(row=>row.level1+row.level2+row.level3+row.other===row.total));
  const chart=reportChartGroups(groups);
  assert.ok(chart.length<=21);
  assert.equal(chart.reduce((sum,row)=>sum+row.total,0),rows.length);
  assert.equal(chart.reduce((sum,row)=>sum+(row.other??0),0),rows.filter(row=>![1,2,3].includes(row.level)).length);
 }
 assert.equal(groupReportRows(rows,'requester').length,65);
 assert.equal(groupReportRows(rows,'category').length,65);
 assert.equal(JSON.stringify(rows),snapshot);
 assert.deepEqual(groupReportRows([],'client'),[]);
});

test('daily groups combine times on the same day without combining clients or days',()=>{
 const input=[{...rows[0],clientId:1,openedAt:'2026-10-01T08:00:00'},{...rows[0],clientId:1,openedAt:'2026-10-01T18:00:00'},
 {...rows[0],clientId:2,openedAt:'2026-10-01T08:00:00'},{...rows[0],clientId:1,openedAt:'2026-10-02T08:00:00'}];
 const groups=groupReportRows(input,'client-daily');
 assert.equal(groups.length,3);
 assert.equal(groups.find(row=>row.key==='2026-10-01:1').total,2);
 assert.equal(reportChartGroups(groups).reduce((sum,row)=>sum+row.total,0),4);
});
