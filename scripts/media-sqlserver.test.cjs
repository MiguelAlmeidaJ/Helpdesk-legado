const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {AppPermission,PermissionScope}=require('../packages/contracts/dist');
const {MediaDatabase}=require('../apps/api/dist/modules/media/infrastructure/media-database.service');
const {MediaAccess}=require('../apps/api/dist/modules/media/application/media-access.service');
const {MediaService}=require('../apps/api/dist/modules/media/application/media.service');
const {MediaController}=require('../apps/api/dist/modules/media/presentation/media.controller');
const {LegacySessionGuard}=require('../apps/api/dist/modules/access/presentation/http/legacy-session.guard');
const common=require('../apps/api/node_modules/@nestjs/common');
const {NestFactory}=require('../apps/api/node_modules/@nestjs/core');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const admin={id:0,grants:[{permission:AppPermission.SystemAdmin,scope:PermissionScope.All}],roleAssignments:[]};
const STOP=new Error('ROLLBACK_SYNTHETIC_FIXTURES');

test('SQL Server + Nest HTTP: private upload/list/download/link/integrity/soft-delete, with fixture rollback',{skip:!process.env.MEDIA_SQLSERVER_PASSWORD,timeout:120000},async()=>{
  const metadata=new MediaDatabase(),root=await fs.mkdtemp(path.join(os.tmpdir(),'helpdesk-media-sql-'));
  const oldRoot=process.env.MEDIA_LOCAL_ROOT;process.env.MEDIA_LOCAL_ROOT=root;
  let app;
  const before=await metadata.client.$queryRawUnsafe('SELECT COUNT_BIG(*) AS count FROM dbo.media_objects');
  try{
    await assert.rejects(metadata.client.$transaction(async tx=>{
      const sql={...tx,$queryRawUnsafe:tx.$queryRawUnsafe.bind(tx),$executeRawUnsafe:tx.$executeRawUnsafe.bind(tx),$transaction:async callback=>callback(tx)};
      const database={client:sql,enabled:true};
      const access=new MediaAccess({},{});
      const service=new MediaService(database,access);
      class FixtureModule{}
      class FixtureGuard{canActivate(context){const req=context.switchToHttp().getRequest();if(req.headers['x-fixture-auth']!=='local-test')throw new common.UnauthorizedException();req.user=req.headers['x-fixture-role']==='outsider'?{id:99,grants:[],roleAssignments:[]}:admin;return true;}}
      // Only this isolated test module replaces authentication; deployed controller retains LegacySessionGuard.
      Reflect.defineMetadata('__guards__',[FixtureGuard],MediaController);
      common.Module({controllers:[MediaController],providers:[FixtureGuard,{provide:MediaService,useValue:service}]})(FixtureModule);
      app=await NestFactory.create(FixtureModule,{logger:false,abortOnError:false});app.setGlobalPrefix('api');await app.listen(0,'127.0.0.1');
      const address=app.getHttpServer().address(),base='http://127.0.0.1:'+address.port+'/api/media';
      const headers={'x-fixture-auth':'local-test'};
      assert.equal((await fetch(base)).status,401);
      const settings=await fetch(base+'/settings',{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({defaultProvider:'local'})});assert.equal(settings.status,200);
      const form=new FormData();form.set('contextType','system');form.set('contextId','global');form.set('file',new Blob([png],{type:'image/png'}),'fixture.png');
      const response=await fetch(base,{method:'POST',headers,body:form});const item=await response.json();assert.equal(response.status,201,JSON.stringify(item));assert.equal(item.status,'active');assert.equal(item.provider_key,undefined);assert.equal(item.metadata_json,undefined);
      const list=await fetch(base+'?contextType=system&contextId=global',{headers});assert.equal(list.status,200);assert.ok((await list.json()).items.some(row=>row.id===item.id));
      const get=await fetch(base+'/'+item.id+'/content',{headers});assert.equal(get.status,200);assert.match(get.headers.get('cache-control'),/no-store/);assert.equal(get.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await get.arrayBuffer()),png);
      const denied=await fetch(base+'/'+item.id+'/content',{headers:{...headers,'x-fixture-role':'outsider'}});assert.ok([403,404].includes(denied.status));
      const verify=await fetch(base+'/'+item.id+'/verify',{method:'POST',headers});assert.equal((await verify.json()).valid,true);
      const associate=await fetch(base+'/'+item.id+'/links',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({contextType:'system',contextId:'global'})});assert.equal(associate.status,201);
      const [stored]=await tx.$queryRawUnsafe('SELECT provider_key,sha256,status FROM dbo.media_objects WHERE id=@P1',item.id);
      await fs.appendFile(path.join(root,stored.provider_key),'tampered');
      assert.equal((await fetch(base+'/'+item.id+'/content',{headers})).status,409);
      const failed=await fetch(base+'/'+item.id+'/verify',{method:'POST',headers});assert.equal((await failed.json()).valid,false);
      const [unchanged]=await tx.$queryRawUnsafe('SELECT sha256,status FROM dbo.media_objects WHERE id=@P1',item.id);assert.equal(unchanged.sha256,stored.sha256);assert.equal(unchanged.status,stored.status);
      const del=await fetch(base+'/'+item.id,{method:'DELETE',headers});assert.equal(del.status,204);assert.equal((await fetch(base+'/'+item.id+'/content',{headers})).status,404);await fs.access(path.join(root,stored.provider_key));
      const fakeForm=new FormData();fakeForm.set('contextType','system');fakeForm.set('contextId','global');fakeForm.set('file',new Blob([png],{type:'image/jpeg'}),'false.jpg');assert.equal((await fetch(base,{method:'POST',headers,body:fakeForm})).status,400);
      const [audit]=await tx.$queryRawUnsafe('SELECT COUNT(*) AS count FROM dbo.media_audit WHERE media_id=@P1',item.id);assert.ok(audit.count>=5);
      const originalFetch=global.fetch;
      const keys=['MEDIA_NEXTCLOUD_WEBDAV_URL','MEDIA_NEXTCLOUD_USER','MEDIA_NEXTCLOUD_APP_PASSWORD'];
      const previous=keys.map(key=>process.env[key]);
      [process.env.MEDIA_NEXTCLOUD_WEBDAV_URL,process.env.MEDIA_NEXTCLOUD_USER,process.env.MEDIA_NEXTCLOUD_APP_PASSWORD]=['https://fixture.invalid/dav/helpdesk','fixture','fixture-secret'];
      global.fetch=async(url,init)=>new Response(null,{status:init.method==='MKCOL'||init.method==='PUT'?201:503});
      try{await assert.rejects(service.upload(admin,{type:'system',id:'global'},{data:png,originalName:'failed-fixture.png',mimeType:'image/png',provider:'nextcloud'}));}
      finally{global.fetch=originalFetch;keys.forEach((key,index)=>{if(previous[index]===undefined)delete process.env[key];else process.env[key]=previous[index];});}
      const [failedUpload]=await tx.$queryRawUnsafe("SELECT id,status FROM dbo.media_objects WHERE original_name='failed-fixture.png'");assert.equal(failedUpload.status,'quarantined');
      const [failedLinks]=await tx.$queryRawUnsafe('SELECT COUNT(*) AS count FROM dbo.media_links WHERE media_id=@P1',failedUpload.id);assert.equal(failedLinks.count,0);
      await app.close();app=null;
      throw STOP;
    },{timeout:90000,maxWait:15000}),error=>error===STOP);
    const after=await metadata.client.$queryRawUnsafe('SELECT COUNT_BIG(*) AS count FROM dbo.media_objects');assert.equal(String(before[0].count),String(after[0].count));
  }finally{
    await app?.close();await metadata.onModuleDestroy();
    if(oldRoot===undefined)delete process.env.MEDIA_LOCAL_ROOT;else process.env.MEDIA_LOCAL_ROOT=oldRoot;
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});
  }
});
