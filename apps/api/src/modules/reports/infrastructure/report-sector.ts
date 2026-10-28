import { BadRequestException } from '@nestjs/common';
import type { ReportSector } from '@helpdesk/contracts';

const FUNCTIONS = {
  ti: ['gestor ti', 'analista ti', 'tecnico ti'],
  devops: ['gestor devops', 'analista devops', 'tecnico devops'],
} as const;

export function reportSector(value: unknown): ReportSector {
  if (value === undefined || value === '' || value === 'all') return 'all';
  if (value === 'ti' || value === 'devops') return value;
  throw new BadRequestException('Setor inválido. Selecione Todos, TI ou DevOps.');
}

export function sectorFunctionNames(sector: ReportSector): readonly string[] {
  return sector === 'all' ? [...FUNCTIONS.ti, ...FUNCTIONS.devops] : FUNCTIONS[sector];
}

// Fixed identifiers only; names remain bound parameters. Ignore accents in Técnico.
export const NORMALIZED_REPORT_FUNCTION = "REPLACE(LOWER(TRIM(rs_role.cargo_nome)), 'é', 'e')";

export function appendReportSector(where: string[], params: unknown[], value: ReportSector | undefined, technicianColumn = 'a.tecnico', onlyTechnicians = false) {
  const sector = reportSector(value);
  if (sector === 'all' && !onlyTechnicians) return;
  const names = sectorFunctionNames(sector);
  where.push(`EXISTS (SELECT 1 FROM usuarios rs_user INNER JOIN cargos_n3 rs_role ON rs_role.cargo_id = rs_user.user_funcao WHERE rs_user.user_id = ${technicianColumn} AND ${NORMALIZED_REPORT_FUNCTION} IN (${names.map(() => '?').join(', ')}))`);
  params.push(...names);
}
