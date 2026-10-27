import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { MediaContext, MediaContextType } from '@helpdesk/contracts';
import path from 'node:path';
import { mediaMaxBytes } from '../infrastructure/media-providers';

export function mediaContext(type: unknown, id: unknown): MediaContext {
  if (typeof type !== 'string' || !['system','catalog','ticket','project','task'].includes(type)) throw new BadRequestException('Contexto de mídia inválido.');
  if (typeof id !== 'string' && typeof id !== 'number') throw new BadRequestException('Registro de mídia inválido.');
  const value = String(id ?? '');
  if (type === 'system' ? value !== 'global' : !/^[1-9]\d{0,9}$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value)>2147483647) throw new BadRequestException('Registro de mídia inválido.');
  return { type: type as MediaContextType, id: value };
}
export function mediaId(value: string): string {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value)) throw new BadRequestException('ID de mídia inválido.');
  return value;
}
export function validateMedia(data: Buffer, claimedMime?: string) {
  if (!data.length) throw new BadRequestException('Arquivo vazio.');
  if (data.length > mediaMaxBytes()) throw new PayloadTooLargeException('Arquivo excede o limite de mídia.');
  let mimeType: string | null = null, extension = '';
  if (data.length >= 45 && data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) && data.subarray(12,16).toString() === 'IHDR' && data.subarray(-12).equals(Buffer.from('0000000049454e44ae426082','hex'))) { mimeType='image/png'; extension='png'; }
  else if (data.length >= 4 && data[0]===255 && data[1]===216 && data[2]===255 && data[data.length-2]===255 && data[data.length-1]===217) { mimeType='image/jpeg'; extension='jpg'; }
  else if (data.length >= 14 && data.subarray(0,4).toString()==='RIFF' && data.subarray(8,12).toString()==='WEBP' && data.readUInt32LE(4)+8===data.length) { mimeType='image/webp'; extension='webp'; }
  else if (data.length >= 14 && /^GIF8[79]a$/.test(data.subarray(0,6).toString()) && data[data.length-1]===59) { mimeType='image/gif'; extension='gif'; }
  else if (data.length >= 12 && data.subarray(0,5).toString()==='%PDF-' && data.subarray(-1024).includes(Buffer.from('%%EOF'))) { mimeType='application/pdf'; extension='pdf'; }
  if (!mimeType) throw new BadRequestException('Formato real não permitido. Utilize PNG, JPEG, WebP, GIF ou PDF.');
  if (claimedMime && claimedMime !== 'application/octet-stream' && claimedMime.toLowerCase() !== mimeType) throw new BadRequestException('O MIME informado diverge do conteúdo do arquivo.');
  return { mimeType, extension };
}
export function mediaFilename(value: string): string {
  return path.basename(value.replace(/\\/g,'/')).replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,255) || 'midia';
}
