export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_REPORT_RETENTION_DAYS = 15;
const MAX_REPORT_RETENTION_DAYS = 365;

export function reportRetentionDays(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_REPORT_RETENTION_DAYS;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_REPORT_RETENTION_DAYS) {
    return DEFAULT_REPORT_RETENTION_DAYS;
  }

  return parsed;
}
