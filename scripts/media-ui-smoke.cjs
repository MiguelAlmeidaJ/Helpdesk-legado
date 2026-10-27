// Browser/UI fixture test. All /api requests are intercepted; no production API or business data is used.
const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const http=require('node:http');const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const edge=process.env.MEDIA_TEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const user={id:0,name:'Teste da Central de Mídias',login:'media-fixture',functionId:null,accessSource:'rbac',roleAssignments:[],grants:[{permission:'system.admin',scope:'all'}]};
const state={items:[],provider:'local',calls:[],errors:[]};
const syncRun={id:'00000000-0000-4000-8000-000000000021',origin:'ui-fixture',dump:'dump-ui',status:'compared',createdAt:new Date().toISOString(),manifestHash:'a'.repeat(64),approvedBy:null,checkpoint:0,total:1};
let compared=false;
function syncReport(){return{run:{...syncRun},summary:[{action:'new',state:'pending',count:1,bytes:68,saved:0}],items:[{sequence:1,key:'catalog_images:1',sourceType:'catalog_images',sourceId:'1',context:{type:'catalog',id:'1'},action:'new',state:'pending',error:null,mediaId:null}],hasMore:false};}
function fixture(url,method){
  const pathname=new URL(url,'http://fixture').pathname;
  state.calls.push({path:pathname,method});
  if(pathname.endsWith('/auth/me'))return user;
  if(pathname.endsWith('/notifications'))return{items:[],unreadCount:0,total:0};
  if(pathname.endsWith('/navigation'))return{sections:[]};
  if(pathname.endsWith('/media/sync/compare')){compared=true;return syncReport();}
  if(pathname.endsWith('/media/sync'))return compared?[{...syncRun}]:[];
  if(pathname.endsWith('/approve')){syncRun.status='approved';syncRun.approvedBy=0;return syncReport();}
  if(pathname.endsWith('/retry'))return null;
  if(pathname.endsWith('/cancel')){syncRun.status='cancelled';return null;}
  if(pathname.includes('/media/sync/'))return syncReport();
  if(pathname.endsWith('/media/status'))return{enabled:true,available:true,defaultProvider:state.provider,maxUploadBytes:26214400,providers:['local','nextcloud','cloudinary'].map(name=>({name,configured:true})),usage:state.items.length?[{provider:'local',status:'active',count:1,bytes:68}]:[],recentAudit:[]};
  if(pathname.endsWith('/media/settings')){state.provider='nextcloud';return{defaultProvider:state.provider};}
  if(pathname.endsWith('/verify'))return{valid:true,checkedAt:new Date().toISOString()};
  if(method==='DELETE'){state.items=[];return null;}
  if(method==='POST'&&pathname.endsWith('/media')){const item={id:'00000000-0000-4000-8000-000000000001',provider:'local',originalName:'media-ui-fixture.png',mimeType:'image/png',sizeBytes:68,sha256:'0'.repeat(64),status:'active',createdAt:new Date().toISOString(),links:[{type:'system',id:'global'}]};state.items=[item];return item;}
  if(pathname.endsWith('/media'))return{items:state.items,offset:0,limit:20,hasMore:false,canWrite:true};
  return{};
}
async function port(){const server=http.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const value=server.address().port;await new Promise(resolve=>server.close(resolve));return value;}
async function until(check,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){try{const value=await check();if(value)return value;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out waiting for browser fixture.');}
class Cdp{
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.events=new Map();ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.id){const pending=this.pending.get(message.id);this.pending.delete(message.id);message.error?pending?.reject(new Error(message.error.message)):pending?.resolve(message.result);}else this.events.get(message.method)?.(message.params);});}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  async evaluate(expression){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result?.value;}
}
async function main(){
  await fs.access(edge);
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'helpdesk-media-browser-'));let api,next,browser,cdp;
  try{
    api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture(req.url,req.method)));});
    await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));const apiPort=api.address().port,webPort=await port();
    const bin=require.resolve('next/dist/bin/next',{paths:[path.join(root,'apps/web')]});
    next=spawn(process.execPath,[bin,'start','-p',String(webPort)],{cwd:path.join(root,'apps/web'),env:{...process.env,API_INTERNAL_URL:'http://127.0.0.1:'+apiPort+'/api'},windowsHide:true,stdio:['ignore','pipe','pipe']});
    let serverLog='';next.stdout.on('data',data=>{serverLog+=data;});next.stderr.on('data',data=>{serverLog+=data;});
    await until(async()=>{const response=await fetch('http://127.0.0.1:'+webPort+'/admin/media');return response.status===200;},60000);
    browser=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{windowsHide:true,stdio:'ignore'});
    const debugPort=await until(async()=>Number((await fs.readFile(path.join(temp,'DevToolsActivePort'),'utf8')).split('\n')[0]));
    const targets=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();const target=targets.find(item=>item.type==='page');
    const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});cdp=new Cdp(socket);
    cdp.events.set('Runtime.exceptionThrown',event=>state.errors.push(event.exceptionDetails.text));
    cdp.events.set('Page.javascriptDialogOpening',()=>cdp.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>undefined));
    cdp.events.set('Fetch.requestPaused',async event=>{
      try{
        if(!event.request.url.includes('/api/')){await cdp.send('Fetch.continueRequest',{requestId:event.requestId});return;}
        const value=fixture(event.request.url,event.request.method),origin='http://localhost:'+webPort;
        const requestOrigin=Object.entries(event.request.headers).find(([key])=>key.toLowerCase()==='origin')?.[1] || origin;
        await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:event.request.method==='POST'?201:event.request.method==='DELETE'?204:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:String(requestOrigin)},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Content-Type,X-Helpdesk-Request'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,DELETE,OPTIONS'}],body:Buffer.from(value===null?'':JSON.stringify(value)).toString('base64')});
      }catch{state.errors.push('API fixture interception failed.');}
    });
    await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
    await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/admin/media'});
    await until(()=>cdp.evaluate("document.body.innerText.includes('Migração e Sincronização') && document.querySelectorAll('input[type=file]').length===2"));
    const manifest=path.join(temp,'manifest.json');await fs.writeFile(manifest,JSON.stringify({schema:1,origin:'ui-fixture',dump:'dump-ui',entries:[]}));
    const manifestDocument=await cdp.send('DOM.getDocument');const manifestInput=await cdp.send('DOM.querySelector',{nodeId:manifestDocument.root.nodeId,selector:'input[name=manifest]'});await cdp.send('DOM.setFileInputFiles',{nodeId:manifestInput.nodeId,files:[manifest]});
    await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Comparar sem transferir arquivos').click()");
    await until(()=>cdp.evaluate("document.body.innerText.includes('Relatório · dump-ui')"));
    assert.equal(await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Aprovar aplicação pelo operador').disabled"),true);
    await cdp.evaluate(`(()=>{const inputs=document.querySelectorAll('section[aria-labelledby=media-sync-title] input:not([type=file])');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;[${JSON.stringify(syncRun.id)},${JSON.stringify('APROVAR '+syncRun.id)}].forEach((value,i)=>{setter.call(inputs[i],value);inputs[i].dispatchEvent(new Event('input',{bubbles:true}));});})()`);
    await until(()=>cdp.evaluate("![...document.querySelectorAll('button')].find(b=>b.textContent==='Aprovar aplicação pelo operador').disabled"));
    await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Aprovar aplicação pelo operador').click()");
    await until(()=>cdp.evaluate("document.body.innerText.includes('Relatório · dump-ui · Aprovada')"));
    const image=path.join(temp,'media-ui-fixture.png');await fs.writeFile(image,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
    const document=await cdp.send('DOM.getDocument');const input=await cdp.send('DOM.querySelector',{nodeId:document.root.nodeId,selector:'input[type=file]:not([name=manifest])'});await cdp.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[image]});
    await until(()=>cdp.evaluate("[...document.querySelectorAll('button')].some(button=>button.textContent==='Enviar mídia'&&!button.disabled)"));
    await cdp.evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Enviar mídia').click()");
    await until(()=>cdp.evaluate("document.body.innerText.includes('media-ui-fixture.png')"));
    await until(()=>cdp.evaluate("[...document.querySelectorAll('li strong')].filter(item=>item.textContent==='media-ui-fixture.png').length===2"));
    await cdp.evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Verificar integridade').click()");
    await until(()=>cdp.evaluate("document.body.innerText.includes('Integridade SHA-256 confirmada.')"));
    await fs.mkdir(path.join(root,'docs/reports'),{recursive:true});const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(path.join(root,'docs/reports/media-sync-ui.png'),Buffer.from(screenshot.data,'base64'));
    await cdp.evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Excluir logicamente').click()");
    await until(()=>cdp.evaluate("!document.body.innerText.includes('media-ui-fixture.png')"));
    assert.ok(state.calls.some(call=>call.method==='POST'&&call.path.endsWith('/media')));assert.ok(state.calls.some(call=>call.method==='DELETE'));assert.deepEqual(state.errors,[]);
    assert.ok(state.calls.some(call=>call.path.endsWith('/compare')));assert.ok(state.calls.some(call=>call.path.endsWith('/approve')));
    console.log(JSON.stringify({ui:true,comparison:true,approvalConfirmation:true,upload:true,integrity:true,softDelete:true,consoleExceptions:state.errors.length,apiMode:'isolated fixtures; no real media changes',screenshot:'docs/reports/media-sync-ui.png'}));
  }finally{
    cdp?.ws.close();
    for(const child of [browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
    if(api)await new Promise(resolve=>api.close(resolve));
    assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
