const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {AppPermission,PermissionScope}=require('../packages/contracts/dist');
const {createNivel3Client}=require('../packages/database/dist');
const {UsersController}=require('../apps/api/dist/modules/users/presentation/http/users.controller');
const {UsersRepository}=require('../apps/api/dist/modules/users/infrastructure/users.repository');
const {UserManagement}=require('../apps/api/dist/modules/users/application/user-management');
const {PermissionsGuard}=require('../apps/api/dist/modules/access/presentation/http/permissions.guard');
const common=require('../apps/api/node_modules/@nestjs/common'),{NestFactory}=require('../apps/api/node_modules/@nestjs/core');

test('HTTP: delegated write permissions allow user management; readers are forbidden',async()=>{
 const calls=[];
 class FixtureGuard{canActivate(context){const request=context.switchToHttp().getRequest();const role=request.headers['x-fixture-role'];if(!role)throw new common.UnauthorizedException();request.user={id:10,grants:(role==='global'?[AppPermission.SystemAdmin]:role==='reader'?[AppPermission.UsersRead]:[AppPermission.UsersRead,AppPermission.UsersCreate,AppPermission.UsersEdit,AppPermission.UsersManageOverrides]).map(permission=>({permission,scope:PermissionScope.All}))};return true;}}
 class FixtureModule{}
 const original=Reflect.getMetadata('__guards__',UsersController);
 Reflect.defineMetadata('__guards__',[FixtureGuard,PermissionsGuard],UsersController);
 common.Module({controllers:[UsersController],providers:[FixtureGuard,PermissionsGuard,{provide:UserManagement,useValue:{list:async()=>({data:[]}),create:async()=>{calls.push('create');return{id:20};},update:async()=>{calls.push('update');return{id:20};},deactivate:async()=>{calls.push('delete');}}}]})(FixtureModule);
 const app=await NestFactory.create(FixtureModule,{logger:false,abortOnError:false});
 try{
  await app.listen(0,'127.0.0.1');const url='http://127.0.0.1:'+app.getHttpServer().address().port+'/users';
  const body={name:'Fixture',email:'fixture@example.test',phone:'11999999999',functionId:1,login:'fixture',password:'LongFixture!12345',type:1,status:1};
  for(const role of [undefined,'reader','delegated','global']){
   for(const [method,route] of [['POST',''],['PATCH','/20'],['DELETE','/20']]){
    const response=await fetch(url+route,{method,headers:{'content-type':'application/json',...(role?{'x-fixture-role':role}:{})},...(method==='DELETE'?{}:{body:JSON.stringify(body)})});
    assert.equal(response.status,['global','delegated'].includes(role)?(method==='POST'?201:method==='DELETE'?204:200):role?403:401);
   }
  }
  assert.deepEqual(calls,['create','update','delete','create','update','delete']);
  assert.equal((await fetch(url,{headers:{'x-fixture-role':'delegated'}})).status,200);
 }finally{await app.close();Reflect.defineMetadata('__guards__',original,UsersController);}
});

test('SQL Server: global assignment, demotion, last administrator and failure rollback use only temporary fixtures',{timeout:60000},async()=>{
 const db=createNivel3Client(),rollback=new Error('ROLLBACK_GLOBAL_FIXTURES');
 const suffix=require('node:crypto').randomUUID().replaceAll('-','');
 const names={usuarios:'##ga_users_'+suffix,cargos_n3:'##ga_functions_'+suffix,permissions:'##ga_permissions_'+suffix,role_permissions:'##ga_role_permissions_'+suffix,user_permissions:'##ga_user_permissions_'+suffix,roles:'##ga_roles_'+suffix,user_roles:'##ga_links_'+suffix,clientes_usuarios:'##ga_companies_'+suffix};
 const map=query=>{let result=query;for(const [name,target] of Object.entries(names))result=result.replace(new RegExp('\\b(?:dbo\\.)?'+name+'\\b','g'),target);if(/\bdbo\./i.test(result))throw Error('Non-fixture schema rejected');return result;};
 try{await assert.rejects(db.$transaction(async driver=>{
  const tx={$queryRawUnsafe:(q,...v)=>driver.$queryRawUnsafe(map(q),...v),$executeRawUnsafe:(q,...v)=>driver.$executeRawUnsafe(map(q),...v)};
  await tx.$executeRawUnsafe('CREATE TABLE dbo.cargos_n3(cargo_id int PRIMARY KEY,cargo_sts int,is_global_admin bit);');
  await tx.$executeRawUnsafe('CREATE TABLE dbo.roles(id int PRIMARY KEY,slug nvarchar(100));');
  await tx.$executeRawUnsafe('CREATE TABLE dbo.permissions(id int PRIMARY KEY,slug nvarchar(100));');
  await tx.$executeRawUnsafe('CREATE TABLE dbo.role_permissions(role_id int,permission_id int);');
  await tx.$executeRawUnsafe('CREATE TABLE dbo.user_permissions(user_id int,permission_id int,effect nvarchar(10));');
  await tx.$executeRawUnsafe('CREATE TABLE dbo.user_roles(user_id int,role_id int,assigned_by int,PRIMARY KEY(user_id,role_id));');
  await tx.$executeRawUnsafe('CREATE TABLE dbo.clientes_usuarios(cliente_id int,usuario_id int);');
  await tx.$executeRawUnsafe(`CREATE TABLE dbo.usuarios(user_id int IDENTITY(10,1) PRIMARY KEY,user_sts int,user_nome nvarchar(60),user_mail nvarchar(60),user_cel nvarchar(20),user_funcao int,user_login nvarchar(15),user_pass nvarchar(100),tipo_usuario int,link nvarchar(50),pix_type int,chavepix nvarchar(255),user_observacao nvarchar(2000));`);
  await tx.$executeRawUnsafe('INSERT INTO dbo.cargos_n3 VALUES(1,1,0),(2,1,1);');
  await tx.$executeRawUnsafe("INSERT INTO dbo.roles VALUES(1,'system-admin'),(2,'function-1');");
  await tx.$executeRawUnsafe("INSERT INTO dbo.permissions VALUES(1,'usuarios.criar');");
  await tx.$executeRawUnsafe('INSERT INTO dbo.role_permissions VALUES(2,1);');
  await tx.$executeRawUnsafe('INSERT INTO dbo.usuarios(user_sts,user_funcao) VALUES(1,2),(1,2),(1,1);');
  await tx.$executeRawUnsafe('INSERT INTO dbo.user_roles VALUES(10,1,10),(11,1,10);');
  let fail=false;
  const database={...tx,$executeRawUnsafe:(q,...v)=>{if(fail&&q.startsWith('INSERT INTO dbo.user_roles'))throw Error('Synthetic assignment failure');return tx.$executeRawUnsafe(q,...v);},async $transaction(work){await tx.$executeRawUnsafe('SAVE TRANSACTION ga_save');try{return await work(database);}catch(error){await tx.$executeRawUnsafe('ROLLBACK TRANSACTION ga_save');throw error;}}};
  const users=new UsersRepository(database);
  const input={name:'Fixture',email:'fixture@example.test',phone:'11999999999',functionId:2,login:'fixture',type:1,status:1};
  // Merely naming a function or holding a stale API grant cannot elevate a non-admin actor.
  await assert.rejects(users.create(input,'fixture-hash',12,false),e=>e.getStatus()===403);
  const delegated=await users.create({...input,functionId:1},'fixture-hash',12,false);
  assert.equal(await users.update(delegated,{...input,functionId:1,name:'Delegated edit'},false,12),true);
  await assert.rejects(users.update(10,{...input,functionId:1},false,12),e=>e.getStatus()===403);
  await assert.rejects(users.deactivate(10,12),e=>e.getStatus()===403);
  await tx.$executeRawUnsafe("INSERT INTO dbo.user_permissions VALUES(12,1,'deny');");
  await assert.rejects(users.create({...input,functionId:1},'fixture-hash',12,false),e=>e.getStatus()===403);
  await tx.$executeRawUnsafe('DELETE FROM dbo.user_permissions WHERE user_id=12;');
  const created=await users.create(input,'fixture-hash',10,false);
  assert.equal((await tx.$queryRawUnsafe('SELECT * FROM dbo.user_roles WHERE user_id=@P1',created)).length,1);
  await users.update(created,{...input,functionId:1},false,10);
  assert.equal((await tx.$queryRawUnsafe('SELECT * FROM dbo.user_roles WHERE user_id=@P1',created)).length,0);
  await users.update(11,{...input,functionId:1},false,10);
  await assert.rejects(users.create(input,'fixture-hash',11,false),e=>e.getStatus()===403);
  await assert.rejects(users.update(10,{...input,functionId:1},false,10),e=>e.getStatus()===409);
  await assert.rejects(users.deactivate(10,10),e=>e.getStatus()===409);
  assert.equal((await tx.$queryRawUnsafe('SELECT user_funcao FROM dbo.usuarios WHERE user_id=10'))[0].user_funcao,2);
  const before=await tx.$queryRawUnsafe('SELECT COUNT(*) AS total FROM dbo.usuarios');
  fail=true;await assert.rejects(users.create(input,'fixture-hash',10,false),/Synthetic/);fail=false;
  assert.deepEqual(await tx.$queryRawUnsafe('SELECT COUNT(*) AS total FROM dbo.usuarios'),before);
  throw rollback;
 },{timeout:45000}),e=>e===rollback);}finally{await db.$disconnect();}
});

test('SQL Server: simultaneous administrator removals preserve an active administrator',{timeout:60000},async()=>{
 const db=createNivel3Client(),suffix=require('node:crypto').randomUUID().replaceAll('-','');
 const names={usuarios:'##ga_concurrent_users_'+suffix,cargos_n3:'##ga_concurrent_functions_'+suffix,permissions:'##ga_concurrent_permissions_'+suffix,role_permissions:'##ga_concurrent_rolepermissions_'+suffix,user_permissions:'##ga_concurrent_userpermissions_'+suffix,roles:'##ga_concurrent_roles_'+suffix,user_roles:'##ga_concurrent_links_'+suffix};
 const map=query=>{let result=query;for(const [name,target] of Object.entries(names))result=result.replace(new RegExp('\\b(?:dbo\\.)?'+name+'\\b','g'),target);if(/\bdbo\./i.test(result))throw Error('Non-fixture schema rejected');return result;};
 try{
  await db.$executeRawUnsafe(map('CREATE TABLE dbo.cargos_n3(cargo_id int PRIMARY KEY,cargo_sts int,is_global_admin bit);'));
  await db.$executeRawUnsafe(map('CREATE TABLE dbo.roles(id int PRIMARY KEY,slug nvarchar(100));'));
  await db.$executeRawUnsafe(map('CREATE TABLE dbo.permissions(id int PRIMARY KEY,slug nvarchar(100));'));
  await db.$executeRawUnsafe(map('CREATE TABLE dbo.role_permissions(role_id int,permission_id int);'));
  await db.$executeRawUnsafe(map('CREATE TABLE dbo.user_permissions(user_id int,permission_id int,effect nvarchar(10));'));
  await db.$executeRawUnsafe(map('CREATE TABLE dbo.user_roles(user_id int,role_id int);'));
  await db.$executeRawUnsafe(map('CREATE TABLE dbo.usuarios(user_id int PRIMARY KEY,user_sts int,user_funcao int);'));
  await db.$executeRawUnsafe(map('INSERT INTO dbo.cargos_n3 VALUES(1,1,1);'));
  await db.$executeRawUnsafe(map("INSERT INTO dbo.roles VALUES(1,'system-admin');"));
  await db.$executeRawUnsafe(map('INSERT INTO dbo.usuarios VALUES(10,1,1),(11,1,1);'));
  await db.$executeRawUnsafe(map('INSERT INTO dbo.user_roles VALUES(10,1),(11,1);'));
  const repository=new UsersRepository({$transaction:work=>db.$transaction(driver=>work({
   $queryRawUnsafe:(q,...v)=>driver.$queryRawUnsafe(map(q),...v),
   $executeRawUnsafe:(q,...v)=>driver.$executeRawUnsafe(map(q),...v),
  }),{timeout:30000})});
  const results=await Promise.allSettled([repository.deactivate(10,10),repository.deactivate(11,11)]);
  assert.equal(results.filter(result=>result.status==='fulfilled'&&result.value).length,1);
  assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.getStatus?.()===409).length,1);
  assert.equal((await db.$queryRawUnsafe(map('SELECT COUNT(*) AS total FROM dbo.usuarios WHERE user_sts=1')))[0].total,1);
 }finally{
  for(const name of Object.values(names).reverse()){
   assert.match(name,/^##ga_concurrent_[a-z]+_[a-f0-9]{32}$/);
   await db.$executeRawUnsafe(`DROP TABLE IF EXISTS ${name}`);
  }
  await db.$disconnect();
 }
});
