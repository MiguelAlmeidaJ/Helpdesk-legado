import { Inject, Injectable } from '@nestjs/common';
import type {
  DashboardPeriod,
  DashboardRanking,
  DashboardRankingEntry,
  DashboardRankingId,
  OperationalDashboardResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import {
  DashboardRepository,
  type DashboardQuery,
} from '../application/ports/dashboard.repository';

interface ClockRow {
  dashboard_date: string;
  generated_at: string;
}

interface UserTypeRow {
  user_type: number | null;
}

interface RankingRow {
  name: string | null;
  total: bigint | number;
  tickets?: bigint | number | null;
  tasks?: bigint | number | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function monthEnd(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateParts(value: string): { year: number; month: number; day: number } {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return { year, month, day };
}

function formatBr(value: string): string {
  const { year, month, day } = dateParts(value);
  return `${pad(day)}/${pad(month)}/${year}`;
}

function normalizeEntry(row: RankingRow): DashboardRankingEntry {
  const tickets = row.tickets == null ? undefined : Number(row.tickets);
  const tasks = row.tasks == null ? undefined : Number(row.tasks);

  return {
    name: row.name?.trim() || 'Não informado',
    total: Number(row.total ?? 0),
    ...(tickets === undefined ? {} : { tickets }),
    ...(tasks === undefined ? {} : { tasks }),
  };
}

function ranking(
  id: DashboardRankingId,
  label: string,
  rows: RankingRow[],
): DashboardRanking {
  const entries = rows.map(normalizeEntry);

  return {
    id,
    label,
    total: entries.reduce((sum, entry) => sum + entry.total, 0),
    entries,
  };
}

@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async get(query: DashboardQuery): Promise<OperationalDashboardResponse> {
    const clockRows = await this.database.$queryRawUnsafe<ClockRow[]>(
      `SELECT
         DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS dashboard_date,
         DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') AS generated_at`,
    );
    const clock = clockRows[0];
    const currentDate = clock?.dashboard_date ?? new Date().toISOString().slice(0, 10);
    const generatedAt = clock?.generated_at ?? new Date().toISOString();

    const { year, month } = dateParts(currentDate);
    const defaultStart = `${year}-${pad(month)}-01`;
    const defaultEnd = `${year}-${pad(month)}-${pad(monthEnd(year, month))}`;

    let startDate = query.startDate ?? defaultStart;
    let endDate = query.endDate ?? defaultEnd;
    if (startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }

    const quarterNumber = Math.ceil(month / 3);
    const quarterStartMonth = (quarterNumber - 1) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;
    const quarterStart = `${year}-${pad(quarterStartMonth)}-01`;
    const quarterEnd =
      `${year}-${pad(quarterEndMonth)}-${pad(monthEnd(year, quarterEndMonth))}`;

    const period: DashboardPeriod = {
      startDate,
      endDate,
      label: `${formatBr(startDate)} - ${formatBr(endDate)}`,
    };
    const quarter: DashboardPeriod & { number: number } = {
      startDate: quarterStart,
      endDate: quarterEnd,
      label: `${quarterNumber}º trimestre ${year}`,
      number: quarterNumber,
    };

    const typeRows = await this.database.$queryRawUnsafe<UserTypeRow[]>(
      'SELECT tipo_usuario AS user_type FROM usuarios WHERE user_id = ? LIMIT 1',
      query.userId,
    );
    const internalUser = Number(typeRows[0]?.user_type ?? 0) === 1;

    if (!internalUser) {
      return {
        generatedAt,
        internalUser: false,
        period,
        quarter,
        periodRankings: [],
        quarterRankings: [],
      };
    }

    const startDateTime = `${startDate} 00:00:00`;
    const endDateTime = `${endDate} 23:59:59`;
    const quarterStartDateTime = `${quarterStart} 00:00:00`;
    const quarterEndDateTime = `${quarterEnd} 23:59:59`;

    const [
      tiPeriod,
      devopsPeriod,
      mktPeriod,
      qaPeriod,
      tiQuarter,
      devopsQuarter,
      mktQuarter,
      qaQuarter,
    ] = await Promise.all([
      this.tiRanking(startDateTime, endDateTime, false),
      this.devopsRanking(startDateTime, endDateTime, false),
      this.mktRanking(startDateTime, endDateTime, false),
      this.qaRanking(startDateTime, endDateTime, false),
      this.tiRanking(quarterStartDateTime, quarterEndDateTime, true),
      this.devopsRanking(quarterStartDateTime, quarterEndDateTime, true),
      this.mktRanking(quarterStartDateTime, quarterEndDateTime, true),
      this.qaRanking(quarterStartDateTime, quarterEndDateTime, true),
    ]);

    return {
      generatedAt,
      internalUser: true,
      period,
      quarter,
      periodRankings: [
        ranking('ti', 'TI', tiPeriod),
        ranking('devops', 'DevOps', devopsPeriod),
        ranking('mkt', 'MKT', mktPeriod),
        ranking('qa', 'QA - Abertura de Atd', qaPeriod),
      ],
      quarterRankings: [
        ranking('ti', 'TI', tiQuarter),
        ranking('devops', 'DevOps', devopsQuarter),
        ranking('mkt', 'MKT', mktQuarter),
        ranking('qa', 'QA - Abertura de Atd', qaQuarter),
      ],
    };
  }

  private tiRanking(
    start: string,
    end: string,
    topThree: boolean,
  ): Promise<RankingRow[]> {
    const functions = topThree ? '1, 2, 3, 4, 5, 6' : '1, 2, 4, 5, 6';
    const limit = topThree ? ' LIMIT 3' : '';

    return this.database.$queryRawUnsafe<RankingRow[]>(
      `SELECT u.user_nome AS name, COUNT(a.id) AS total
       FROM atendimentos a
       JOIN usuarios u ON a.tecnico = u.user_id
       WHERE u.user_funcao IN (${functions})
         AND u.user_sts = 1
         AND a.status IN (4, 5)
         AND a.abertura BETWEEN ? AND ?
       GROUP BY u.user_id, u.user_nome
       ORDER BY total DESC${limit}`,
      start,
      end,
    );
  }

  private devopsRanking(
    start: string,
    end: string,
    topThree: boolean,
  ): Promise<RankingRow[]> {
    const limit = topThree ? ' LIMIT 3' : '';

    return this.database.$queryRawUnsafe<RankingRow[]>(
      `SELECT
         combined.name,
         SUM(combined.tickets) AS tickets,
         SUM(combined.tasks) AS tasks,
         SUM(combined.tickets + combined.tasks) AS total
       FROM (
         SELECT
           u.user_nome AS name,
           COUNT(a.id) AS tickets,
           0 AS tasks
         FROM atendimentos a
         JOIN usuarios u ON a.tecnico = u.user_id
         WHERE u.user_funcao BETWEEN 9 AND 14
           AND u.user_sts = 1
           AND a.status IN (4, 5)
           AND a.abertura BETWEEN ? AND ?
         GROUP BY u.user_id, u.user_nome

         UNION ALL

         SELECT
           u.user_nome AS name,
           0 AS tickets,
           COUNT(t.id) AS tasks
         FROM tarefas t
         JOIN usuarios u ON t.tecnico = u.user_id
         WHERE u.user_funcao BETWEEN 9 AND 14
           AND u.user_sts = 1
           AND t.status IN (4, 5)
           AND t.fechamento BETWEEN ? AND ?
         GROUP BY u.user_id, u.user_nome
       ) combined
       GROUP BY combined.name
       ORDER BY total DESC${limit}`,
      start,
      end,
      start,
      end,
    );
  }

  private mktRanking(
    start: string,
    end: string,
    topThree: boolean,
  ): Promise<RankingRow[]> {
    const limit = topThree ? ' LIMIT 3' : '';

    return this.database.$queryRawUnsafe<RankingRow[]>(
      `SELECT u.user_nome AS name, COUNT(t.id) AS total
       FROM tarefas_terc_andar t
       JOIN usuarios u ON t.tecnico = u.user_id
       WHERE u.user_sts = 1
         AND t.status IN (4, 5)
         AND t.fechamento BETWEEN ? AND ?
       GROUP BY u.user_id, u.user_nome
       ORDER BY total DESC${limit}`,
      start,
      end,
    );
  }

  private qaRanking(
    start: string,
    end: string,
    topThree: boolean,
  ): Promise<RankingRow[]> {
    if (topThree) {
      return this.database.$queryRawUnsafe<RankingRow[]>(
        `SELECT
           CASE
             WHEN u.user_funcao = 7 THEN u.user_nome
             ELSE 'Outros Colaboradores'
           END AS name,
           COUNT(*) AS total
         FROM (
           SELECT inter_user, inter_data
           FROM interatividade
           WHERE inter_tipo = 1
           UNION ALL
           SELECT inter_user, inter_data
           FROM inter_tarefa
           WHERE inter_tipo = 1
         ) interactions
         JOIN usuarios u ON u.user_id = interactions.inter_user
         WHERE u.user_sts = 1
           AND interactions.inter_data BETWEEN ? AND ?
         GROUP BY u.user_id, u.user_nome
         ORDER BY total DESC
         LIMIT 3`,
        start,
        end,
      );
    }

    return this.database.$queryRawUnsafe<RankingRow[]>(
      `SELECT
         CASE
           WHEN u.user_funcao IN (3, 7) THEN u.user_nome
           ELSE 'Outros Colaboradores'
         END AS name,
         COUNT(*) AS total
       FROM (
         SELECT inter_user, inter_data
         FROM interatividade
         WHERE inter_tipo = 1
         UNION ALL
         SELECT inter_user, inter_data
         FROM inter_tarefa
         WHERE inter_tipo = 1
       ) interactions
       JOIN usuarios u ON u.user_id = interactions.inter_user
       WHERE u.user_sts > 0
         AND interactions.inter_data BETWEEN ? AND ?
       GROUP BY
         CASE
           WHEN u.user_funcao IN (3, 7) THEN u.user_nome
           ELSE 'Outros Colaboradores'
         END
       ORDER BY total DESC`,
      start,
      end,
    );
  }
}
