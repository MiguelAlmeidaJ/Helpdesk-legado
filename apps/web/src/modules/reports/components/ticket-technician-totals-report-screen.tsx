'use client';

import type {
  CurrentUserResponse,
  TicketTechnicianTotalsReportResponse,
} from '@helpdesk/contracts';
import { fetchTicketTechnicianTotalsReport } from '../api/reports-api';
import {
  TicketTotalsReportScreen,
  type TicketTotalsReportFilters,
  type TicketTotalsReportViewResponse,
} from './ticket-totals-report-screen';

async function loadTechnicianReport(
  filters: TicketTotalsReportFilters = {},
): Promise<TicketTotalsReportViewResponse> {
  const response: TicketTechnicianTotalsReportResponse =
    await fetchTicketTechnicianTotalsReport(filters);

  return {
    period: response.period,
    level: response.level,
    total: response.total,
    rows: response.rows.map((row) => ({
      id: row.technicianId,
      name: row.technicianName,
      level1: row.level1,
      level2: row.level2,
      level3: row.level3,
      total: row.total,
    })),
  };
}

export function TicketTechnicianTotalsReportScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  return (
    <TicketTotalsReportScreen
      currentUser={currentUser}
      title="Total por técnico"
      description="Conta os atendimentos abertos no período, desconsiderando os agendados e agrupando os níveis 1, 2 e 3 por técnico."
      emptyMessage="Nenhum atendimento por técnico encontrado para os filtros informados."
      loadErrorMessage="Não foi possível carregar o relatório por técnico."
      loadReport={loadTechnicianReport}
    />
  );
}
