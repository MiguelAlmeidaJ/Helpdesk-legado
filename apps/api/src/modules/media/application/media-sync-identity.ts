import { NotFoundException } from '@nestjs/common';
import type { MediaContext } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { createHash } from 'node:crypto';
export async function mediaRecordIdentity(database:Pick<Nivel3DatabaseClient,'$queryRawUnsafe'>,context:MediaContext):Promise<string> {
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  if(context.type==='system')return hash('system:global');
  const definitions={catalog:['catalogos','titulo','data_criacao','cliente_id'],ticket:['atendimentos','desc_abertura','abertura','cliente'],project:['projetos','desc_abertura','abertura','cliente'],task:['tarefas','nome_tarefa','abertura','cliente']} as const;
  const [table,title,opened,client]=definitions[context.type];
  const clientKey="CONCAT(COALESCE(c.clt_cnpj,''),'|',COALESCE(c.clt_nomer,''),'|',COALESCE(c.clt_nomef,''))";
  const [row]=await database.$queryRawUnsafe<Array<{title:string|null;opened:Date|null;client_key:string}>>(`SELECT t.${title} AS title,t.${opened} AS opened,${clientKey} AS client_key FROM dbo.${table} t INNER JOIN dbo.clientes c ON c.clt_id=t.${client} WHERE t.id=@P1`,Number(context.id));
  if(!row)throw new NotFoundException('Entidade de destino ausente.');
  const [matches]=await database.$queryRawUnsafe<Array<{matches:bigint}>>(`SELECT COUNT_BIG(*) AS matches FROM dbo.${table} t INNER JOIN dbo.clientes c ON c.clt_id=t.${client}
    WHERE (t.${title}=@P1 OR (t.${title} IS NULL AND @P1 IS NULL)) AND (t.${opened}=@P2 OR (t.${opened} IS NULL AND @P2 IS NULL)) AND ${clientKey}=@P3`,row.title,row.opened,row.client_key);
  if(Number(matches?.matches)!==1)throw new NotFoundException('Identidade ambígua: revise o mapa e as entidades do dump.');
  return hash(JSON.stringify([context.type,row.title??null,row.opened?new Date(row.opened).toISOString():null,row.client_key]));
}
