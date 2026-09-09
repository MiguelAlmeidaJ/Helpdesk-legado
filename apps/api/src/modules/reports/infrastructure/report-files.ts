import { Buffer } from 'node:buffer';
import type { TicketAnalyticsResponse } from '@helpdesk/contracts';

function wrap(text: string, width = 100): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (let word of words) {
    if (current.length + word.length + 1 > width) { lines.push(current); current = ''; }
    while (word.length > width) { lines.push(word.slice(0, width)); word = word.slice(width); }
    current += (current ? ' ' : '') + word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function escapePdf(text: string) {
  return text.replace(/[^\x20-\xFF]/g, '?').replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

export function analyticsPdf(report: TicketAnalyticsResponse): Buffer {
  const lines = [
    'HELPDESK - RELATÓRIO ANALÍTICO',
    `Período: ${report.filters.startDate} a ${report.filters.endDate} | Total: ${report.total}`,
    `Origem: ${report.filters.source} | Nível: ${report.filters.level || 'Todos'} | Cliente: ${report.filters.clientId || 'Todos'} | Local: ${report.filters.locationId || 'Todos'}`,
    '',
  ];
  for (const row of report.rows) {
    for (const line of [
      `${row.source} #${row.id} | ${row.clientName} | Status: ${row.status}`,
      `Local: ${row.locationName} | ${row.locationAddress}`,
      `Solicitante: ${row.requesterName} | Técnico: ${row.technicianName}`,
      `Abertura: ${row.openedAt} | Fechamento: ${row.closedAt ?? '-'} | Nível: ${row.level} | Tipo: ${row.type} | Forma: ${row.method}`,
      [row.categoryName, row.subcategoryName, row.itemName].filter(Boolean).join(' / '),
      `Descrição de abertura: ${row.openingDescription}`,
      `Descrição de fechamento: ${row.closingDescription}`, '',
    ]) lines.push(...wrap(line));
  }
  if (!report.total) lines.push('Nenhum registro para os filtros selecionados.');
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 54) pages.push(lines.slice(i, i + 54));
  const objects = new Map<number, string>();
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const ids: number[] = [];
  pages.forEach((page, index) => {
    const id = 4 + index * 2;
    ids.push(id);
    const stream = ['BT', '/F1 9 Tf', '36 805 Td', '13 TL', ...[...page, '', `Página ${index + 1} de ${pages.length}`].flatMap(line => [`(${escapePdf(line)}) Tj`, 'T*']), 'ET'].join('\n');
    objects.set(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`);
    objects.set(id + 1, `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
  });
  objects.set(2, `<< /Type /Pages /Kids [${ids.map(id => `${id} 0 R`).join(' ')}] /Count ${ids.length} >>`);
  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id <= objects.size; id++) { offsets[id] = Buffer.byteLength(output, 'latin1'); output += `${id} 0 obj\n${objects.get(id)}\nendobj\n`; }
  const xref = Buffer.byteLength(output, 'latin1');
  output += `xref\n0 ${objects.size + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.size + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output, 'latin1');
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}

// ZIP STORE avoids external executables and preserves UTF-8 filenames.
export function reportZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8'), crc = crc32(file.data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(file.data.length, 18); header.writeUInt32LE(file.data.length, 22); header.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800, 8); entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(file.data.length, 20); entry.writeUInt32LE(file.data.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    local.push(header, name, file.data); central.push(entry, name); offset += header.length + name.length + file.data.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
