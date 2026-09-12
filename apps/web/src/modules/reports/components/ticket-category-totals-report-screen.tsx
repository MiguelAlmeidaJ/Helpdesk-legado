'use client';

import type {
  CurrentUserResponse,
  TicketCategoryTotalsReportResponse,
} from '@helpdesk/contracts';
import { fetchTicketCategoryTotalsReport } from '../api/reports-api';
import {
  TicketTotalsReportScreen,
  type TicketTotalsReportFilters,
  type TicketTotalsReportViewResponse,
} from './ticket-totals-report-screen';

async function loadCategoryReport(
  filters: TicketTotalsReportFilters = {},
): Promise<TicketTotalsReportViewResponse> {
  const response: TicketCategoryTotalsReportResponse =
    await fetchTicketCategoryTotalsReport(filters);

  return {
    period: response.period,
    level: response.level,
    total: response.total,
    rows: response.rows.map((row) => ({
      id: row.categoryId,
      name: row.categoryName,
      level1: row.level1,
      level2: row.level2,
      level3: row.level3,
      total: row.total,
    })),
  };
}

export function TicketCategoryTotalsReportScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  return (
    <TicketTotalsReportScreen
      currentUser={currentUser}
      title="Total por categoria"
      description="Conta os atendimentos abertos no período, desconsiderando os agendados e agrupando os níveis 1, 2 e 3 por categoria."
      emptyMessage="Nenhum atendimento por categoria encontrado para os filtros informados."
      loadErrorMessage="Não foi possível carregar o relatório por categoria."
      loadReport={loadCategoryReport}
    />
  );
}
