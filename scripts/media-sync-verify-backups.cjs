// Explicit DBA verification only. Never creates/restores/overwrites a backup or logs SQL credentials.
const fs=require('node:fs/promises'),path=require('node:path'),{createReadStream}=require('node:fs');
const {createHash,randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {evidenceSignature}=require('../apps/api/dist/modules/media/application/media-sync-backups');
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const literal=v=>"N'"+v.replaceAll("'","''")+"'";
async function verify(database,file){
  if(!database||!file||!path.isAbsolute(file))throw Error();
  const physical=await fs.realpath(file),info=await fs.lstat(file);
  if(!info.isFile()||info.isSymbolicLink()||info.size<=0||path.extname(file).toLowerCase()!=='.bak')throw Error();
  const server=process.env.MEDIA_SQLSERVER_HOST+','+process.env.MEDIA_SQLSERVER_PORT;
  const sql=`SET NOCOUNT ON; RESTORE HEADERONLY FROM DISK=${literal(physical)} WITH FILE=1;\nGO\n`;
  const header=spawnSync('sqlcmd',['-S',server,'-E','-C','-b','-W','-h','-1','-s','|'],{input:sql,encoding:'utf8',windowsHide:true});
  if(header.status!==0)throw Error();
  const rows=header.stdout.split(/\r?\n/).filter(line=>line.includes('|')).map(line=>line.split('|').map(value=>value.trim()));
  // Only a full database backup in position 1 is accepted; never another database or a log backup.
  if(rows.length!==1||rows[0][9]!==database||rows[0][2]!=='1'||rows[0][5]!=='1')throw Error();
  const result=spawnSync('sqlcmd',['-S',server,'-E','-C','-b'],{input:`RESTORE VERIFYONLY FROM DISK=${literal(physical)} WITH FILE=1,CHECKSUM,STOP_ON_ERROR;\nGO\n`,encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw Error();
  const hash=createHash('sha256');for await(const chunk of createReadStream(physical))hash.update(chunk);
  const after=await fs.stat(physical);if(after.size!==info.size||after.mtimeMs!==info.mtimeMs)throw Error();
  return {database,path:physical,size:info.size,mtimeMs:info.mtimeMs,sha256:hash.digest('hex')};
}
(async()=>{
  if(!args.includes('--verify'))throw Error();
  const businessDatabase=process.env.NIVEL3_DATABASE_URL?.match(/(?:^|;)database=([^;]+)/i)?.[1],metadataDatabase=process.env.MEDIA_SQLSERVER_DATABASE;
  if(!businessDatabase||metadataDatabase!=='helpdesk_media')throw Error();
  const directory=process.env.MEDIA_SYNC_BACKUP_EVIDENCE_DIR;
  if(!directory||!path.isAbsolute(directory))throw Error();
  const stat=await fs.lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error();
  const files=[await verify(businessDatabase,option('--business')),await verify(metadataDatabase,option('--metadata'))];
  const evidence={id:randomUUID(),verifiedAt:new Date().toISOString(),businessDatabase,metadataDatabase,files};
  const signature=evidenceSignature(evidence);
  await fs.writeFile(path.join(directory,evidence.id+'.json'),JSON.stringify({evidence,signature}),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({receipt:evidence.id,verifiedAt:evidence.verifiedAt,databases:[businessDatabase,metadataDatabase]}));
})().catch(()=>{console.error('Backup evidence refused. Require explicit --verify, DBA integrated authentication, full checksummed backups of both databases, a private evidence directory and an approval key. No credentials logged.');process.exitCode=1;});
