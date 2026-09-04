import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const dumpPath = resolve(process.cwd(), 'Dump_Helpdesk_RD.sql');

let sql;
try {
  const size = statSync(dumpPath).size;
  sql = readFileSync(dumpPath, 'utf8');
  console.log(`Dump encontrado: ${dumpPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
} catch (error) {
  console.error('Dump_Helpdesk_RD.sql não foi encontrado na raiz do projeto.');
  process.exit(1);
}

const databases = [...sql.matchAll(/\b(?:CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?|USE)\s+`?([A-Za-z0-9_]+)`?/gi)]
  .map((match) => match[1].toLowerCase());

const unique = [...new Set(databases)];
console.log(`Bancos referenciados no dump: ${unique.length ? unique.join(', ') : '(nenhum CREATE DATABASE/USE encontrado)'}`);

const hasNivel3 = databases.includes('nivel3');
const hasN3rd = databases.includes('n3rd');

if (!hasNivel3 || !hasN3rd) {
  console.warn('\nATENÇÃO: não encontrei marcadores para os dois bancos esperados (`nivel3` e `n3rd`).');
  console.warn('Não suba o banco ainda se o dump contém tabelas dos dois bancos sem comandos USE que as separem.');
  process.exitCode = 2;
} else {
  console.log('\nOK: o dump referencia `nivel3` e `n3rd`.');
}
