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

const user={id:0,name:'Fixture',login:'fixture',accessSource:'rbac',roleAssignments:[],grants:[{permission:'system.admin',scope:'all'}]};
const state={calls:[],errors:[],confirmations:[],lookupFailed:false,holdLookup:false,releaseLookup:null};
const fields=[
 ['cnpj','CNPJ','text'],['legalName','Razão Social','text'],['tradeName','Nome Comercial','text'],
 ['address','Endereço','text'],['city','Cidade','text'],['state','UF','select'],['email','E-mail','email'],['receiveEmails','Receber e-mails','boolean'],['phone','Telefone','text'],
 ['ti','TI','boolean'],['devops','DevOps','boolean'],['marketing','Marketing','boolean'],
].map(([key,label,type])=>({key,label,type,...(key==='state'?{options:[{value:'AC',label:'AC'},{value:'SP',label:'SP'}]}:{})}));
function fixture(url,method,body){
 const pathname=new URL(url,'http://fixture').pathname;state.calls.push({path:pathname,method,body});
 if(pathname.endsWith('/auth/me'))return user;
 if(pathname.endsWith('/navigation'))return{sections:[]};
 if(pathname.endsWith('/notifications'))return{items:[],unreadCount:0,total:0};
 if(pathname.endsWith('/cnpj-lookup'))return state.lookupFailed?{message:'Consulta indisponível. Preencha manualmente.'}:{cnpj:'12.ABC.345/01DE-35',legalName:'Empresa alfanumérica',tradeName:'Exemplo',address:'Avenida Paulista, 37',city:'São Paulo',state:'SP',email:'',phone:'1133334444'};
 if(pathname.endsWith('/registrations/clients')){
  if(method==='POST')return{id:444,...body};
  return{definition:{key:'clients',title:'Clientes',subtitle:'Cadastro de clientes',singular:'cliente',fields},items:[],canCreate:true,canEdit:true};
 }
 return{};
}
async function main(){
 await fs.access(edge);const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cnpj-browser-'));let api,next,browser,cdp;
 try{
  api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture(req.url,req.method)));});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  const apiPort=api.address().port,webPort=await port(),bin=require.resolve('next/dist/bin/next',{paths:[path.join(root,'apps/web')]});
  next=spawn(process.execPath,[bin,'start','-p',String(webPort)],{cwd:path.join(root,'apps/web'),env:{...process.env,API_INTERNAL_URL:'http://127.0.0.1:'+apiPort+'/api'},windowsHide:true,stdio:'ignore'});
  await until(async()=>{const response=await fetch('http://127.0.0.1:'+webPort+'/cadastros/clientes');return response.status===200;},60000);
  browser=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const debugPort=await until(async()=>Number((await fs.readFile(path.join(temp,'DevToolsActivePort'),'utf8')).split('\n')[0]));
  const targets=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});cdp=new Cdp(socket);
  cdp.events.set('Runtime.exceptionThrown',event=>state.errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  cdp.events.set('Page.javascriptDialogOpening',event=>{state.confirmations.push(event.message);return cdp.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>undefined);});
  cdp.events.set('Fetch.requestPaused',async event=>{
   try{
    if(!event.request.url.includes('/api/')){await cdp.send('Fetch.continueRequest',{requestId:event.requestId});return;}
    const value=fixture(event.request.url,event.request.method,event.request.postData?JSON.parse(event.request.postData):undefined);
    if(state.holdLookup && event.request.url.includes('/cnpj-lookup')) await new Promise(resolve=>{state.releaseLookup=resolve;});
    const origin=Object.entries(event.request.headers).find(([key])=>key.toLowerCase()==='origin')?.[1]||'http://localhost:'+webPort;
    await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:state.lookupFailed&&event.request.url.includes('/cnpj-lookup')?503:event.request.method==='POST'?201:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:String(origin)},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Content-Type,X-Helpdesk-Request'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,DELETE,OPTIONS'}],body:Buffer.from(value===null?'':JSON.stringify(value)).toString('base64')});
   }catch{state.errors.push('Fixture interception failed.');}
  });
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/cadastros/clientes'});
  const wait=async expression=>until(()=>cdp.evaluate(expression));
  const click=async text=>cdp.evaluate(`(()=>{const scope=document.querySelector('dialog[open]')??document;const button=[...scope.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(text)});button.focus();button.click();})()`);
  const setInput=async(selector,value)=>cdp.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);

  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Novo cadastro')");
  await click('Novo cadastro');await wait("Boolean(document.querySelector('#client-cnpj'))");
  const field=(label)=>`[...document.querySelectorAll('form label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(label)})).querySelector('input,select')`;
  const read=label=>cdp.evaluate(`${field(label)}.value`);
  const fill=async(label,value)=>cdp.evaluate(`(()=>{const input=${field(label)};Object.getOwnPropertyDescriptor(input.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
  assert.equal(await cdp.evaluate("document.querySelector('form input').id"),'client-cnpj');
  assert.equal(await cdp.evaluate("document.body.innerText.includes('Letras e números nas 12 primeiras posições')"),false);
  assert.equal(await cdp.evaluate(`${field('Receber e-mails')}.checked`),false);
  await setInput('#client-cnpj','12abc34501de35');
  await wait("document.querySelector('#client-cnpj').value==='12.ABC.345/01DE-35'");
  await fill('E-mail','manual@example.test');await fill('TI','1');await fill('Situação','0');
  await click('Buscar CNPJ');await wait("document.body.innerText.includes('Dados encontrados.')");
  assert.equal(await read('Razão Social'),'Empresa alfanumérica');assert.equal(await read('Nome Comercial'),'Exemplo');
  assert.equal(await read('Endereço'),'Avenida Paulista, 37');assert.equal(await read('Cidade'),'São Paulo');assert.equal(await read('UF'),'SP');
  assert.equal(await read('Telefone'),'1133334444');assert.equal(await read('E-mail'),'manual@example.test');
  assert.equal(await read('TI'),'1');assert.equal(await read('Situação'),'0');
  state.holdLookup=true;await click('Buscar CNPJ');await until(()=>state.releaseLookup);
  await fill('Razão Social','Nome ajustado durante consulta');
  state.holdLookup=false;state.releaseLookup();state.releaseLookup=null;
  await wait("document.body.innerText.includes('Dados encontrados.')");
  assert.equal(await read('Razão Social'),'Nome ajustado durante consulta');
  state.lookupFailed=true;await setInput('#client-cnpj','19131243000197');
  await wait("document.querySelector('#client-cnpj').value==='19.131.243/0001-97'");
  await click('Buscar CNPJ');await wait("document.body.innerText.includes('Consulta indisponível.')");
  assert.equal(await read('Razão Social'),'Nome ajustado durante consulta');assert.equal(await read('E-mail'),'manual@example.test');
  state.lookupFailed=false;await setInput('#client-cnpj','12ABC34501DE35');
  assert.equal(await cdp.evaluate(`${field('Receber e-mails')}.checked`),false);
  await cdp.evaluate(`${field('Receber e-mails')}.click()`);
  await click('Salvar');await wait("document.body.innerText.includes('cliente cadastrado com sucesso.')");
  const saved=state.calls.find(c=>c.method==='POST'&&c.path.endsWith('/registrations/clients'));
  assert.equal(saved.body.values.cnpj,'12.ABC.345/01DE-35');assert.equal(saved.body.values.ti,true);assert.equal(saved.body.status,0);
  assert.equal(saved.body.values.receiveEmails,true);
  assert.deepEqual(state.errors,[]);console.log(JSON.stringify({mask:true,alphanumeric:true,numeric:true,autoFill:true,preserveManualEmail:true,preserveServices:true,providerFailure:true,save:'fixtures only'}));
 }catch(error){
  console.error(JSON.stringify({page:cdp?await cdp.evaluate('document.body.innerText.slice(0,1600)'):null,errors:state.errors,calls:state.calls.map(c=>c.path)}));
  throw error;
 }finally{
  cdp?.ws.close();for(const child of[browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});if(api)await new Promise(resolve=>api.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
