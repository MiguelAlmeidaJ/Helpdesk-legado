const {test}=require('node:test'),assert=require('node:assert/strict');
const {syncManifest,syncHash,classifyEntry,contentId}=require('../apps/api/dist/modules/media/application/media-sync-model');
const {mediaRecordIdentity}=require('../apps/api/dist/modules/media/application/media-sync-identity');
const {MediaSyncService}=require('../apps/api/dist/modules/media/application/media-sync.service');
const entry={key:'imagens:1',sourceType:'imagens',sourceId:'1',name:'fixture.png',context:{type:'ticket',id:'1'},identitySha256:syncHash('record'),sha256:syncHash('image'),size:68,availability:'file'};
const manifest=entries=>({schema:1,origin:'fixture',dump:'dump-1',complete:true,provider:'local',entries});
test('manifest normalization rejects aliases colliding, paths, invalid checksums and incomplete descriptors',()=>{
 assert.throws(()=>syncManifest(manifest([entry,entry])));
 assert.throws(()=>syncManifest(manifest([{...entry,key:'../unsafe'}])));
 assert.throws(()=>syncManifest(manifest([{...entry,sha256:'bad'}])));
 assert.throws(()=>syncManifest(manifest([{...entry,context:{type:'ticket',id:'-1'}}])));
 assert.throws(()=>syncManifest({...manifest([entry]),origin:'Origin/invalid'}));
 assert.deepEqual(syncManifest(manifest([entry])).entries,[entry]);
});
test('comparison distinguishes idempotence, duplicates, new content, remapped IDs and preserved absences',()=>{
 assert.equal(classifyEntry(entry,null,false),'new');assert.equal(classifyEntry(entry,null,true),'duplicate');
 assert.equal(classifyEntry(entry,entry,true),'unchanged');
 assert.equal(classifyEntry({...entry,sha256:syncHash('new')},entry,false),'changed');
 assert.equal(classifyEntry({...entry,context:{type:'ticket',id:'9'}},entry,true),'changed');
 assert.equal(classifyEntry({...entry,identitySha256:syncHash('other record')},entry,true),'invalid-link');
 assert.equal(classifyEntry({...entry,availability:'missing',sha256:null,size:0},entry,false),'missing');
 assert.equal(classifyEntry(entry,entry,true,true),'deleted');
});
test('content reservation is deterministic and covers provider, SHA-256 and exact length',()=>{
 assert.equal(contentId('local',entry.sha256,68),contentId('local',entry.sha256,68));
 assert.notEqual(contentId('local',entry.sha256,68),contentId('local',entry.sha256,69));
 assert.notEqual(contentId('local',entry.sha256,68),contentId('nextcloud',entry.sha256,68));
});
test('record identity survives remapped numeric IDs and refuses missing entities',async()=>{
 const db={$queryRawUnsafe:async sql=>sql.includes(' AS matches')?[{matches:1n}]:[{title:'Stable origin title',opened:new Date('2020-01-01Z'),client_key:'fixture-client'}]};
 assert.equal(await mediaRecordIdentity(db,{type:'catalog',id:'1'}),await mediaRecordIdentity(db,{type:'catalog',id:'99'}));
 await assert.rejects(mediaRecordIdentity({$queryRawUnsafe:async()=>[]},{type:'catalog',id:'1'}));
 await assert.rejects(mediaRecordIdentity({$queryRawUnsafe:async sql=>sql.includes(' AS matches')?[{matches:2n}]:[{title:'Ambiguous',opened:null,client_key:'fixture-client'}]},{type:'catalog',id:'1'}));
});
test('administrative and invocation gates fail before any database access',async()=>{
 const service=new MediaSyncService({}, {}, {}, {});
 await assert.rejects(service.compare({grants:[]},manifest([entry])));
 await assert.rejects(service.history({grants:[]}));
 await assert.rejects(service.approve({grants:[]},'id','',''));
 await assert.rejects(service.applyBatch('id','wrong',async()=>Buffer.alloc(0)));
});
test('backup receipts require HMAC, both databases, fresh verification and unchanged files',async()=>{
 const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto');
 const {evidenceSignature,verifiedSyncBackup}=require('../apps/api/dist/modules/media/application/media-sync-backups');
 const {mediaHash}=require('../apps/api/dist/modules/media/infrastructure/media-providers');
 const keys=['MEDIA_SYNC_APPROVAL_KEY','MEDIA_SYNC_BACKUP_EVIDENCE_DIR','MEDIA_SQLSERVER_DATABASE','NIVEL3_DATABASE_URL'],old=keys.map(k=>process.env[k]);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sync-evidence-fixture-'));
 try{
  Object.assign(process.env,{MEDIA_SYNC_APPROVAL_KEY:randomUUID()+randomUUID(),MEDIA_SYNC_BACKUP_EVIDENCE_DIR:root,MEDIA_SQLSERVER_DATABASE:'helpdesk_media_test_sync',NIVEL3_DATABASE_URL:'sqlserver://fixture;database=sync_business_fixture;'});
  const evidence={id:randomUUID(),verifiedAt:new Date().toISOString(),businessDatabase:'sync_business_fixture',metadataDatabase:'helpdesk_media_test_sync',files:[]};
  for(const database of [evidence.businessDatabase,evidence.metadataDatabase]){const file=path.join(root,database+'.bak');await fs.writeFile(file,'SYNTHETIC BACKUP FIXTURE');const stat=await fs.stat(file);evidence.files.push({database,path:file,size:stat.size,mtimeMs:stat.mtimeMs,sha256:mediaHash(await fs.readFile(file))});}
  const receipt=path.join(root,evidence.id+'.json');
  const save=async(signature=evidenceSignature(evidence))=>fs.writeFile(receipt,JSON.stringify({evidence,signature}));
  await save();assert.equal((await verifiedSyncBackup(evidence.id)).id,evidence.id);
  await save('0'.repeat(64));await assert.rejects(verifiedSyncBackup(evidence.id));
  evidence.verifiedAt=new Date(Date.now()-86400001).toISOString();await save();await assert.rejects(verifiedSyncBackup(evidence.id));
  evidence.verifiedAt=new Date().toISOString();evidence.metadataDatabase='wrong_database';await save();await assert.rejects(verifiedSyncBackup(evidence.id));
  evidence.metadataDatabase='helpdesk_media_test_sync';await save();await fs.writeFile(evidence.files[0].path,'TAMPERED');await assert.rejects(verifiedSyncBackup(evidence.id));
 }finally{keys.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]);assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});}
});
