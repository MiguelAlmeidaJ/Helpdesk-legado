interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const LEGACY_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

function parseDateTime(value: string): Date | null {
  const match = LEGACY_DATE_TIME.exec(value.trim());

  if (!match) {
    return null;
  }

  const parts: DateParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
  };

  const date = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );

  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day ||
    date.getUTCHours() !== parts.hour ||
    date.getUTCMinutes() !== parts.minute ||
    date.getUTCSeconds() !== parts.second
  ) {
    return null;
  }

  return date;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateTime(date: Date): string {
  return [
    date.getUTCFullYear(),
    '-',
    twoDigits(date.getUTCMonth() + 1),
    '-',
    twoDigits(date.getUTCDate()),
    ' ',
    twoDigits(date.getUTCHours()),
    ':',
    twoDigits(date.getUTCMinutes()),
    ':',
    twoDigits(date.getUTCSeconds()),
  ].join('');
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function calculateMonthlyWeekday(
  source: Date,
  rawWeek: string | null,
): Date {
  const weekday = source.getUTCDay();
  const hour = source.getUTCHours();
  const minute = source.getUTCMinutes();
  const second = source.getUTCSeconds();
  const weekValue = rawWeek?.trim() ?? '';
  const useLastWeek =
    weekValue === '' ||
    weekValue === '0' ||
    weekValue.toLocaleLowerCase('pt-BR') === 'ultima';

  const baseMonth = new Date(source.getTime());
  baseMonth.setUTCDate(1);
  baseMonth.setUTCMonth(baseMonth.getUTCMonth() + 1);
  baseMonth.setUTCHours(hour, minute, second, 0);

  if (useLastWeek) {
    const result = new Date(baseMonth.getTime());
    result.setUTCMonth(result.getUTCMonth() + 1);
    result.setUTCDate(0);

    while (result.getUTCDay() !== weekday) {
      result.setUTCDate(result.getUTCDate() - 1);
    }

    result.setUTCHours(hour, minute, second, 0);
    return result;
  }

  const parsedWeek = Number.parseInt(weekValue, 10);
  const fallbackWeek = Math.ceil(source.getUTCDate() / 7);
  const selectedWeek = Math.max(
    1,
    Math.min(5, parsedWeek >= 1 ? parsedWeek : fallbackWeek),
  );

  const result = new Date(baseMonth.getTime());

  while (result.getUTCDay() !== weekday) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  if (selectedWeek > 1) {
    result.setUTCDate(result.getUTCDate() + (selectedWeek - 1) * 7);
  }

  if (result.getUTCMonth() !== baseMonth.getUTCMonth()) {
    result.setUTCDate(result.getUTCDate() - 7);
  }

  result.setUTCHours(hour, minute, second, 0);
  return result;
}

export function calculateNextTicketRecurrence(
  recurrenceAt: string,
  recurrenceRule: number,
  week: string | null,
): string | null {
  const source = parseDateTime(recurrenceAt);

  if (!source) {
    return null;
  }

  let result: Date;

  switch (recurrenceRule) {
    case 1:
      result = addDays(source, 1);
      break;
    case 6:
      result = addDays(source, 7);
      break;
    case 2:
      result = addMonths(source, 1);
      break;
    case 3:
      result = addMonths(source, 3);
      break;
    case 4:
      result = addMonths(source, 6);
      break;
    case 5:
      result = addMonths(source, 12);
      break;
    case 7:
      result = calculateMonthlyWeekday(source, week);
      break;
    default:
      return null;
  }

  return formatDateTime(result);
}
