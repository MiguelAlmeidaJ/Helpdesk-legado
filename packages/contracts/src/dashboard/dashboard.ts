export type DashboardRankingId = 'ti' | 'devops' | 'mkt' | 'qa';

export interface DashboardPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

export interface DashboardRankingEntry {
  name: string;
  total: number;
  tickets?: number;
  tasks?: number;
}

export interface DashboardRanking {
  id: DashboardRankingId;
  label: string;
  total: number;
  entries: DashboardRankingEntry[];
}

export interface OperationalDashboardResponse {
  generatedAt: string;
  internalUser: boolean;
  period: DashboardPeriod;
  quarter: DashboardPeriod & {
    number: number;
  };
  periodRankings: DashboardRanking[];
  quarterRankings: DashboardRanking[];
}
