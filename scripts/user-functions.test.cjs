const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');
const {UserFunctionsRepository}=require('../apps/api/dist/modules/users/infrastructure/user-functions.repository');
const {UsersRepository}=require('../apps/api/dist/modules/users/infrastructure/users.repository');
const {UserFunctionManagement}=require('../apps/api/dist/modules/users/application/user-function-management');
const {UserFunctionsController}=require('../apps/api/dist/modules/users/presentation/http/user-functions.controller');
const {PermissionsGuard}=require('../apps/api/dist/modules/access/presentation/http/permissions.guard');
const {AppPermission,PermissionScope}=require('../packages/contracts/dist');
const common=require('../apps/api/node_modules/@nestjs/common'),{NestFactory}=require('../apps/api/node_modules/@nestjs/core');

// CTE fixtures exercise real SQL Server LEFT JOIN/null/status semantics without writing any tables.
const FIXTURES=`WITH fixture_functions AS (
 SELECT cargo_id,cargo_nome,cargo_sts FROM (VALUES(0,N'Invalid zero role',1),(1,N'Support',1),(2,N'Inactive role',2)) AS f(cargo_id,cargo_nome,cargo_sts)
), fixture_users AS (
 SELECT user_id,user_nome,user_login,user_sts,user_funcao FROM (VALUES
 (1,N'Ana',N'ana',1,1),(2,N'Bruno',N'bruno',2,1),
 (3,N'Carla',N'carla',1,NULL),(4,N'Daniel',N'daniel',1,0),
 (5,N'Elisa',N'elisa',1,999),(6,N'Fabio',N'fabio',1,2),
 (7,N'Inactive missing',N'inactive',2,NULL),(8,N'Unknown status',N'unknown',NULL,NULL)
 ) AS u(user_id,user_nome,user_login,user_sts,user_funcao)
)
`;
test('SQL Server: active memberships include inactive roles; null, zero and dangling IDs are unassigned',{timeout:60000},async()=>{
 const sql=createNivel3Client();
 try{
  const repository=new UserFunctionsRepository({$queryRawUnsafe:(query,...values)=>sql.$queryRawUnsafe(FIXTURES+query.replaceAll('dbo.usuarios','fixture_users').replaceAll('dbo.cargos_n3','fixture_functions'),...values)});
  const result=await repository.activeUsers();
  assert.equal(result.activeUserCount,5);assert.equal(result.assignedActiveUserCount,2);assert.equal(result.unassignedActiveUserCount,3);
  assert.deepEqual(result.users.map(u=>u.id),[1,3,4,5,6]);
  assert.equal(result.users.find(u=>u.id===6).functionId,2);
  assert.deepEqual(result.users.filter(u=>u.functionId===null).map(u=>u.id),[3,4,5]);
  assert.ok(result.users.every(u=>Object.keys(u).sort().join(',')==='functionId,id,login,name'));
 }finally{await sql.$disconnect();}
});
test('HTTP: active-user identities require an authenticated system administrator',{timeout:30000},async()=>{
 const expected={users:[{id:1,name:'Fixture user',login:'fixture',functionId:null}],activeUserCount:1,assignedActiveUserCount:0,unassignedActiveUserCount:1};
 class FixtureGuard{canActivate(context){const request=context.switchToHttp().getRequest();if(!request.headers['x-fixture-role'])throw new common.UnauthorizedException();request.user={id:0,grants:request.headers['x-fixture-role']==='admin'?[{permission:AppPermission.SystemAdmin,scope:PermissionScope.All}]:[]};return true;}}
 class FixtureModule{}
 const original=Reflect.getMetadata('__guards__',UserFunctionsController);
 Reflect.defineMetadata('__guards__',[FixtureGuard,PermissionsGuard],UserFunctionsController);
 const service=new UserFunctionManagement({activeUsers:async()=>expected});
 common.Module({controllers:[UserFunctionsController],providers:[FixtureGuard,PermissionsGuard,{provide:UserFunctionManagement,useValue:service}]})(FixtureModule);
 const app=await NestFactory.create(FixtureModule,{logger:false,abortOnError:false});
 try{
  app.setGlobalPrefix('api');await app.listen(0,'127.0.0.1');const url='http://127.0.0.1:'+app.getHttpServer().address().port+'/api/user-functions/active-users';
  assert.equal((await fetch(url)).status,401);
  assert.equal((await fetch(url,{headers:{'x-fixture-role':'reader'}})).status,403);
  const response=await fetch(url,{headers:{'x-fixture-role':'admin'}});assert.equal(response.status,200);assert.deepEqual(await response.json(),expected);assert.equal(response.headers.get('cache-control'),'private, no-store');
 }finally{await app.close();Reflect.defineMetadata('__guards__',original,UserFunctionsController);}
});
test('SQL Server: deletion blocks active users, detaches inactive accounts and rolls back on failure',{timeout:60000},async()=>{
 const sql=createNivel3Client(),rollback=new Error('ROLLBACK_TEMPORARY_FIXTURES');
 const suffix=require('node:crypto').randomUUID().replaceAll('-','');
 const temporary=query=>query.replaceAll('#function_fixture','##helpdesk_function_delete_'+suffix).replaceAll('#user_fixture','##helpdesk_user_delete_'+suffix).replaceAll('#role_fixture','##helpdesk_role_delete_'+suffix);
 try{
  await assert.rejects(sql.$transaction(async driver=>{
   // Unique global temporary tables survive prepared RPC scope; rollback removes them.
   const tx={$queryRawUnsafe:(query,...values)=>driver.$queryRawUnsafe(temporary(query),...values),$executeRawUnsafe:(query,...values)=>driver.$executeRawUnsafe(temporary(query),...values)};
   await tx.$executeRawUnsafe('CREATE TABLE #function_fixture(cargo_id int PRIMARY KEY,is_global_admin bit NOT NULL DEFAULT(0));');
   await tx.$executeRawUnsafe('CREATE TABLE #user_fixture(user_id int PRIMARY KEY,user_sts int NULL,user_funcao int NULL,name nvarchar(50));');
   await tx.$executeRawUnsafe('CREATE TABLE #role_fixture(slug nvarchar(120) PRIMARY KEY);');
   await tx.$executeRawUnsafe('INSERT INTO #function_fixture(cargo_id) VALUES(1),(2),(3),(4),(5);');
   await tx.$executeRawUnsafe('INSERT INTO #function_fixture VALUES(6,1);');
   await tx.$executeRawUnsafe("INSERT INTO #user_fixture VALUES(10,2,2,N'Preserved'),(11,NULL,2,N'Unknown status'),(12,1,3,N'Active'),(13,2,3,N'Inactive sibling'),(14,1,4,N'Unrelated'),(15,2,5,N'Rollback account');");
   await tx.$executeRawUnsafe("INSERT INTO #role_fixture VALUES('function-1'),('function-2'),('function-3'),('function-4'),('function-5');");
   const map=query=>{
    const fixture=query.replaceAll('dbo.cargos_n3','#function_fixture').replaceAll('dbo.usuarios','#user_fixture').replaceAll('dbo.roles','#role_fixture');
    if(/\b(?:usuarios|cargos_n3|roles)\b/i.test(fixture))throw Error('Refusing a non-fixture table in deletion tests.');
    return fixture;
   };
   let failRoleDelete=false;
   const database={
    $queryRawUnsafe:(query,...values)=>tx.$queryRawUnsafe(map(query),...values),
    $executeRawUnsafe:async(query,...values)=>{if(failRoleDelete&&query.startsWith('DELETE FROM dbo.roles'))throw Error('Synthetic failure');return tx.$executeRawUnsafe(map(query),...values);},
    async $transaction(work){await tx.$executeRawUnsafe('SAVE TRANSACTION function_fixture_savepoint');try{return await work(database);}catch(error){await tx.$executeRawUnsafe('ROLLBACK TRANSACTION function_fixture_savepoint');throw error;}},
   };
   const repository=new UserFunctionsRepository(database);
   await assert.rejects(repository.remove(6),error=>error.getStatus()===409);
   await assert.rejects(repository.remove(3),error=>error.getStatus()===409);
   assert.equal((await tx.$queryRawUnsafe('SELECT * FROM #user_fixture WHERE user_funcao=3')).length,2);
   await repository.remove(1);assert.equal((await tx.$queryRawUnsafe('SELECT * FROM #function_fixture WHERE cargo_id=1')).length,0);
   await repository.remove(2);
   const preserved=await tx.$queryRawUnsafe('SELECT * FROM #user_fixture WHERE user_id IN (10,11) ORDER BY user_id');
   assert.equal(preserved.length,2);assert.ok(preserved.every(row=>row.user_funcao===null));assert.equal(preserved[0].name,'Preserved');assert.equal(preserved[0].user_sts,2);assert.equal(preserved[1].user_sts,null);
   assert.equal((await tx.$queryRawUnsafe("SELECT * FROM #role_fixture WHERE slug='function-2'")).length,0);
   assert.equal((await tx.$queryRawUnsafe('SELECT user_funcao FROM #user_fixture WHERE user_id=14'))[0].user_funcao,4);
   await assert.rejects(repository.remove(999),error=>error.getStatus()===404);
   failRoleDelete=true;await assert.rejects(repository.remove(5));failRoleDelete=false;
   assert.equal((await tx.$queryRawUnsafe('SELECT user_funcao FROM #user_fixture WHERE user_id=15'))[0].user_funcao,5);
   assert.equal((await tx.$queryRawUnsafe('SELECT * FROM #function_fixture WHERE cargo_id=5')).length,1);
   // A form opened before deletion must not recreate an orphan assignment during activation/creation.
   const users=new UsersRepository(database);
   await assert.rejects(users.create({functionId:2},'unused-fixture',0,false),error=>error.getStatus()===404);
   await assert.rejects(users.update(10,{functionId:2},false,0),error=>error.getStatus()===404);
   throw rollback;
  },{timeout:45000}),error=>error===rollback);
 }finally{await sql.$disconnect();}
});
