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


const admin={id:0,name:'Teste de calendario',login:'fixture',accessSource:'rbac',roleAssignments:[],grants:[{permission:'system.admin',scope:'all'}]};
const state={calls:[],errors:[],confirmations:[],user:admin,saved:[],sequence:0};
const {QualityCalendarService}=require('../apps/api/dist/modules/quality/application/quality-calendar.service');
const calendar=new QualityCalendarService({});
function fixture(url,method,body){
 const u=new URL(url,'http://fixture'),pathname=u.pathname;state.calls.push({path:pathname,method,body,query:Object.fromEntries(u.searchParams)});
 if(pathname.endsWith('/auth/me'))return state.user;
 if(pathname.endsWith('/navigation'))return{sections:[]};
 if(pathname.endsWith('/notifications'))return{items:[],unreadCount:0,total:0};
 if(pathname.endsWith('/locations'))return calendar.locations(u.searchParams.get('state')||undefined);
 if(method==='POST'){
  const municipality=calendar.locations(body.state).municipalities.find(c=>c.id===body.municipalityId);
  const row={...body,id:++state.sequence,date:'2000-'+body.date.slice(3)+'-'+body.date.slice(0,2),national:false,origin:'regional',municipalityName:municipality?.name};state.saved.push(row);return row;
 }
 if(method==='DELETE'){state.saved=state.saved.filter(r=>r.id!==Number(pathname.split('/').at(-1)));return null;}
 const year=Number(u.searchParams.get('year')||2026);
 return{currentYear:2026,nextYear:2027,items:[{id:1,date:year+'-01-01',name:'Nacional',national:true,origin:'legacy'},...state.saved.map(r=>({...r,date:year+r.date.slice(4)}))]};
}
async function main(){
 await fs.access(edge);const temp=await fs.mkdtemp(path.join(os.tmpdir(),'holiday-calendar-browser-'));let api,next,browser,cdp;
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
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/quality/commemorative-dates'});
  await wait("document.querySelector('form label:nth-of-type(4) select')?.disabled===false");
  assert.equal(await cdp.evaluate("document.querySelector('form input').type"),'text');
  assert.equal(await cdp.evaluate("document.querySelectorAll('form select').length"),2);
  await setInput('input[placeholder="DD/MM"]','2809');
  assert.equal(await cdp.evaluate("document.querySelector('form input').value"),'28/09');
  await setInput('input[maxlength="120"]','Aniversario municipal');
  await choose('form label:nth-of-type(3) select','municipal');
  await choose('form label:nth-of-type(4) select','MG');
  await wait("[...document.querySelectorAll('form label:nth-of-type(5) option')].some(o=>o.value==='3101508') && !document.querySelector('form label:nth-of-type(5) select').disabled");
  await choose('form label:nth-of-type(5) select','3101508');await click('Adicionar feriado');
  await wait("document.querySelector('[role=status]')?.textContent.includes('Feriado cadastrado')");
  const posted=state.calls.find(c=>c.method==='POST').body;
  assert.deepEqual(posted,{date:'28/09',name:'Aniversario municipal',scope:'municipal',state:'MG',municipalityId:3101508});
  await choose('main select','2027');
  await wait("document.body.innerText.includes('28/09/2027')");
  assert.equal(state.saved.length,1);
  await choose('form label:nth-of-type(4) select','RJ');
  await wait("[...document.querySelectorAll('form label:nth-of-type(5) option')].some(o=>o.value==='3300407') && !document.querySelector('form label:nth-of-type(5) select').disabled");
  assert.equal(await cdp.evaluate("document.querySelector('form label:nth-of-type(5) select').value"),'');
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('form label:nth-of-type(5) option')].some(o=>o.value==='3101508')"),false);
  await choose('form label:nth-of-type(3) select','state');
  await wait("document.querySelectorAll('form select').length===2 && !document.querySelector('form label:nth-of-type(4) select').disabled");
  await setInput('input[placeholder="DD/MM"]','0907');await setInput('input[maxlength="120"]','Feriado estadual');
  await click('Adicionar feriado');
  await until(()=>state.saved.length===2);
  await wait("document.querySelector('button[type=submit]')?.textContent==='Adicionar feriado' && document.querySelector('input[placeholder=\"DD/MM\"]').value===''");
  assert.equal(state.calls.filter(c=>c.method==='POST').at(-1).body.municipalityId,undefined);
  assert.equal(await cdp.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),true);
  await fs.mkdir(path.join(root,'docs/quality'),{recursive:true});
  await fs.writeFile(path.join(root,'docs/quality/holidays-desktop.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await cdp.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),true);
  await fs.writeFile(path.join(root,'docs/quality/holidays-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await click('Excluir');await until(()=>state.saved.length===1);
  assert.ok(state.calls.some(c=>c.method==='DELETE'&&c.path.includes('/regional/')));
  state.user={...admin,grants:[{permission:'quality.dates.read',scope:'all'}]};
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/quality/commemorative-dates'});
  await wait("document.body.innerText.includes('Datas do ano') && !document.body.innerText.includes('Carregando calend')");
  assert.equal(await cdp.evaluate("document.querySelector('form')===null"),true);
  assert.deepEqual(state.errors,[]);
  console.log(JSON.stringify({dayMonthMask:true,stateAndMunicipality:true,recurrence:true,resetMunicipality:true,stateWithoutMunicipality:true,deletion:true,readonly:true,mobile:true,consoleExceptions:0}));

 }catch(error){
  console.error(JSON.stringify({page:cdp?await cdp.evaluate('document.body.innerText.slice(0,1600)'):null,errors:state.errors,calls:state.calls.map(c=>c.path)}));
  throw error;
 }finally{
  cdp?.ws.close();for(const child of[browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});if(api)await new Promise(resolve=>api.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
