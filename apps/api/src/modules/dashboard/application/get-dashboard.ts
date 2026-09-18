import { Injectable } from '@nestjs/common';
import type { OperationalDashboardResponse } from '@helpdesk/contracts';
import {
  DashboardRepository,
  type DashboardQuery,
} from './ports/dashboard.repository';

@Injectable()
export class GetDashboard {
  constructor(private readonly repository: DashboardRepository) {}

  execute(query: DashboardQuery): Promise<OperationalDashboardResponse> {
    return this.repository.get(query);
  }
}
