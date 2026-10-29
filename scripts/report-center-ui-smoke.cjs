// Isolated browser fixtures. Every /api request is intercepted; no production writes.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const edge=process.env.USER_FUNCTIONS_TEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
async function port(){const server=http.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const value=server.address().port;await new Promise(resolve=>server.close(resolve));return value;}
async function until(check,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){try{const value=await check();if(value)return value;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out waiting for browser fixture.');}
class Cdp{
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.events=new Map();ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.id){const pending=this.pending.get(message.id);this.pending.delete(message.id);message.error?pending?.reject(new Error(message.error.message)):pending?.resolve(message.result);}else this.events.get(message.method)?.(message.params);});}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  async evaluate(expression){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result?.value;}
}


const admin={id:0,name:'Teste de relatórios',login:'fixture',accessSource:'rbac',roleAssignments:[],grants:[{permission:'system.admin',scope:'all'}]};
const state={calls:[],errors:[],confirmations:[],user:admin};
const sample=Array.from({length:55},(_,i)=>({id:i+1,source:'tickets',clientId:i%2+1,clientName:'Cliente '+(i%2+1),locationName:'Local A',locationAddress:'',
 requesterId:i%4+1,requesterName:'Solicitante '+(i%4+1),technicianId:i%3,technicianName:i%3?'Pessoa '+i%3:'Sem técnico',technicianFunction:i%3===1?'Analista TI':i%3===2?'Analista DevOps':'',technicianSector:i%3===1?'ti':i%3===2?'devops':null,
 categoryId:i%2+1,categoryName:'Categoria '+i%2,subcategoryName:'',itemName:'',type:1,level:i%6,method:1,status:i%5+1,openedAt:'2026-10-02T08:00:00',closedAt:null,openingDescription:i%5===0?'Evento Zabbix':'Descrição completa '+(i+1),closingDescription:'',elapsedSeconds:3600}));
function fixture(url,method){
 const u=new URL(url,'http://fixture'),pathname=u.pathname;
 if(method==='OPTIONS')return{};
 state.calls.push({path:pathname,query:Object.fromEntries(u.searchParams),method});
 if(pathname.endsWith('/auth/me'))return state.user;
 if(pathname.endsWith('/navigation'))return{sections:[]};
 if(pathname.endsWith('/notifications'))return{items:[],unreadCount:0,total:0};
 if(pathname.endsWith('/catalog'))return{clients:[{id:1,name:'Cliente 1'},{id:2,name:'Cliente 2'}],locations:[],technicians:[{id:1,name:'Pessoa 1',sector:'ti'},{id:2,name:'Pessoa 2',sector:'devops',functionName:'Analista DevOps'},{id:3,name:'Admin global teste',sector:'devops',functionName:'Administrador global',isGlobalAdmin:true}],categories:[{id:1,name:'Categoria 1'}],projects:[{id:101,name:'Projeto 101'},{id:102,name:'Projeto 102'}]};
 const filters={startDate:'2026-10-01',endDate:'2026-10-28',source:'tickets',sector:'all',clientIds:[],clientId:0,technicianId:0,categoryId:0,projectId:0,categorySector:0,locationId:0,level:0,status:0,...Object.fromEntries(u.searchParams)};
 for(const key of ['clientId','technicianId','categoryId','projectId','level','status'])filters[key]=Number(filters[key]);
 filters.clientIds=String(filters.clientIds).split(',').filter(Boolean).map(Number);
 let rows=sample.map(r=>({...r,source:filters.source,...(filters.source==='tasks'?{title:'Tarefa '+r.id,projectId:r.id%2?101:102,projectName:'Projeto '+(r.id%2?101:102)}:{})}));
 if(filters.source==='projects')rows=rows.slice(0,2).map((r,i)=>({...r,id:101+i,title:'Projeto '+(101+i),projectId:101+i,projectName:'Projeto '+(101+i)}));
 rows=rows.filter(r=>(filters.sector==='all'||r.technicianSector===filters.sector)&&(!filters.projectId||r.projectId===filters.projectId)&&(!filters.technicianId||r.technicianId===filters.technicianId)&&(!filters.clientIds.length||filters.clientIds.includes(r.clientId))&&(!filters.level||r.level===filters.level)&&(!filters.status||r.status===filters.status));
 const sectorCoverage={total:rows.length,ti:0,devops:0,other:0,unassigned:0};for(const r of rows){if(!r.technicianId)sectorCoverage.unassigned++;else if(r.technicianSector)sectorCoverage[r.technicianSector]++;else sectorCoverage.other++;}
 if(pathname.endsWith('/technician-timing'))return{filters:{...filters,technicianIds:[]},rows:[],details:[],totalTickets:0,acceptedTickets:0,completedTickets:0,generatedAt:new Date().toISOString()};
 return{filters,total:rows.length,rows,sectorCoverage,generatedAt:new Date().toISOString()};
}
async function main(){
 await fs.access(edge);const temp=await fs.mkdtemp(path.join(os.tmpdir(),'report-sector-browser-'));let api,next,browser,cdp;
 try{
  api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture(req.url,req.method)));});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  const apiPort=api.address().port,webPort=await port(),bin=require.resolve('next/dist/bin/next',{paths:[path.join(root,'apps/web')]});
  next=spawn(process.execPath,[bin,'start','-p',String(webPort)],{cwd:path.join(root,'apps/web'),env:{...process.env,API_INTERNAL_URL:'http://127.0.0.1:'+apiPort+'/api'},windowsHide:true,stdio:'ignore'});
  await until(async()=>{const response=await fetch('http://127.0.0.1:'+webPort+'/reports/tickets/by-client');return response.status===200;},60000);
  browser=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const debugPort=await until(async()=>Number((await fs.readFile(path.join(temp,'DevToolsActivePort'),'utf8')).split('\n')[0]));
  const targets=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});cdp=new Cdp(socket);
  cdp.events.set('Runtime.exceptionThrown',event=>state.errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  cdp.events.set('Page.javascriptDialogOpening',event=>{state.confirmations.push(event.message);return cdp.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>undefined);});
  cdp.events.set('Fetch.requestPaused',async event=>{
   try{
    if(!event.request.url.includes('/api/')){await cdp.send('Fetch.continueRequest',{requestId:event.requestId});return;}
    const value=fixture(event.request.url,event.request.method,event.request.postData?JSON.parse(event.request.postData):undefined);
    const origin=Object.entries(event.request.headers).find(([key])=>key.toLowerCase()==='origin')?.[1]||'http://localhost:'+webPort;
    await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:event.request.method==='POST'?201:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:String(origin)},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Content-Type,X-Helpdesk-Request'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,DELETE,OPTIONS'}],body:Buffer.from(value===null?'':JSON.stringify(value)).toString('base64')});
   }catch(error){state.errors.push(`Fixture interception failed: ${error.message}`);await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:500,body:Buffer.from('{}').toString('base64')}).catch(()=>undefined);}
  });
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/reports/tickets/by-client'});
  const wait=async expression=>until(()=>cdp.evaluate(expression));
  const click=async text=>cdp.evaluate(`(()=>{const scope=document.querySelector('dialog[open]')??document;const button=[...scope.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(text)});button.focus();button.click();})()`);
  const setInput=async(selector,value)=>cdp.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);


  await cdp.send('Page.bringToFront');await cdp.send('Browser.setDownloadBehavior',{behavior:'deny'});
  const choose=async(selector,value)=>cdp.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/reports/overview'});
  await wait("document.querySelector('button[type=submit]')?.textContent==='Aplicar filtros'");
  assert.equal(await cdp.evaluate("document.querySelectorAll('[aria-label=\"Grupos de relat\u00f3rios\"] a').length"),4);
  assert.equal(await cdp.evaluate("document.body.innerText.includes('Situa\u00e7\u00e3o: Todas as situa\u00e7\u00f5es ativas')"),true);
  const initialCalls=state.calls.filter(c=>c.path.endsWith('/analytics')).length;
  const labels=['Atd. total por cliente','Atd. di\u00e1rio por cliente','Atd. total por solicitante','Atd. total por t\u00e9cnico','Atd. di\u00e1rio por t\u00e9cnico','Atd. total por categoria'];
  assert.equal(await cdp.evaluate("document.querySelectorAll('[aria-label=\"Relat\u00f3rios de atendimentos\"] button').length"),6);
  for(const label of labels){
   await click(label);await wait(`[...document.querySelectorAll('h2')].some(h=>h.textContent===${JSON.stringify(label)})`);
   assert.equal(await cdp.evaluate("document.querySelector('#report-records-title').textContent==='Registros detalhados (55)'"),true);
  }
  assert.equal(await cdp.evaluate("document.querySelector('[data-sector-coverage], [data-recognized-technicians]')===null"),true);
  const buttonsBeforeFilters=()=>cdp.evaluate("document.querySelector('[role=group][aria-label=\"Relat\\u00f3rios de atendimentos\"]').getBoundingClientRect().bottom<=document.querySelector('form').getBoundingClientRect().top");
  assert.equal(await buttonsBeforeFilters(),true);

  for(const view of ['technician','category','requester','client-daily','technician-daily','status','client']){
   await choose('select[aria-label=Visualiza\u00e7\u00e3o]',view);
   await wait(`document.querySelector('select[aria-label=Visualiza\u00e7\u00e3o]').value===${JSON.stringify(view)}`);
   assert.equal(await cdp.evaluate("document.querySelector('#report-records-title').textContent==='Registros detalhados (55)'"),true);
  }
  assert.equal(state.calls.filter(c=>c.path.endsWith('/analytics')).length,initialCalls);
  await cdp.evaluate("window.__csvBlobs=[];const create=URL.createObjectURL;URL.createObjectURL=blob=>{window.__csvBlobs.push(blob);return create(blob)};HTMLAnchorElement.prototype.click=function(){};");
  await click('Exportar registros');assert.equal((await cdp.evaluate('window.__csvBlobs.at(-1).text()')).split(String.fromCharCode(13,10)).length,56);
  assert.equal(await cdp.evaluate("document.querySelectorAll('section[aria-labelledby=report-records-title] tbody tr').length"),50);
  await cdp.evaluate("window.dispatchEvent(new Event('beforeprint'))");
  assert.equal(await cdp.evaluate("document.querySelectorAll('section[aria-labelledby=report-records-title] tbody tr').length"),55);
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('section[aria-labelledby=report-records-title] details')].every(d=>d.open)"),true);
  await cdp.evaluate("window.dispatchEvent(new Event('afterprint'))");
  await setInput('input[aria-label=\"Buscar nos resultados\"]','Zabbix');
  await wait("document.querySelector('#report-records-title').textContent==='Registros detalhados (11)'");
  await setInput('input[aria-label=\"Buscar nos resultados\"]','');
  await choose('select[aria-label=\"Men\u00e7\u00e3o ao Zabbix\"]','yes');
  await wait("document.querySelector('#report-records-title').textContent==='Registros detalhados (11)'");
  await choose('select[aria-label=\"Men\u00e7\u00e3o ao Zabbix\"]','all');
  await choose('select[aria-label=Setor]','ti');await click('Aplicar filtros');
  await wait("document.querySelector('button[type=submit]')?.textContent==='Aplicar filtros'");
  assert.equal(state.calls.filter(c=>c.path.endsWith('/analytics')).at(-1).query.sector,'ti');
  await fs.writeFile(path.join(root,'docs/reports/report-center-desktop.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1440,height:1750,scale:1}})).data,'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await cdp.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),true);
  assert.equal(await buttonsBeforeFilters(),true);
  await fs.writeFile(path.join(root,'docs/reports/report-center-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:390,height:1600,scale:1}})).data,'base64'));
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/reports/projects'});
  await wait("document.querySelector('button[type=submit]')?.textContent==='Aplicar filtros'");
  assert.equal(state.calls.filter(c=>c.path.endsWith('/analytics')).at(-1).query.source,'tasks');
  await choose('select[aria-label=Visualiza\u00e7\u00e3o]','project');
  await choose('select[aria-label=Consulta]','projects');await click('Aplicar filtros');
  await wait("document.querySelector('#report-records-title').textContent==='Registros detalhados (2)'");
  await click('Baixar PDF anal\u00edtico');
  await until(()=>state.calls.some(c=>c.path.endsWith('/analytics.pdf')&&c.query.source==='projects'));
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/reports/tickets/technician-timing'});
  await wait("document.querySelector('select[aria-label=Setor]')?.disabled===false");
  assert.equal(await cdp.evaluate("document.querySelectorAll('main').length"),1);
  await click('Tempo decorrido');await wait("document.querySelector('select[aria-label=Setor]')?.disabled===false");
  await click('Carga atual');await until(()=>state.calls.some(c=>c.path.endsWith('/workload')));
  state.user={...admin,grants:[{permission:'reports.read',scope:'all'}]};
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/reports/overview'});
  await wait("document.querySelector('button[type=submit]')?.textContent==='Aplicar filtros'");
  assert.equal(await cdp.evaluate("document.querySelectorAll('[aria-label=\"Grupos de relat\u00f3rios\"] a').length"),3);
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Baixar PDF anal\u00edtico')"),false);
  assert.deepEqual(state.errors,[]);
  console.log(JSON.stringify({groups:4,explicitViews:6,diagnosticsRemoved:true,buttonsBeforeFilters:true,views:7,sharedFilters:true,groupingRequests:0,csvAllRows:true,printAllRows:true,zabbixTextFilter:true,projects:true,timingViews:3,pdfPermission:true,mobile:true,consoleExceptions:0}));

 }catch(error){
  console.error(JSON.stringify({page:cdp?await cdp.evaluate('document.body.innerText.slice(0,1600)'):null,errors:state.errors,calls:state.calls.map(c=>c.path)}));
  throw error;
 }finally{
  cdp?.ws.close();for(const child of[browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});if(api)await new Promise(resolve=>api.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
