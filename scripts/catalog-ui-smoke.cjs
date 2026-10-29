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


const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4dsAAAAASUVORK5CYII=','base64');
const admin={id:41,name:'Teste de catalogos',login:'fixture',accessSource:'rbac',roleAssignments:[],grants:[{permission:'system.admin',scope:'all'}]};
const state={calls:[],errors:[],confirmations:[],user:admin,failUpload:false,saved:null};
const item={id:1,title:'Catalogo legado',sector:1,clientId:1,clientName:'Cliente de teste',categoryId:1,categoryName:'Categoria de teste',createdAt:'2026-10-01T12:00:00',updatedAt:null};
const detail={...item,authorUserId:41,content:'<h1>Procedimento legado</h1><img alt="Imagem antiga" src="/catalog-images/1">'};
function fixture(url,method,body){
 const u=new URL(url,'http://fixture'),pathname=u.pathname;state.calls.push({path:pathname,method,body});
 if(pathname.endsWith('/auth/me'))return state.user;
 if(pathname.endsWith('/navigation'))return{sections:[]};
 if(pathname.endsWith('/notifications'))return{items:[],unreadCount:0,total:0};
 if(pathname.endsWith('/catalog/filters'))return{allowedSectors:[1,2],clients:[{id:1,name:'Cliente de teste'}],categories:[{id:1,name:'Categoria de teste'}]};
 if(pathname.endsWith('/catalog/images'))return state.failUpload?{message:'Imagem indisponivel para envio.'}:{id:701,contentPath:'catalog/images/701/content',mimeType:'image/webp',width:1,height:1,sizeBytes:64};
 if(pathname.endsWith('/catalog/1')){if(method==='PATCH'){Object.assign(detail,body);state.saved=body;}return detail;}
 if(pathname.endsWith('/catalog'))return{items:[item],offset:0,nextOffset:null,hasMore:false};
 if(pathname.endsWith('/media'))return{items:[],total:0,offset:0,limit:20,canWrite:false};
 return{};
}
async function main(){
 await fs.access(edge);const temp=await fs.mkdtemp(path.join(os.tmpdir(),'catalog-images-browser-'));let api,next,browser,cdp;
 try{
  api=http.createServer((req,res)=>{if(/\/catalog\/images\/\d+\/content/.test(req.url)){res.setHeader('Content-Type','image/png');res.end(png);return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture(req.url,req.method)));});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
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
    const value=fixture(event.request.url,event.request.method,event.request.postData?.startsWith('{')?JSON.parse(event.request.postData):undefined);
    const origin=Object.entries(event.request.headers).find(([key])=>key.toLowerCase()==='origin')?.[1]||'http://localhost:'+webPort;
    await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:event.request.url.endsWith('/catalog/images')&&state.failUpload?404:event.request.method==='POST'?201:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:String(origin)},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Content-Type,X-Helpdesk-Request'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,DELETE,OPTIONS'}],body:Buffer.from(value===null?'':JSON.stringify(value)).toString('base64')});
   }catch(error){state.errors.push(`Fixture interception failed: ${error.message}`);await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:500,body:Buffer.from('{}').toString('base64')}).catch(()=>undefined);}
  });
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/reports/tickets/by-client'});
  const wait=async expression=>until(()=>cdp.evaluate(expression));
  const click=async text=>cdp.evaluate(`(()=>{const scope=document.querySelector('dialog[open]')??document;const button=[...scope.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(text)});button.focus();button.click();})()`);
  const setInput=async(selector,value)=>cdp.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);


  await cdp.send('Page.bringToFront');await cdp.send('Browser.setDownloadBehavior',{behavior:'deny'});
  const choose=async(selector,value)=>cdp.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await cdp.send('Page.navigate',{url:'http://localhost:'+webPort+'/catalog'});
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Catalogo legado' || b.querySelector('span')?.textContent==='Catalogo legado')");
  assert.equal(await cdp.evaluate("document.querySelector('[aria-controls=catalog-list-content]').getAttribute('aria-expanded')"),'true');
  await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.querySelector('span')?.textContent==='Catalogo legado').click()");
  await wait("document.querySelector('iframe')?.contentDocument?.querySelector('img')?.naturalWidth===1");
  assert.equal(await cdp.evaluate("document.querySelector('#catalog-list-content').hidden"),true);
  await click('Editar');await wait("Boolean(document.querySelector('[contenteditable=true]'))");
  await setInput('input[maxlength="255"]','Titulo preservado');
  await cdp.evaluate("document.querySelector('[aria-controls=catalog-list-content]').click()");
  assert.equal(await cdp.evaluate("document.querySelector('#catalog-list-content').hidden"),false);
  await cdp.evaluate("document.querySelector('[aria-controls=catalog-list-content]').click()");
  assert.equal(await cdp.evaluate("document.querySelector('input[maxlength=\"255\"]').value"),'Titulo preservado');
  const image=()=>cdp.evaluate("(async()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;canvas.getContext('2d').fillRect(0,0,1,1);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const transfer=new DataTransfer();transfer.items.add(new File([blob],'fixture.png',{type:'image/png'}));const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await image();
  await wait("document.querySelector('[contenteditable=true]').innerHTML.includes('/catalog-images/701')");
  assert.ok(state.calls.some(c=>c.method==='POST'&&c.path.endsWith('/catalog/images')));
  await wait("!document.body.innerText.includes('Enviando')");
  state.failUpload=true;await image();
  await wait("document.querySelector('[role=alert]')?.textContent.includes('Imagem indisponivel')");
  assert.equal(await cdp.evaluate("document.querySelector('[contenteditable=true]').innerHTML.includes('/catalog-images/701')"),true);
  assert.equal(state.confirmations.length,0,'Upload errors are inline and keep the editor usable');
  state.failUpload=false;await image();await wait("!document.querySelector('[role=alert]') && !document.body.innerText.includes('Enviando')");
  await cdp.evaluate('window.scrollTo(0,0)');
  await cdp.evaluate('new Promise(requestAnimationFrame)');
  await fs.mkdir(path.join(root,'docs/catalog'),{recursive:true});
  await fs.writeFile(path.join(root,'docs/catalog/catalog-desktop.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp.evaluate('window.scrollTo(0,0)');
  await cdp.evaluate('new Promise(requestAnimationFrame)');
  assert.equal(await cdp.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),true);
  await fs.writeFile(path.join(root,'docs/catalog/catalog-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await click('Salvar cat\u00e1logo');await until(()=>Boolean(state.saved));
  assert.ok(state.saved.content.includes('/catalog-images/701'));
  await wait("Boolean(document.querySelector('iframe'))");
  await click('Novo cat\u00e1logo');await wait("Boolean(document.querySelector('input[maxlength=\"255\"]'))");
  assert.equal(await cdp.evaluate("document.querySelector('#catalog-list-content').hidden"),true);
  await setInput('input[maxlength="255"]','Rascunho preservado');
  await cdp.evaluate("document.querySelector('[aria-controls=catalog-list-content]').click()");
  assert.equal(await cdp.evaluate("document.querySelector('input[maxlength=\"255\"]').value"),'Rascunho preservado');
  assert.deepEqual(state.errors,[]);
  console.log(JSON.stringify({legacyImage:true,upload:true,inlineError:true,saveImage:true,collapseOnView:true,collapseOnEdit:true,collapseOnCreate:true,preserveDraft:true,mobile:true,consoleExceptions:0}));

 }catch(error){
  console.error(JSON.stringify({page:cdp?await cdp.evaluate('document.body.innerText.slice(0,1600)'):null,errors:state.errors,calls:state.calls.map(c=>c.path)}));
  throw error;
 }finally{
  cdp?.ws.close();for(const child of[browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});if(api)await new Promise(resolve=>api.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
