// Explicit isolated test database provisioning; never targets helpdesk_media or business data.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
if(!process.argv.includes('--create'))throw Error('Pass --create for the isolated fixture database.');
const database='helpdesk_media_test_sync';
if(!/^helpdesk_media_test_[a-z_]+$/.test(database))throw Error('Unsafe test database.');
const login=process.env.MEDIA_SQLSERVER_USER;
if(!/^[a-zA-Z0-9_]{1,100}$/.test(login||''))throw Error('Invalid test principal.');
let sql=['helpdesk-media.sql','helpdesk-media-sync.sql'].map(name=>fs.readFileSync(path.join(__dirname,'sqlserver',name),'utf8').replace(/\bhelpdesk_media\b/g,database)).join('\nGO\n');
sql+=`\nGO\nUSE [${database}];\nIF USER_ID(N'${login}') IS NULL CREATE USER [${login}] FOR LOGIN [${login}];\nIF IS_ROLEMEMBER('helpdesk_media_runtime',N'${login}')<>1 ALTER ROLE helpdesk_media_runtime ADD MEMBER [${login}];\nGO\n`;
const result=spawnSync('sqlcmd',['-S',process.env.MEDIA_SQLSERVER_HOST+','+process.env.MEDIA_SQLSERVER_PORT,'-E','-C','-b'],{input:sql,encoding:'utf8',windowsHide:true});
if(result.status!==0){console.error('Isolated fixture provisioning failed:',(result.stdout||'')+(result.stderr||''));process.exitCode=1;}else console.log('Isolated schema ready: '+database+'. No real media or business data changed.');
