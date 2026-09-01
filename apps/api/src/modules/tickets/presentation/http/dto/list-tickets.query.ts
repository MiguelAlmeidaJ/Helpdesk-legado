import { BadRequestException } from '@nestjs/common';
import {
  TicketStatus,
  type SortDirection,
  type TicketListFilters,
  type TicketListSort,
} from '@helpdesk/contracts';

export interface ParsedTicketListQuery {
  page: number;
  limit: number;
  filters: TicketListFilters;
}

const DEFAULT_STATUSES = [
  TicketStatus.WaitingExecution,
  TicketStatus.InProgress,
  TicketStatus.OnHold,
  TicketStatus.Completed,
];

const DEFAULT_TYPES = [0, 1, 2, 3, 4, 5, 6];

const ALLOWED_SORTS = new Set<TicketListSort>([
  'id',
  'client',
  'openedAt',
  'level',
  'priority',
  'technician',
  'status',
]);

function textValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  if (Array.isArray(value) && value.length > 0) {
    return textValue(value[0]);
  }

  return undefined;
}

function positiveInteger(
  value: unknown,
  name: string,
  fallback?: number,
): number | undefined {
  const text = textValue(value);

  if (text === undefined) {
    return fallback;
  }

  if (!/^\d+$/.test(text)) {
    throw new BadRequestException(`${name} deve ser um número inteiro.`);
  }

  const parsed = Number(text);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${name} deve ser maior que zero.`);
  }

  return parsed;
}

function integerList(
  value: unknown,
  name: string,
  fallback: number[],
): number[] {
  if (value === undefined || value === null || value === '') {
    return [...fallback];
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const items = rawValues
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return [...fallback];
  }

  const parsed = items.map((item) => {
    if (!/^\d+$/.test(item)) {
      throw new BadRequestException(`${name} contém um valor inválido.`);
    }

    return Number(item);
  });

  return [...new Set(parsed)];
}

function optionalDate(value: unknown, name: string): string | undefined {
  const text = textValue(value);

  if (!text) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new BadRequestException(`${name} deve usar o formato YYYY-MM-DD.`);
  }

  const date = new Date(`${text}T00:00:00Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new BadRequestException(`${name} contém uma data inválida.`);
  }

  return text;
}

function statuses(value: unknown): TicketStatus[] {
  const values = integerList(
    value,
    'status',
    DEFAULT_STATUSES,
  );

  for (const status of values) {
    if (status < TicketStatus.Scheduled || status > TicketStatus.Completed) {
      throw new BadRequestException('status deve conter valores entre 0 e 5.');
    }
  }

  return values as TicketStatus[];
}

function sortValue(value: unknown): TicketListSort {
  const text = textValue(value) as TicketListSort | undefined;

  if (!text) {
    return 'openedAt';
  }

  if (!ALLOWED_SORTS.has(text)) {
    throw new BadRequestException('sort contém uma coluna inválida.');
  }

  return text;
}

function directionValue(value: unknown): SortDirection {
  const text = textValue(value)?.toLowerCase();

  if (!text) {
    return 'desc';
  }

  if (text !== 'asc' && text !== 'desc') {
    throw new BadRequestException('direction deve ser asc ou desc.');
  }

  return text;
}

export function parseTicketListQuery(
  query: Record<string, unknown>,
): ParsedTicketListQuery {
  const page = positiveInteger(query.page, 'page', 1) ?? 1;
  const limit = positiveInteger(query.limit, 'limit', 50) ?? 50;

  if (limit > 100) {
    throw new BadRequestException('limit deve ser no máximo 100.');
  }

  const ticketId = positiveInteger(query.id, 'id');
  const clientId = positiveInteger(query.clientId, 'clientId');
  const requesterId = positiveInteger(query.requesterId, 'requesterId');

  return {
    page,
    limit,
    filters: {
      statuses: ticketId
        ? [
            TicketStatus.Scheduled,
            TicketStatus.WaitingExecution,
            TicketStatus.InProgress,
            TicketStatus.OnHold,
            TicketStatus.Finished,
            TicketStatus.Completed,
          ]
        : statuses(query.status),
      clientId,
      requesterId: clientId ? requesterId : undefined,
      ticketId,
      search: textValue(query.search),
      typeIds: integerList(query.type, 'type', DEFAULT_TYPES),
      technicianIds: integerList(query.technicianId, 'technicianId', []),
      openedFrom: optionalDate(query.openedFrom, 'openedFrom'),
      openedTo: optionalDate(query.openedTo, 'openedTo'),
      sort: sortValue(query.sort),
      direction: directionValue(query.direction),
    },
  };
}
