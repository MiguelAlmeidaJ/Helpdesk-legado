// --run explicitly creates and removes only a synthetic fixture in the selected provider.
process.loadEnvFile(require('node:path').resolve(__dirname,'../.env'));
const {mediaProvider,mediaHash}=require('../apps/api/dist/modules/media/infrastructure/media-providers');
const index=process.argv.indexOf('--provider'),name=index<0?'local':process.argv[index+1];
if(!['local','nextcloud','cloudinary'].includes(name))throw new Error('Invalid provider.');
const data=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
(async()=>{
  let provider;
  try{provider=mediaProvider(name);}catch{console.log(JSON.stringify({provider:name,configured:false,tested:false}));return;}
  if(!process.argv.includes('--run')){console.log(JSON.stringify({provider:name,configured:true,tested:false,instruction:'Pass --run for a synthetic upload/read/checksum/delete roundtrip.'}));return;}
  let stored;
  try{stored=await provider.put(data,'png','image/png');const copy=await provider.read(stored.key);if(mediaHash(copy)!==mediaHash(data)||copy.length!==data.length)throw new Error();console.log(JSON.stringify({provider:name,tested:true,checksum:true,bytes:data.length}));}
  finally{if(stored)await provider.remove(stored.key);}
})().catch(()=>{console.error('Provider roundtrip or synthetic fixture cleanup failed. Check server-side configuration; secrets were not logged.');process.exitCode=1;});
