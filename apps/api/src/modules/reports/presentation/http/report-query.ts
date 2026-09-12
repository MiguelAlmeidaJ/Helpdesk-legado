import { BadRequestException } from '@nestjs/common';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
type TicketReportLevel = 0 | 1 | 2 | 3;

interface ParsedReportQuery {
  startDate: string;
  endDate: string;
  level: TicketReportLevel;
}

function dateQuery(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BadRequestException(`${field} deve usar o formato YYYY-MM-DD.`);
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${field} deve ser uma data válida.`);
  }

  return value;
}

function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function levelQuery(value: string | undefined): TicketReportLevel {
  if (value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);

  if (typeof value !== 'string' || !/^[0-3]$/.test(value) || ![0, 1, 2, 3].includes(parsed)) {
    throw new BadRequestException('level deve ser 0, 1, 2 ou 3.');
  }

  return parsed as TicketReportLevel;
}

export function parseReportQuery(
  startDate?: string,
  endDate?: string,
  level?: string,
): ParsedReportQuery {
  const today = todayInSaoPaulo();
  const effectiveStartDate =
    dateQuery(startDate, 'startDate') ?? `${today.slice(0, 7)}-01`;
  const effectiveEndDate = dateQuery(endDate, 'endDate') ?? today;

  if (effectiveStartDate > effectiveEndDate) {
    throw new BadRequestException(
      'startDate deve ser anterior ou igual a endDate.',
    );
  }

  return {
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    level: levelQuery(level),
  };
}

