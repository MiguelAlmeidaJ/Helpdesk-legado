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


const user={id:0,name:'Administração de teste',login:'fixture',accessSource:'rbac',roleAssignments:[],grants:[{permission:'system.admin',scope:'all'}]};
const state={calls:[],errors:[],confirmations:[],files:[],partial:false};
const clients=Array.from({length:60},(_,i)=>({id:i+1,name:'Cliente '+String(i+1).padStart(2,'0')+(i===2?' CONSULTORIA EMPRESARIAL E SERVIÇOS DE TECNOLOGIA':'')}));
function fixture(url,method,body){
 const pathname=new URL(url,'http://fixture').pathname;
 if(method==='OPTIONS')return{};
 state.calls.push({path:pathname,method,body});
 if(pathname.endsWith('/auth/me'))return user;
 if(pathname.endsWith('/navigation'))return{sections:[]};
 if(pathname.endsWith('/notifications'))return{items:[],unreadCount:0,total:0};
 if(pathname.endsWith('/reports/archive/catalog'))return{clients,locations:[],technicians:[],categories:[]};
 if(pathname.endsWith('/archive/generate')){
  const ids=state.partial?body.clientIds.slice(0,1):body.clientIds;
  state.files=ids.map(id=>({name:`cliente-${id}-2026-10-relatorio-de-atendimentos.pdf`,size:20480,modifiedAt:'2026-10-28T14:00:00Z',expiresAt:'2026-11-12T14:00:00Z'}));
  return{files:state.files.map(f=>f.name),errors:state.partial?[{clientId:2,message:'Falha simulada na geração.'}]:[]};
 }
 if(pathname.endsWith('/reports/archive')){if(method==='DELETE'){state.files=state.files.filter(f=>!body.names.includes(f.name));return{};}return state.files;}
 return{};
}
async function main(){
 await fs.access(edge);const temp=await fs.mkdtemp(path.join(os.tmpdir(),'report-archive-browser-'));let api,next,browser,cdp;
 try{
  api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture(req.url,req.method)));});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  const apiPort=api.address().port,webPort=await port(),bin=require.resolve('next/dist/bin/next',{paths:[path.join(root,'apps/web')]});
  next=spawn(process.execPath,[bin,'start','-p',String(webPort)],{cwd:path.join(root,'apps/web'),env:{...process.env,API_INTERNAL_URL:'http://127.0.0.1:'+apiPort+'/api'},windowsHide:true,stdio:'ignore'});
  await until(async()=>{const response=await fetch('http://127.0.0.1:'+webPort+'/reports/archive');return response.status===200;},60000);
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
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/reports/archive'});
  const wait=async expression=>until(()=>cdp.evaluate(expression));
  const click=async text=>cdp.evaluate(`(()=>{const scope=document.querySelector('dialog[open]')??document;const button=[...scope.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(text)});button.focus();button.click();})()`);
  const setInput=async(selector,value)=>cdp.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);


  await cdp.send('Browser.setDownloadBehavior',{behavior:'deny'});
  await wait("document.querySelector('[aria-label=\"Lista de clientes\"] input')?.disabled===false");
  assert.equal(await cdp.evaluate("document.body.innerText.includes('Nenhum relatório disponível')"),true);
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Gerar PDFs').disabled"),true);
  assert.equal(await cdp.evaluate("(()=>{const label=document.querySelector('[aria-label=\"Lista de clientes\"] label');const checkbox=label.querySelector('input').getBoundingClientRect(),text=label.querySelector('span').getBoundingClientRect();return checkbox.width<=20&&Math.abs(checkbox.y+checkbox.height/2-text.y-text.height/2)<5;})()"),true);
  await setInput('input[aria-label="Buscar cliente"]','Cliente 60');
  await wait("document.querySelectorAll('[aria-label=\"Lista de clientes\"] label').length===1");
  await cdp.evaluate("document.querySelector('[aria-label=\"Lista de clientes\"] input').click()");
  await setInput('input[aria-label="Buscar cliente"]','');await wait("document.querySelectorAll('[aria-label=\"Lista de clientes\"] label').length===60");
  await click('Selecionar visíveis');await wait("document.body.innerText.includes('50/50 selecionados')");
  assert.equal(await cdp.evaluate("document.querySelectorAll('[aria-label=\"Lista de clientes\"] input:checked').length"),50);
  assert.equal(await cdp.evaluate("document.querySelectorAll('[aria-label=\"Lista de clientes\"] input:disabled').length"),10);
  await click('Limpar seleção');await wait("document.querySelectorAll('[aria-label=\"Lista de clientes\"] input:checked').length===0");
  await cdp.evaluate("const inputs=document.querySelectorAll('[aria-label=\"Lista de clientes\"] input');inputs[0].click();inputs[1].click()");
  await wait("document.body.innerText.includes('2/50 selecionados')");
  await click('Gerar PDFs (2)');await wait("document.querySelectorAll('tbody tr').length===2 && document.body.innerText.includes('2 PDF(s) gerado(s).')");
  const generation=state.calls.find(c=>c.path.endsWith('/archive/generate'));assert.deepEqual(generation.body.clientIds,[1,2]);assert.match(generation.body.startDate,/^\d{4}-\d{2}-\d{2}$/);
  await fs.mkdir(path.join(root,'docs/reports'),{recursive:true});
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(path.join(root,'docs/reports/report-archive-desktop.png'),Buffer.from(shot.data,'base64'));
  await cdp.evaluate("document.querySelector('tbody input[type=checkbox]').click()");
  assert.equal(await cdp.evaluate("document.querySelector('thead input').indeterminate"),true);
  await click('Baixar selecionados (1)');await wait("[...document.querySelectorAll('button')].find(b=>b.textContent==='Atualizar').disabled===false");
  assert.equal(state.calls.find(c=>c.path.endsWith('/archive/download')).body.names.length,1);
  await cdp.evaluate("document.querySelector('button[aria-label^=\"Baixar cliente-\"]').click()");
  await wait("[...document.querySelectorAll('button')].find(b=>b.textContent==='Atualizar').disabled===false");
  assert.ok(state.calls.some(c=>c.path.endsWith('.pdf')));
  await click('Excluir selecionados');await wait("document.querySelectorAll('tbody tr').length===1");assert.equal(state.confirmations.length,1);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await cdp.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),true);
  assert.equal(await cdp.evaluate("(()=>{const h=document.querySelector('h1');return h.scrollWidth<=h.clientWidth;})()"),true);
  assert.equal(await cdp.evaluate("document.querySelector('button[type=submit]').getBoundingClientRect().top>document.querySelector('[aria-label=\"Lista de clientes\"]').getBoundingClientRect().bottom"),true);
  const mobileShot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(path.join(root,'docs/reports/report-archive-mobile.png'),Buffer.from(mobileShot.data,'base64'));
  await cdp.evaluate("document.querySelector('input[aria-label=\"Selecionar todos os arquivos\"]').click()");await click('Excluir selecionados');await wait("document.body.innerText.includes('Nenhum relatório disponível')");
  state.partial=true;await click('Gerar PDFs (2)');await wait("document.querySelector('[role=alert]')?.textContent.includes('Falha simulada')===true");
  assert.equal(await cdp.evaluate("document.querySelectorAll('tbody tr').length"),1);
  assert.deepEqual(state.errors,[]);
  console.log(JSON.stringify({layout:true,inlineCheckboxes:true,emptyState:true,clientSearch:true,selectionLimit:50,generation:true,zip:true,pdf:true,delete:'fixtures only',partialFailure:true,mobile:true,consoleExceptions:0}));
 }catch(error){
  console.error(JSON.stringify({page:cdp?await cdp.evaluate('document.body.innerText.slice(0,1600)'):null,errors:state.errors,calls:state.calls.map(c=>c.path)}));
  throw error;
 }finally{
  cdp?.ws.close();for(const child of[browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});if(api)await new Promise(resolve=>api.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
