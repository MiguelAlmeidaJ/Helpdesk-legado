import { Injectable } from '@nestjs/common';
import { ReportArchiveRepository } from './ports/report-archive.repository';

const DAY_MS = 24 * 60 * 60 * 1000;
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

@Injectable()
export class CleanupExpiredReports {
  constructor(private readonly archive: ReportArchiveRepository) {}

  async execute(now = new Date()) {
    const retentionDays = reportRetentionDays(process.env.REPORT_RETENTION_DAYS);
    const before = new Date(now.getTime() - retentionDays * DAY_MS);
    const removed = await this.archive.removeExpired(before);

    return {
      removed,
      retentionDays,
      before,
    };
  }
}
