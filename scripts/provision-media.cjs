// Explicit, additive provisioning. No password is passed on the command line or printed.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname,'..');
process.loadEnvFile(path.join(root,'.env'));
if (!process.argv.includes('--apply')) {
  console.log('Dry-run: create helpdesk_media if absent, create missing tables/indexes/role, and provision an isolated runtime login. Use --apply explicitly.');
  process.exit(0);
}
const host = process.env.MEDIA_SQLSERVER_HOST || process.env.NIVEL3_SQLSERVER_HOST || '127.0.0.1';
const port = process.env.MEDIA_SQLSERVER_PORT || process.env.NIVEL3_SQLSERVER_PORT || '1433';
if (!/^[a-zA-Z0-9_.-]+$/.test(host) || !/^\d{1,5}$/.test(port)) throw new Error('Invalid SQL Server address.');
const login = process.env.MEDIA_SQLSERVER_USER || 'helpdesk_media_app';
if (!/^[a-zA-Z0-9_]{1,100}$/.test(login) || login === process.env.NIVEL3_SQLSERVER_USER) throw new Error('Use a dedicated media login.');
const existingPassword = process.env.MEDIA_SQLSERVER_PASSWORD;
const password = existingPassword || randomBytes(36).toString('base64url')+'aA1!';
const literal = value => "N'"+value.replaceAll("'","''")+"'";
function sql(input) {
  const result = spawnSync('sqlcmd',['-S',host+','+port,'-E','-C','-b','-f','65001'],{input,encoding:'utf8',windowsHide:true});
  if (result.status !== 0) {
    const codes=((result.stdout||'')+(result.stderr||'')).match(/Msg \d+/g) || [];
    throw new Error('Media provisioning failed ('+(result.error?.code || codes.join(',') || result.status)+'). Check DBA permissions and schema; credentials were not logged.');
  }
}
// Do not rotate or take over an existing login unless its password was explicitly provided.
if (!existingPassword) sql(`IF SUSER_ID(${literal(login)}) IS NOT NULL THROW 50001,'An existing login requires its configured password; no changes were made.',1;\nGO\n`);
sql(fs.readFileSync(path.join(root,'scripts/sqlserver/helpdesk-media.sql'),'utf8'));
sql(`USE master;
IF SUSER_ID(${literal(login)}) IS NULL CREATE LOGIN [${login}] WITH PASSWORD=${literal(password)},CHECK_POLICY=ON,DEFAULT_DATABASE=helpdesk_media;
GO
USE helpdesk_media;
IF USER_ID(${literal(login)}) IS NULL CREATE USER [${login}] FOR LOGIN [${login}];
IF IS_ROLEMEMBER('helpdesk_media_runtime',${literal(login)})<>1 ALTER ROLE helpdesk_media_runtime ADD MEMBER [${login}];
GO`);
const envPath=path.join(root,'.env');
let env=fs.readFileSync(envPath,'utf8');
const values={MEDIA_ENABLED:'true',MEDIA_SQLSERVER_HOST:host,MEDIA_SQLSERVER_PORT:port,MEDIA_SQLSERVER_DATABASE:'helpdesk_media',MEDIA_SQLSERVER_USER:login,MEDIA_SQLSERVER_PASSWORD:password,MEDIA_SQLSERVER_TRUST_CERTIFICATE:process.env.MEDIA_SQLSERVER_TRUST_CERTIFICATE || (['localhost','127.0.0.1'].includes(host)?'true':'false'),MEDIA_DEFAULT_PROVIDER:process.env.MEDIA_DEFAULT_PROVIDER || 'local',MEDIA_LOCAL_ROOT:process.env.MEDIA_LOCAL_ROOT || 'C:\\HelpdeskMedia'};
for(const [key,value] of Object.entries(values)) {
  if (/[\r\n]/.test(value)) throw new Error('Invalid multiline configuration.');
  const line=key+'='+value, expression=new RegExp('^'+key+'=.*$','m');
  env=expression.test(env)?env.replace(expression,()=>line):env.trimEnd()+'\n'+line+'\n';
}
fs.writeFileSync(envPath,env,{mode:0o600});
console.log('Independent helpdesk_media schema and runtime login provisioned. Local .env configured; password not displayed. Existing business data and runtime processes were not changed.');
