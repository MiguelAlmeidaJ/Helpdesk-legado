// Read-only legacy inventory shared by migration and incremental synchronization.
const fs=require('node:fs/promises');const path=require('node:path');
function createLegacySources(legacy,sourceRoot,batchSize=25){
const roots={catalog:[process.env.CATALOG_UPLOAD_DIR || path.join(sourceRoot,'storage/uploads/catalog')],tickets:[process.env.TICKET_UPLOAD_DIR || path.join(sourceRoot,'storage/uploads/tickets'),path.join(sourceRoot,'uploads')]};
async function safeRead(relative,allowedRoots){
  const normalized=relative.replace(/\\/g,'/').replace(/^\/+/, '').replace(/^uploads\//,'');
  for(const directory of allowedRoots){
    const base=path.resolve(directory),candidate=path.resolve(base,normalized);
    if(!candidate.startsWith(base+path.sep))continue;
    try{
      const realBase=await fs.realpath(base),realFile=await fs.realpath(candidate);
      if(!realFile.startsWith(realBase+path.sep))continue;
      const stat=await fs.stat(realFile);
      if(!stat.isFile())continue;
      if(stat.size>100*1048576)throw new Error('Legacy file exceeds the bounded read limit.');
      const data=await fs.readFile(realFile),after=await fs.stat(realFile);
      if(stat.size!==after.size || stat.mtimeMs!==after.mtimeMs || data.length!==stat.size)throw new Error('Legacy file changed during read.');
      return data;
    }catch(error){if(!['ENOENT','ENOTDIR'].includes(error.code))throw error;}
  }
  return null;
}
async function* tableRows(table,fields){
  let last=0;
  while(true){const rows=await legacy.$queryRawUnsafe(`SELECT TOP (${batchSize}) id,${fields} FROM dbo.${table} WHERE id>@P1 ORDER BY id`,last);if(!rows.length)return;
    for(const row of rows){last=Number(row.id);yield row;}
  }
}
async function* sources(){
  for(const [table,column,parent,type] of [['imagens','img_atd','atd_id','ticket'],['imagens_tarefa','img_tarefa','tarefa_id','task']]){
    for await(const row of tableRows(table,`${column},${parent}`))yield{sourceType:table,sourceId:String(row.id),reference:`binary:${table}:${row.id}:${column}`,context:row[parent]?{type,id:String(row[parent])}:null,name:`${table}-${row.id}`,data:row[column]?Buffer.from(row[column]):null};
  }
  for await(const row of tableRows('catalog_images','catalog_id,storage_path,original_name'))yield{sourceType:'catalog_images',sourceId:String(row.id),reference:row.storage_path,context:row.catalog_id?{type:'catalog',id:String(row.catalog_id)}:null,name:row.original_name,load:()=>safeRead(row.storage_path,roots.catalog)};
  for await(const row of tableRows('documentos','atd_id,caminho_arquivo,nome_arquivo,tipo_arquivo')){
    if(!/^image\//i.test(row.tipo_arquivo || '')&&!/\.(png|jpe?g|webp|gif)$/i.test(row.nome_arquivo || ''))continue;
    const external=/^https?:\/\//i.test(row.caminho_arquivo || '');
    yield{sourceType:'documentos',sourceId:String(row.id),reference:row.caminho_arquivo,context:row.atd_id?{type:'ticket',id:String(row.atd_id)}:null,name:row.nome_arquivo,external,load:()=>safeRead(row.caminho_arquivo,roots.tickets)};
  }
  for(const [table,column,type] of [['catalogos','conteudo','catalog'],['running_balance','remarks','system']]){
    for await(const row of tableRows(table,column)){
      const text=String(row[column] || '');let ordinal=0;
      for(const match of text.matchAll(/data:image\/([a-z0-9.+-]+);base64,([a-z0-9+/=\r\n\t ]+)/gi)){
        ordinal++;
        yield{sourceType:table+'-inline',sourceId:row.id+':'+ordinal,reference:`inline:${table}:${row.id}:${column}:${ordinal}`,context:{type,id:type==='system'?'global':String(row.id)},name:`${table}-${row.id}-${ordinal}`,data:Buffer.from(match[2].replace(/\s/g,''),'base64')};
      }
      if(type==='catalog'){
        const urls=new Set();
        for(const match of text.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)){
          if(/^data:image\//i.test(match[1])||/(?:catalog\/images\/\d+\/content|catalog-images\/\d+)/i.test(match[1]))continue;
          if(urls.has(match[1]))continue;urls.add(match[1]);
          const external=/^(?:https?:)?\/\//i.test(match[1]);
          yield{sourceType:'catalog-html-reference',sourceId:row.id+':'+urls.size,reference:match[1],context:{type:'catalog',id:String(row.id)},name:'catalog-reference',external,load:()=>safeRead(match[1],roots.tickets)};
        }
      }
    }
  }
}

return sources;
}
module.exports={createLegacySources};
