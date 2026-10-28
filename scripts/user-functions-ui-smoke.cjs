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
const user={id:0,name:'Administração de teste',login:'fixture',functionId:null,accessSource:'rbac',roleAssignments:[],grants:[{permission:'system.admin',scope:'all'}]};
const state={calls:[],errors:[],confirmations:[],inactiveUsers:[{id:201,functionId:5},{id:202,functionId:5}],roles:[
 {id:1,name:'Suporte técnico',status:1,activeUserCount:2,linkedUserCount:3,permissionIds:[1,2]},
 {id:2,name:'Operações',status:1,activeUserCount:0,linkedUserCount:0,permissionIds:[]},
 {id:3,name:'Projetos',status:2,activeUserCount:1,linkedUserCount:2,permissionIds:[1]},
 {id:4,name:'Financeiro',status:1,activeUserCount:35,linkedUserCount:35,permissionIds:[3]},
 {id:5,name:'Arquivo',status:1,activeUserCount:0,linkedUserCount:2,permissionIds:[]},
 {id:6,name:'Administrador global',status:1,isGlobalAdmin:true,activeUserCount:0,linkedUserCount:0,permissionIds:[]},
],users:[{id:1,name:'Ana Martins',login:'ana.martins',functionId:1},{id:2,name:'João Pereira',login:'joao.pereira',functionId:1},{id:3,name:'Marina Costa',login:'marina.costa',functionId:3},
 ...Array.from({length:35},(_,i)=>({id:10+i,name:'Profissional '+String(i+1).padStart(2,'0'),login:'financeiro.'+(i+1),functionId:4})),
 {id:101,name:'Nina Oliveira',login:'nina',functionId:null},{id:102,name:'Lucas Santos',login:'lucas',functionId:null},{id:103,name:'Pedro Lima',login:'pedro',functionId:null}]};
function fixture(url,method,body){
 const pathname=new URL(url,'http://fixture').pathname;
 state.calls.push({path:pathname,method,body});
 if(pathname.endsWith('/auth/me'))return user;
 if(pathname.endsWith('/notifications'))return {items:[],unreadCount:0,total:0};
 if(pathname.endsWith('/navigation'))return {sections:[]};
 if(pathname.endsWith('/users/catalogs'))return {functions:[{id:6,name:'Administrador global'}],functionPermissionIds:{},companies:[],pixKeyTypes:[],permissions:[]};
 if(pathname.endsWith('/users'))return {data:[{id:99,name:'Fixture account',login:'fixture.account',email:'fixture@example.test',status:1}],meta:{page:1,limit:50,total:1,totalPages:1}};
 if(pathname.endsWith('/users/99'))return {id:99,name:'Fixture account',login:'fixture.account',email:'fixture@example.test',phone:'11999999999',status:1,type:1,function:{id:6,name:'Administrador global'},companies:[],extraPermissionIds:[],link:'',pixKeyType:null,pixKey:'',observation:''};
 if(pathname.endsWith('/user-functions/active-users'))return{users:state.users,activeUserCount:state.users.length,assignedActiveUserCount:state.users.filter(u=>u.functionId!==null).length,unassignedActiveUserCount:state.users.filter(u=>u.functionId===null).length};
 if(pathname.endsWith('/user-functions/permissions'))return[
  {id:1,name:'Visualizar atendimentos',slug:'atendimentos.visualizar',module:'Atendimentos',description:'Consultar os atendimentos disponíveis.'},
  {id:2,name:'Editar atendimentos',slug:'atendimentos.editar',module:'Atendimentos',description:'Atualizar os atendimentos da equipe.'},
  {id:3,name:'Consultar financeiro',slug:'financeiro.acessar',module:'Financeiro',description:'Acessar as informações financeiras.'}];
 if(pathname.endsWith('/user-functions')){
  if(method==='POST'){const role={...body,id:50,activeUserCount:0,linkedUserCount:0};state.roles.push(role);return{id:role.id};}
  return state.roles;
 }
 const match=pathname.match(/\/user-functions\/(\d+)$/);
 if(match){const id=Number(match[1]);if(method==='PATCH'){state.roles=state.roles.map(role=>role.id===id?{...role,...body}:role);return{id};}if(method==='DELETE'){state.inactiveUsers=state.inactiveUsers.map(user=>user.functionId===id?{...user,functionId:null}:user);state.roles=state.roles.filter(role=>role.id!==id);return null;}}
 return {};
}
async function main(){
 await fs.access(edge);const temp=await fs.mkdtemp(path.join(os.tmpdir(),'user-functions-browser-'));let api,next,browser,cdp;
 try{
  api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture(req.url,req.method)));});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  const apiPort=api.address().port,webPort=await port(),bin=require.resolve('next/dist/bin/next',{paths:[path.join(root,'apps/web')]});
  next=spawn(process.execPath,[bin,'start','-p',String(webPort)],{cwd:path.join(root,'apps/web'),env:{...process.env,API_INTERNAL_URL:'http://127.0.0.1:'+apiPort+'/api'},windowsHide:true,stdio:'ignore'});
  await until(async()=>{const response=await fetch('http://127.0.0.1:'+webPort+'/admin/user-functions');return response.status===200;},60000);
  browser=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const debugPort=await until(async()=>Number((await fs.readFile(path.join(temp,'DevToolsActivePort'),'utf8')).split('\n')[0]));
  const targets=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});cdp=new Cdp(socket);
  cdp.events.set('Runtime.exceptionThrown',event=>state.errors.push(event.exceptionDetails.text));
  cdp.events.set('Page.javascriptDialogOpening',event=>{state.confirmations.push(event.message);return cdp.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>undefined);});
  cdp.events.set('Fetch.requestPaused',async event=>{
   try{
    if(!event.request.url.includes('/api/')){await cdp.send('Fetch.continueRequest',{requestId:event.requestId});return;}
    const value=fixture(event.request.url,event.request.method,event.request.postData?JSON.parse(event.request.postData):undefined);
    const origin=Object.entries(event.request.headers).find(([key])=>key.toLowerCase()==='origin')?.[1]||'http://localhost:'+webPort;
    await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:event.request.method==='POST'?201:event.request.method==='DELETE'?204:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:String(origin)},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Content-Type,X-Helpdesk-Request'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,DELETE,OPTIONS'}],body:Buffer.from(value===null?'':JSON.stringify(value)).toString('base64')});
   }catch{state.errors.push('Fixture interception failed.');}
  });
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/admin/user-functions'});
  const wait=async expression=>until(()=>cdp.evaluate(expression));
  const click=async text=>cdp.evaluate(`(()=>{const scope=document.querySelector('dialog[open]')??document;const button=[...scope.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(text)});button.focus();button.click();})()`);
  const setInput=async(selector,value)=>cdp.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const shot=async(filename,viewport=false)=>{await fs.mkdir(path.join(root,'docs/reports'),{recursive:true});const capture=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:!viewport});await fs.writeFile(path.join(root,'docs/reports',filename),Buffer.from(capture.data,'base64'));};
  await wait("document.querySelector('button[aria-label=\"Ver usuários ativos sem função\"]').innerText.includes('3')");
  assert.equal(await cdp.evaluate("document.querySelectorAll('dialog').length"),0);assert.equal(state.calls.filter(c=>['POST','PATCH','DELETE'].includes(c.method)).length,0);
  await shot('user-functions-overview.png');
  await cdp.evaluate("[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.innerText.includes('Suporte técnico')).click()");
  await wait("document.querySelector('section[aria-labelledby=function-details-title]').innerText.includes('Ana Martins')");
  assert.equal(await cdp.evaluate("document.querySelector('section[aria-labelledby=function-details-title]').innerText.includes('João Pereira')"),true);
  await shot('user-functions-members.png');
  await cdp.evaluate("[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.innerText.includes('Financeiro')).click()");await wait("document.body.innerText.includes('página 1 de 2')");await click('Próxima');await wait("document.body.innerText.includes('Profissional 35')");
  await cdp.evaluate("document.querySelector('button[aria-label=\"Ver usuários ativos sem função\"]').click()");await wait("document.querySelector('section[aria-labelledby=function-details-title]').innerText.includes('Nina Oliveira')");
  await setInput('section[aria-labelledby=function-details-title] input','nina');await wait("!document.querySelector('section[aria-labelledby=function-details-title]').innerText.includes('Lucas Santos')");
  await click('+ Nova função');await wait("document.querySelector('dialog')?.open===true");
  assert.equal(await cdp.evaluate("document.activeElement===document.querySelector('dialog input[maxlength=\"50\"]')"),true);await shot('user-functions-editor.png',true);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait("document.querySelectorAll('dialog').length===0");assert.equal(await cdp.evaluate("document.activeElement.textContent.includes('Nova função')"),true);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await cdp.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),true);
  await click('+ Nova função');await wait("document.querySelector('dialog')?.open===true");assert.equal(await cdp.evaluate("document.querySelector('dialog').getBoundingClientRect().width<=window.innerWidth"),true);await click('Cancelar');await wait("!document.querySelector('dialog')");
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await click('+ Nova função');await wait("document.querySelector('dialog')?.open===true");await setInput('dialog input[maxlength="50"]','Auditoria de testes');
  await cdp.evaluate("document.querySelector('dialog details summary').click();document.querySelector('dialog input[type=checkbox]').click()");await click('Criar função');await wait("document.body.innerText.includes('Função criada com sucesso.') && !document.querySelector('dialog')");
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Editar função'&&!b.disabled)");await click('Editar função');await wait("document.querySelector('dialog')?.open===true");await setInput('dialog input[maxlength="50"]','Auditoria revisada');await click('Salvar alterações');await wait("document.body.innerText.includes('Função atualizada com sucesso.') && !document.querySelector('dialog')");
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Editar função'&&!b.disabled)");await click('Editar função');await wait("document.querySelector('dialog')?.open===true");await click('Excluir função');await wait("document.body.innerText.includes('Função excluída.') && !document.querySelector('dialog')");
  await cdp.evaluate("[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.innerText.includes('Projetos')).click()");await click('Editar função');await wait("document.querySelector('dialog')?.open===true");assert.equal(await cdp.evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Excluir função').disabled"),true);await click('Cancelar');
  await cdp.evaluate("[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.innerText.includes('Arquivo')).click()");
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('section[aria-labelledby=function-details-title] button')].find(b=>b.textContent==='Excluir função').disabled"),false);
  await click('Excluir função');await wait("!document.querySelector('section[aria-labelledby=function-details-title]')");
  assert.equal(state.inactiveUsers.length,2);assert.ok(state.inactiveUsers.every(user=>user.functionId===null));assert.ok(state.confirmations.some(text=>text.includes('2 cadastros vinculados')&&text.includes('preservados')));
  await cdp.evaluate("[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.innerText.includes('Administrador global')).click()");
  await wait("document.querySelector('section[aria-labelledby=function-details-title]').innerText.includes('Função protegida')");
  for(const label of ['Editar função','Excluir função']) assert.equal(await cdp.evaluate(`[...document.querySelectorAll('section[aria-labelledby=function-details-title] button')].find(b=>b.textContent===${JSON.stringify(label)}).disabled`),true);
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/users'});
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Novo usuário') && [...document.querySelectorAll('option')].some(o=>o.textContent==='Administrador global')");
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('option')].some(o=>o.textContent==='Administrador global')"),true);
  user.grants=['users.read','users.create','users.edit','users.manage-overrides'].map(permission=>({permission,scope:'all'}));
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/users'});
  await wait("document.querySelector('h2').textContent==='Novo usuário' && [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Fixture account'))");
  assert.equal(await cdp.evaluate("document.body.innerText.includes('Você não tem permissão')"),false);
  await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Fixture account')).click()");
  await wait("document.querySelector('h2').textContent==='Editar usuário #99'");
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Salvar usuário')"),true);
  assert.equal(await cdp.evaluate("document.body.innerText.includes('Você não tem permissão')"),false);
  user.grants=['users.read','users.create'].map(permission=>({permission,scope:'all'}));
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/users'});
  await wait("document.querySelector('h2').textContent==='Novo usuário' && [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Fixture account'))");
  assert.equal(await cdp.evaluate("document.body.innerText.includes('Você não tem permissão')"),false);
  await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Fixture account')).click()");
  await wait("document.body.innerText.includes('Você não tem permissão para editar este usuário.')");
  user.grants=[{permission:'users.read',scope:'all'}];
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/users'});
  await wait("document.body.innerText.includes('Consulta de usuários') && [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Fixture account'))");
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Novo usuário')"),false);
  await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Fixture account')).click()");
  await wait("document.querySelector('h2').textContent==='Consultar usuário #99'");
  assert.equal(await cdp.evaluate("[...document.querySelector('h2').parentElement.querySelectorAll('input,select,textarea')].every(input=>input.disabled)"),true);
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('button')].some(b=>['Salvar usuário','Desativar'].includes(b.textContent))"),false);
  assert.ok(state.calls.some(c=>c.method==='POST'&&c.body?.permissionIds?.includes(1)));assert.ok(state.calls.some(c=>c.method==='PATCH'));assert.ok(state.calls.some(c=>c.method==='DELETE'));assert.deepEqual(state.errors,[]);
  console.log(JSON.stringify({ui:true,defaultFormClosed:true,activeMembers:true,unassigned:true,search:true,pagination:true,keyboardEscapeAndFocus:true,mobile:true,createEditDelete:'fixtures only',consoleExceptions:0}));
 }finally{
  cdp?.ws.close();for(const child of[browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});if(api)await new Promise(resolve=>api.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
