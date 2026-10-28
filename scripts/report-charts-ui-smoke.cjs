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
const state={calls:[],errors:[],confirmations:[],count:12};
function fixture(url,method){
 const pathname=new URL(url,'http://fixture').pathname;
 if(method==='OPTIONS')return{};
 state.calls.push({path:pathname,method});
 if(pathname.endsWith('/auth/me'))return user;
 if(pathname.endsWith('/navigation'))return{sections:[]};
 if(pathname.endsWith('/notifications'))return{items:[],unreadCount:0,total:0};
 if(pathname.endsWith('/catalog'))return{clients:[],locations:[],technicians:[],categories:[]};
 if(pathname.endsWith('/analytics'))return{total:0,rows:[]};
 if(pathname.endsWith('/client-totals')){
 const rows=Array.from({length:state.count},(_,i)=>({clientId:i+1,clientName:'Cliente '+(i+1),level1:12-i,level2:2,level3:1,total:15-i}));
 return{period:{startDate:'2026-10-01',endDate:'2026-10-28'},level:0,total:rows.reduce((sum,r)=>sum+r.total,0),rows};
 }
 return{};
}
async function main(){
 await fs.access(edge);const temp=await fs.mkdtemp(path.join(os.tmpdir(),'report-archive-browser-'));let api,next,browser,cdp;
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


  await cdp.send('Page.bringToFront');
  await wait("document.querySelectorAll('[data-report-chart=bar] button[aria-pressed]').length===12");
  await cdp.evaluate("document.querySelector('[data-report-chart=bar] button[aria-pressed]').click()");
  await wait("document.querySelector('[data-chart-details]').textContent.includes('Cliente 1')");
  await click('Limpar destaque');
  await click('Pizza');await wait("document.querySelectorAll('svg path[role=button]').length===10");
  const legend='[aria-label=\"Legenda interativa\"] button';
  await cdp.evaluate(`document.querySelector(${JSON.stringify(legend)}).focus()`);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r'});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await wait("document.querySelector('svg path[role=button]').getAttribute('aria-pressed')==='true'");
  assert.equal(await cdp.evaluate("document.querySelector('[data-chart-details]').textContent.includes('N\u00edvel 1: 12')"),true);
  const box=await cdp.evaluate(`(()=>{const r=document.querySelectorAll(${JSON.stringify(legend)})[1].getBoundingClientRect();return{x:r.x+30,y:r.y+r.height/2};})()`);
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...box});
  await wait("document.querySelector('[data-chart-details]').textContent.includes('Cliente 2')");
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
  await wait("document.querySelector('[data-chart-details]').textContent.includes('Cliente 1')");
  const chartBox=await cdp.evaluate("(()=>{const r=document.querySelector('[data-report-chart]').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()");
  const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:chartBox});
  await fs.writeFile(path.join(root,'docs/reports/interactive-charts.png'),Buffer.from(screenshot.data,'base64'));
  await cdp.send('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await cdp.evaluate("[...document.querySelectorAll('svg path[role=button]')].every(p=>getComputedStyle(p).opacity==='1'&&getComputedStyle(p).transform==='none')"),true);
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('[data-chart-details]')).display"),'none');
  await cdp.send('Emulation.setEmulatedMedia',{media:''});
  await click('Limpar destaque');await click('Rosca');
  await wait("Boolean(document.querySelector('[data-report-chart=donut] svg text'))");
  await cdp.evaluate("document.querySelector('svg path[role=button]').focus()");
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await wait("document.querySelector('svg path[role=button]').getAttribute('aria-pressed')==='true'");
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await wait("document.querySelector('svg path[role=button]').getAttribute('aria-pressed')==='false'");
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const touch=await cdp.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(legend)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+30,y:r.y+r.height/2};})()`);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait("document.querySelector('svg path[role=button]').getAttribute('aria-pressed')==='true'");
  assert.equal(await cdp.evaluate("document.querySelector('[data-report-chart]').scrollWidth<=window.innerWidth"),true);
  state.count=1;await click('Filtrar');await wait("document.querySelectorAll('svg path[role=button]').length===1");
  assert.equal(await cdp.evaluate("/NaN|Infinity/.test(document.querySelector('svg path[role=button]').getAttribute('d'))"),false);
  state.count=0;await click('Filtrar');await wait("!document.querySelector('[data-report-chart]')");
  assert.deepEqual(state.errors,[]);
  console.log(JSON.stringify({bars:true,pie:true,donut:true,hover:true,pinnedSelection:true,keyboard:true,mobile:true,print:true,others:true,singleSlice:true,empty:true,consoleExceptions:0}));

 }catch(error){
  console.error(JSON.stringify({page:cdp?await cdp.evaluate('document.body.innerText.slice(0,1600)'):null,errors:state.errors,calls:state.calls.map(c=>c.path)}));
  throw error;
 }finally{
  cdp?.ws.close();for(const child of[browser,next])if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});if(api)await new Promise(resolve=>api.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
