import { BadRequestException } from '@nestjs/common';
import type {
  SortDirection,
  TicketProjectFilters,
  TicketProjectSort,
  TicketProjectStatus,
  TicketProjectTaskFilters,
  TicketProjectTaskSort,
} from '@helpdesk/contracts';

export interface ParsedTicketProjectQuery<TFilters> {
  page: number;
  limit: number;
  filters: TFilters;
}

const ACTIVE_STATUSES: TicketProjectStatus[] = [1, 2, 3];
const ALL_STATUSES: TicketProjectStatus[] = [0, 1, 2, 3, 4];

const PROJECT_SORTS = new Set<TicketProjectSort>([
  'id',
  'client',
  'openedAt',
  'level',
  'form',
  'technician',
  'status',
]);

const TASK_SORTS = new Set<TicketProjectTaskSort>([
  ...PROJECT_SORTS,
  'project',
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

function statuses(value: unknown): TicketProjectStatus[] {
  const text = textValue(value);

  if (!text) {
    return [...ACTIVE_STATUSES];
  }

  if (text.toLowerCase() === 'all') {
    return [...ALL_STATUSES];
  }

  const values = (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (!/^\d+$/.test(item)) {
        throw new BadRequestException('status contém um valor inválido.');
      }
      return Number(item);
    });

  if (values.length === 0 || values.some((item) => item < 0 || item > 4)) {
    throw new BadRequestException('status deve conter valores entre 0 e 4.');
  }

  return [...new Set(values)] as TicketProjectStatus[];
}

function direction(value: unknown): SortDirection {
  const text = textValue(value)?.toLowerCase();

  if (!text) {
    return 'asc';
  }

  if (text !== 'asc' && text !== 'desc') {
    throw new BadRequestException('direction deve ser asc ou desc.');
  }

  return text;
}

function baseQuery(query: Record<string, unknown>) {
  const page = positiveInteger(query.page, 'page', 1) ?? 1;
  const limit = positiveInteger(query.limit, 'limit', 30) ?? 30;

  if (limit > 100) {
    throw new BadRequestException('limit deve ser no máximo 100.');
  }

  return {
    page,
    limit,
    statuses: statuses(query.status),
    clientId: positiveInteger(query.clientId, 'clientId'),
    requesterId: positiveInteger(query.requesterId, 'requesterId'),
    technicianId: positiveInteger(query.technicianId, 'technicianId'),
    id: positiveInteger(query.id, 'id'),
    search: textValue(query.search),
    openedFrom: optionalDate(query.openedFrom, 'openedFrom'),
    openedTo: optionalDate(query.openedTo, 'openedTo'),
    direction: direction(query.direction),
  };
}

export function parseTicketProjectQuery(
  query: Record<string, unknown>,
): ParsedTicketProjectQuery<TicketProjectFilters> {
  const base = baseQuery(query);
  const sort = (textValue(query.sort) ?? 'status') as TicketProjectSort;

  if (!PROJECT_SORTS.has(sort)) {
    throw new BadRequestException('sort contém uma coluna inválida.');
  }

  return {
    page: base.page,
    limit: base.limit,
    filters: {
      statuses: base.statuses,
      clientId: base.clientId,
      requesterId: base.requesterId,
      technicianId: base.technicianId,
      id: base.id,
      search: base.search,
      openedFrom: base.openedFrom,
      openedTo: base.openedTo,
      sort,
      direction: base.direction,
    },
  };
}

export function parseTicketProjectTaskQuery(
  query: Record<string, unknown>,
  projectId?: number,
): ParsedTicketProjectQuery<TicketProjectTaskFilters> {
  const base = baseQuery(query);
  const sort = (textValue(query.sort) ?? 'status') as TicketProjectTaskSort;

  if (!TASK_SORTS.has(sort)) {
    throw new BadRequestException('sort contém uma coluna inválida.');
  }

  return {
    page: base.page,
    limit: base.limit,
    filters: {
      statuses: base.statuses,
      clientId: base.clientId,
      requesterId: base.requesterId,
      technicianId: base.technicianId,
      id: base.id,
      projectId,
      search: base.search,
      openedFrom: base.openedFrom,
      openedTo: base.openedTo,
      sort,
      direction: base.direction,
    },
  };
}
