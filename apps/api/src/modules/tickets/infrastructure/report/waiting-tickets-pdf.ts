import { Buffer } from 'node:buffer';
import type { TicketAvailabilityResponse } from '@helpdesk/contracts';

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const LEFT = 36;
const TOP = 555;
const LINE_HEIGHT = 13;
const LINES_PER_PAGE = 38;

function ascii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}

function escapePdf(value: string): string {
  return ascii(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function wrap(value: string, width = 112): string[] {
  const words = ascii(value).replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word.slice(0, width);
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function pageStream(lines: string[]): string {
  const content = [
    'BT',
    '/F1 9 Tf',
    `${LEFT} ${TOP} Td`,
    `${LINE_HEIGHT} TL`,
  ];

  for (const line of lines) {
    content.push(`(${escapePdf(line)}) Tj`, 'T*');
  }

  content.push('ET');
  return content.join('\n');
}

function pdfFromPages(pages: string[][]): Buffer {
  const objects = new Map<number, string>();
  const pageObjectIds: number[] = [];

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  pages.forEach((lines, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const stream = pageStream(lines);

    pageObjectIds.push(pageId);
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.set(
      contentId,
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    );
  });

  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`,
  );

  const maxObjectId = Math.max(...objects.keys());
  let output = '%PDF-1.4\n';
  const offsets = new Array<number>(maxObjectId + 1).fill(0);

  for (let id = 1; id <= maxObjectId; id += 1) {
    const body = objects.get(id);
    if (!body) continue;
    offsets[id] = Buffer.byteLength(output, 'latin1');
    output += `${id} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(output, 'latin1');
  output += `xref\n0 ${maxObjectId + 1}\n`;
  output += '0000000000 65535 f \n';

  for (let id = 1; id <= maxObjectId; id += 1) {
    output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\n`;
  output += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(output, 'latin1');
}

export function buildWaitingTicketsPdf(
  dashboard: TicketAvailabilityResponse,
): Buffer {
  const allWaiting = dashboard.holds.flatMap((group) =>
    group.tickets.map((ticket) => ({ cause: group.cause, ticket })),
  );

  const lines: string[] = [
    'RELATORIO DE ATENDIMENTOS EM ESPERA',
    `Gerado em: ${dashboard.generatedAt.replace('T', ' ')}`,
    `Total em espera: ${allWaiting.length}`,
    '',
  ];

  if (allWaiting.length === 0) {
    lines.push('Nenhum atendimento em espera no momento.');
  } else {
    let currentCause = '';

    for (const { cause, ticket } of allWaiting) {
      if (cause !== currentCause) {
        currentCause = cause;
        lines.push('', `CAUSA: ${cause}`);
      }

      lines.push(
        `Atd #${ticket.id} | Tecnico: ${ticket.technicianName ?? 'Nao atribuido'} | Espera: ${ticket.waitingCount}x | Cliente: ${ticket.clientName ?? 'Nao informado'}`,
      );

      const description =
        ticket.holdDescription?.trim() || 'Sem descricao informada.';
      for (const line of wrap(`Ultima descricao: ${description}`)) {
        lines.push(`  ${line}`);
      }
    }
  }

  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += LINES_PER_PAGE) {
    const page = lines.slice(index, index + LINES_PER_PAGE);
    pages.push([
      ...page,
      '',
      `Pagina ${pages.length + 1}`,
    ]);
  }

  return pdfFromPages(pages.length ? pages : [['Sem dados.']]);
}
