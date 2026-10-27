const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {LocalMediaProvider,NextcloudMediaProvider,CloudinaryMediaProvider,validateMediaKey,cloudinarySignature}=require('../apps/api/dist/modules/media/infrastructure/media-providers');
const {validateMedia,mediaContext,mediaFilename}=require('../apps/api/dist/modules/media/application/media-validation');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const secret='test-only-secret';
async function temporary(run){const root=await fs.mkdtemp(path.join(os.tmpdir(),'helpdesk-media-test-'));try{await run(root);}finally{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});}}

test('real MIME, size, UUID, context and filename validation',()=>{
  assert.equal(validateMedia(png,'image/png').extension,'png');
  assert.throws(()=>validateMedia(png,'image/jpeg'),/MIME/);
  assert.throws(()=>validateMedia(Buffer.from('<svg onload="alert(1)"></svg>')),/Formato/);
  assert.throws(()=>validateMedia(Buffer.alloc(26*1048576)),/limite/);
  assert.throws(()=>mediaContext('ticket','1 OR 1=1'),/inválido/);
  assert.throws(()=>mediaContext('system','1'),/inválido/);
  assert.equal(mediaFilename('../../private\r\n.png'),'private.png');
  for(const key of ['../secret','2026/10/../../secret.png','C:\\Windows\\secret','2026%2f10%2fsecret.png'])assert.throws(()=>validateMediaKey(key));
});
test('local provider read/write, checksum, no overwrite, path and symlink protection',()=>temporary(async root=>{
  const provider=new LocalMediaProvider(root),first=await provider.put(png,'png','image/png'),second=await provider.put(png,'png','image/png');
  assert.notEqual(first.key,second.key);
  assert.deepEqual(await provider.read(first.key),png);
  assert.equal(first.sha256,createHash('sha256').update(png).digest('hex'));
  await assert.rejects(provider.read('../secret'));
  const junction=path.join(root,'junction');await fs.symlink(root,junction,'junction');
  await assert.rejects(new LocalMediaProvider(junction).put(png,'png','image/png'),/simbólicos/);
  await provider.remove(first.key);await assert.rejects(provider.read(first.key));
}));
test('Nextcloud authenticates requests, prohibits overwrite and redirects, and bounds reads',async()=>{
  const original=global.fetch,calls=[];let fail=false;
  global.fetch=async(url,init)=>{calls.push({url,init});assert.equal(init.redirect,'error');assert.match(init.headers.Authorization,/^Basic /);if(fail)return new Response('unavailable',{status:503});
    if(init.method==='MKCOL')return new Response(null,{status:201});
    if(init.method==='PUT'){assert.equal(init.headers['If-None-Match'],'*');assert.match(init.headers['OC-Checksum'],/^SHA256:/);return new Response(null,{status:201});}
    if(init.method==='DELETE')return new Response(null,{status:204});return new Response(png);
  };
  try{const provider=new NextcloudMediaProvider('https://example.test/dav/helpdesk','fixture-user',secret);const stored=await provider.put(png,'png','image/png');assert.deepEqual(await provider.read(stored.key),png);await provider.remove(stored.key);assert.equal(calls.length,5);fail=true;await assert.rejects(provider.read(stored.key));await assert.rejects(provider.read('../escape'));
    assert.throws(()=>new NextcloudMediaProvider('http://example.test','u','p'));
    assert.throws(()=>new NextcloudMediaProvider('https://user:pass@example.test','u','p'));
  }finally{global.fetch=original;}
});
test('Cloudinary signs authenticated uploads, private API downloads and owned destroys',async()=>{
  const original=global.fetch,calls=[];let publicId;
  global.fetch=async(url,init)=>{calls.push({url,init});assert.equal(init.redirect,'error');const body=init.body;
    if(url.endsWith('/image/upload')){publicId=body.get('public_id');assert.equal(body.get('type'),'authenticated');assert.equal(body.get('overwrite'),'false');assert.equal(body.get('signature'),cloudinarySignature({public_id:publicId,timestamp:body.get('timestamp'),type:'authenticated',overwrite:'false'},secret));return Response.json({public_id:publicId,asset_id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',resource_type:'image',type:'authenticated',bytes:png.length});}
    if(url.endsWith('/asset/download')){assert.equal(body.get('asset_id'),'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');assert.ok(Number(body.get('expires_at'))>Number(body.get('timestamp')));return new Response(png);}
    assert.ok(url.endsWith('/image/destroy'));assert.equal(body.get('public_id'),publicId);assert.equal(body.get('type'),'authenticated');return Response.json({result:'ok'});
  };
  try{const provider=new CloudinaryMediaProvider('fixture-cloud','fixture-key',secret);const stored=await provider.put(png,'png','image/png');assert.deepEqual(await provider.read(stored.key),png);await provider.remove(stored.key);await assert.rejects(provider.read('image:someone-elses-asset'));assert.equal(calls.length,3);}finally{global.fetch=original;}
});
test('Cloudinary rejects an unexpectedly public upload response',async()=>{
  const original=global.fetch;global.fetch=async(url,init)=>Response.json({public_id:init.body.get('public_id'),asset_id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',resource_type:'image',type:'upload',bytes:png.length});
  try{await assert.rejects(new CloudinaryMediaProvider('fixture','key',secret).put(png,'png','image/png'));}finally{global.fetch=original;}
});
test('remote oversized responses are canceled and never returned as media',async()=>{
  const original=global.fetch;let canceled=false;
  global.fetch=async()=>new Response(new ReadableStream({cancel(){canceled=true;}}),{headers:{'Content-Length':String(101*1048576)}});
  try{const provider=new NextcloudMediaProvider('https://fixture.test/dav','user','secret');await assert.rejects(provider.read('2026/10/00000000-0000-4000-8000-000000000001.png'));assert.equal(canceled,true);}finally{global.fetch=original;}
});
