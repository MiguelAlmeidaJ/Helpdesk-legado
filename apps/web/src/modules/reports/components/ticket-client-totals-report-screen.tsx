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
      focus="client"
      title="Relatório de atendimentos por Cliente"
      description="Filtre por período e nível para comparar o volume de chamados entre clientes."
      chartTitle="Atendimentos por Cliente"
      emptyMessage="Nenhum atendimento encontrado para os filtros informados."
      loadErrorMessage="Não foi possível carregar o relatório por cliente."
      loadReport={loadClientReport}
    />
  );
}
