import { Injectable } from '@nestjs/common';
import { GeneratedReportStorage } from './ports/generated-report-storage';
import { DAY_MS, reportRetentionDays } from './report-retention';

export { DEFAULT_REPORT_RETENTION_DAYS, reportRetentionDays } from './report-retention';

@Injectable()
export class CleanupExpiredReports {
  constructor(private readonly storage: GeneratedReportStorage) {}

  async execute(now = new Date()) {
    const retentionDays = reportRetentionDays(process.env.REPORT_RETENTION_DAYS);
    const before = new Date(now.getTime() - retentionDays * DAY_MS);
    const removed = await this.storage.removeExpired(before);

    return {
      removed,
      retentionDays,
      before,
    };
  }
}
