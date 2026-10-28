import type { TicketAnalyticsRow } from '@helpdesk/contracts';
import type { ReportStackedBarRow } from '../components/report-stacked-bar-chart';

export type ReportGrouping = 'client' | 'technician' | 'category' | 'requester' | 'client-daily' | 'technician-daily' | 'project' | 'status';
export type ReportGroup = ReportStackedBarRow & { date?: string };

export function groupReportRows(rows: TicketAnalyticsRow[], grouping: ReportGrouping): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  for (const row of rows) {
    const day = row.openedAt.slice(0, 10);
    let key: string, label: string;
    switch (grouping) {
      case 'technician': case 'technician-daily': key = String(row.technicianId ?? row.technicianName); label = row.technicianName || 'Sem técnico'; break;
      case 'requester': key = String(row.requesterId ?? row.requesterName ?? 'none'); label = row.requesterName || 'Sem solicitante'; break;
      case 'category': key = String(row.categoryId ?? row.categoryName ?? 'none'); label = row.categoryName || 'Sem categoria'; break;
      case 'project': key = String(row.projectId || 'none'); label = row.projectName || 'Sem projeto associado'; break;
      case 'status': key = String(row.status); label = key; break;
      default: key = String(row.clientId); label = row.clientName || 'Sem cliente';
    }
    const daily = grouping === 'client-daily' || grouping === 'technician-daily';
    if (daily) key = `${day}:${key}`;
    const current = groups.get(key) ?? { key, label, ...(daily ? { date: day } : {}), level1: 0, level2: 0, level3: 0, other: 0, total: 0 };
    current.total++;
    if (row.level === 1) current.level1++;
    else if (row.level === 2) current.level2++;
    else if (row.level === 3) current.level3++;
    else current.other = (current.other ?? 0) + 1;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => a.date && b.date ? a.date.localeCompare(b.date) || a.label.localeCompare(b.label, 'pt-BR') : b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
}

export function reportChartGroups(groups: ReportGroup[]): ReportStackedBarRow[] {
  const sorted = [...groups].sort((a, b) => b.total - a.total);
  const label = (row: ReportGroup) => ({ ...row, label: row.date ? `${row.date.split('-').reverse().join('/')} · ${row.label}` : row.label });
  if (sorted.length <= 20) return groups.map(label);
  const remaining = sorted.slice(20);
  return [...sorted.slice(0, 20).map(label), {
    key: '__remaining__', label: 'Demais grupos',
    level1: remaining.reduce((sum, row) => sum + row.level1, 0),
    level2: remaining.reduce((sum, row) => sum + row.level2, 0),
    level3: remaining.reduce((sum, row) => sum + row.level3, 0),
    other: remaining.reduce((sum, row) => sum + (row.other ?? 0), 0),
    total: remaining.reduce((sum, row) => sum + row.total, 0),
  }];
}
