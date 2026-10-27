import { ConflictException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { mediaId } from './media-validation';

export interface SyncBackupEvidence {
  id: string; verifiedAt: string; businessDatabase: string; metadataDatabase: string;
  files: { database: string; path: string; size: number; mtimeMs: number; sha256: string }[];
}
export function evidenceSignature(evidence: SyncBackupEvidence): string {
  const key = process.env.MEDIA_SYNC_APPROVAL_KEY;
  if (!key || key.length < 32) throw new ConflictException('Configure a chave privada de aprovação no servidor.');
  return createHmac('sha256',key).update(JSON.stringify(evidence)).digest('hex');
}
export async function verifiedSyncBackup(id: string): Promise<SyncBackupEvidence> {
  try {
    mediaId(id);
    const directory = process.env.MEDIA_SYNC_BACKUP_EVIDENCE_DIR;
    if (!directory || !path.isAbsolute(directory)) throw new Error();
    const root = await realpath(directory), file = path.join(root,id+'.json');
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 10000) throw new Error();
    const {evidence,signature} = JSON.parse(await readFile(file,'utf8')) as {evidence:SyncBackupEvidence;signature:string};
    const expected = evidenceSignature(evidence);
    if (!/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'))) throw new Error();
    const age = Date.now()-Date.parse(evidence.verifiedAt);
    const business = process.env.NIVEL3_DATABASE_URL?.match(/(?:^|;)database=([^;]+)/i)?.[1];
    if (evidence.id !== id || !Number.isFinite(age) || age < 0 || age > 86400000 || evidence.businessDatabase !== business || evidence.metadataDatabase !== process.env.MEDIA_SQLSERVER_DATABASE || evidence.files.length !== 2) throw new Error();
    for (const database of [business,evidence.metadataDatabase]) {
      const item = evidence.files.find(f=>f.database===database);
      if (!item || !path.isAbsolute(item.path) || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error();
      const info = await lstat(item.path);
      if (!info.isFile() || info.isSymbolicLink() || info.size <= 0 || info.size !== item.size || info.mtimeMs !== item.mtimeMs) throw new Error();
      const hash=createHash('sha256');
      for await(const chunk of createReadStream(item.path))hash.update(chunk);
      const after=await lstat(item.path);
      if(hash.digest('hex')!==item.sha256 || after.size!==info.size || after.mtimeMs!==info.mtimeMs)throw new Error();
    }
    return evidence;
  } catch { throw new ConflictException('Exija backups dos dois bancos, verificados há menos de 24h e com comprovante íntegro.'); }
}
