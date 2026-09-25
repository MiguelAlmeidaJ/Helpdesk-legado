'use client';

import type {
  CurrentUserResponse,
  TicketClientTotalsReportResponse,
} from '@helpdesk/contracts';
import { fetchTicketClientTotalsReport } from '../api/reports-api';
import {
  TicketTotalsReportScreen,
  type TicketTotalsReportFilters,
  type TicketTotalsReportViewResponse,
} from './ticket-totals-report-screen';

async function loadClientReport(
  filters: TicketTotalsReportFilters = {},
): Promise<TicketTotalsReportViewResponse> {
  const response: TicketClientTotalsReportResponse =
    await fetchTicketClientTotalsReport(filters);

  return {
    period: response.period,
    level: response.level,
    total: response.total,
    rows: response.rows.map((row) => ({
      id: row.clientId,
      name: row.clientName,
      level1: row.level1,
      level2: row.level2,
      level3: row.level3,
      total: row.total,
    })),
  };
}

export function TicketClientTotalsReportScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  return (
    <TicketTotalsReportScreen
      currentUser={currentUser}
      title="Total por cliente"
      description="Conta os atendimentos abertos no período, desconsiderando os agendados e agrupando os níveis 1, 2 e 3 por cliente."
      emptyMessage="Nenhum atendimento encontrado para os filtros informados."
      loadErrorMessage="Não foi possível carregar o relatório por cliente."
      loadReport={loadClientReport}
    />
  );
}
