import { Injectable } from '@nestjs/common';
import type { TicketAnalyticsFilters } from '@helpdesk/contracts';
import { TicketAnalyticsRepository } from './ports/ticket-analytics.repository';

@Injectable()
export class GetTicketAnalytics {
  constructor(private readonly repository: TicketAnalyticsRepository) {}
  analytics(userId: number, filters: TicketAnalyticsFilters) { return this.repository.analytics(userId, filters); }
  catalog(userId: number, clientId: number) { return this.repository.catalog(userId, clientId); }
  workload(userId: number) { return this.repository.workload(userId); }
}
