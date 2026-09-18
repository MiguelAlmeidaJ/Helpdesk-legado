import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const dumpPath = path.resolve(process.cwd(), 'Dump_Helpdesk_RD.sql');

if (!fs.existsSync(dumpPath)) {
  console.error(`Dump não encontrado: ${dumpPath}`);
  process.exit(1);
}

const stat = fs.statSync(dumpPath);
const databases = new Set();

const input = fs.createReadStream(dumpPath, {
  encoding: 'utf8',
  highWaterMark: 1024 * 1024,
});

const lines = readline.createInterface({
  input,
  crlfDelay: Infinity,
});

const databasePattern =
  /^\s*(?:CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?|USE)\s+[`'"]?([a-zA-Z0-9_-]+)[`'"]?\s*;?/i;

for await (const line of lines) {
  const match = line.match(databasePattern);
  if (match) {
    databases.add(match[1].toLowerCase());
  }
}

const databaseList = [...databases].sort();

console.log(`Dump encontrado: ${dumpPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`Bancos referenciados no dump: ${databaseList.join(', ') || '(nenhum)'}`);

const required = ['nivel3', 'n3rd'];
const missing = required.filter((database) => !databases.has(database));

if (missing.length) {
  console.error(`\nERRO: o dump não referencia explicitamente: ${missing.join(', ')}.`);
  console.error('Revise CREATE DATABASE / USE antes de recriar o volume local.');
  process.exit(1);
}

console.log('\nOK: o dump referencia `nivel3` e `n3rd`.');
