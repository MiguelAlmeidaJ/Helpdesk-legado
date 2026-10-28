'use client';

import type { ReportSector, ReportSectorCoverage, TicketReportCatalog } from '@helpdesk/contracts';

export function sectorTechnicians(catalog: TicketReportCatalog, sector: ReportSector) {
  return catalog.technicians.filter(technician => sector === 'all' || technician.sector === sector);
}

export function ReportSectorSummary({ value, coverage }: { value?: ReportSector; coverage?: ReportSectorCoverage }) {
  return <div className="mb-3 text-xs text-app-muted">
    <p className="mb-1 mt-0 font-semibold">Setor: {value === 'ti' ? 'TI' : value === 'devops' ? 'DevOps' : 'Todos'}</p>
    {coverage && coverage.total > 0 ? <div data-sector-coverage>
      <p className="m-0 flex flex-wrap gap-x-4 gap-y-1"><span>Total: {coverage.total.toLocaleString('pt-BR')}</span><span>TI: {coverage.ti.toLocaleString('pt-BR')}</span><span>DevOps: {coverage.devops.toLocaleString('pt-BR')}</span><span>Outras funções: {coverage.other.toLocaleString('pt-BR')}</span><span>Sem técnico localizado: {coverage.unassigned.toLocaleString('pt-BR')}</span></p>
      {value === 'all' && coverage.other + coverage.unassigned > 0 ? <p className="mb-0 mt-2">Todos inclui chamados sem técnico e funções fora da classificação de TI e DevOps.</p> : null}
    </div> : null}
  </div>;
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
