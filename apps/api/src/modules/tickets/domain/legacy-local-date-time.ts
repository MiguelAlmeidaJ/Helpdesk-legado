const LEGACY_LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function normalizeLegacyLocalDateTime(value: string): string | null {
  const match = LEGACY_LOCAL_DATE_TIME.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const validation = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    validation.getUTCFullYear() !== year ||
    validation.getUTCMonth() !== month - 1 ||
    validation.getUTCDate() !== day ||
    validation.getUTCHours() !== hour ||
    validation.getUTCMinutes() !== minute ||
    validation.getUTCSeconds() !== second
  ) return null;

  const two = (part: number) => String(part).padStart(2, '0');
  return `${year}-${two(month)}-${two(day)}T${two(hour)}:${two(minute)}:${two(second)}`;
}

export function legacyLocalDateTimeDisplay(value: string): string {
  const normalized = normalizeLegacyLocalDateTime(value);
  if (!normalized) return value;
  return `${normalized.slice(8, 10)}/${normalized.slice(5, 7)}/${normalized.slice(0, 4)} ${normalized.slice(11, 16)}`;
}

export function recurrenceWeekForLegacy(recurrenceAt: string, rule: number): number | null {
  if (rule !== 7) return null;
  const normalized = normalizeLegacyLocalDateTime(recurrenceAt);
  if (!normalized) return null;
  const week = Math.ceil(Number(normalized.slice(8, 10)) / 7);
  return week > 4 ? 0 : week;
}
