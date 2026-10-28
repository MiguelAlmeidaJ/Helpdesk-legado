'use client';

import type { ReportSector, TicketReportCatalog } from '@helpdesk/contracts';

export function sectorTechnicians(catalog: TicketReportCatalog, sector: ReportSector) {
  return catalog.technicians.filter(technician => sector === 'all' || technician.sector === sector);
}

export function ReportSectorSummary({ value }: { value?: ReportSector }) {
  return <p className="mb-3 mt-0 text-xs font-semibold text-app-muted">Setor: {value === 'ti' ? 'TI' : value === 'devops' ? 'DevOps' : 'Todos'}</p>;
}

export function ReportSectorFilter({ value, onChange, disabled = false }: {
  value: ReportSector; onChange: (value: ReportSector) => void; disabled?: boolean;
}) {
  return <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">
    <span>Setor</span>
    <select aria-label="Setor" value={value} disabled={disabled} onChange={event => onChange(event.target.value as ReportSector)} className="min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text focus-visible:outline-2 focus-visible:outline-app-brand disabled:opacity-50">
      <option value="all">Todos</option><option value="ti">TI</option><option value="devops">DevOps</option>
    </select>
  </label>;
}
