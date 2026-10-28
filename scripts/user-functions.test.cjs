const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');
const {UserFunctionsRepository}=require('../apps/api/dist/modules/users/infrastructure/user-functions.repository');
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
