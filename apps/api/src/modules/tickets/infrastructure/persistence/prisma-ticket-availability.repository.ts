import { Inject, Injectable } from '@nestjs/common';
import {
  TICKET_STATUS_LABELS,
  TicketStatus,
  type TechnicianAvailabilityItem,
  type TicketAvailabilityHoldGroup,
  type TicketAvailabilityResponse,
  type TicketAvailabilityTicket,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import { TicketAvailabilityRepository } from '../../application/ports/ticket-availability.repository';

interface TechnicianRow {
  id: number;
  name: string | null;
  function_id: number | null;
  online: number | bigint;
}

interface TicketRow {
  id: number;
  status: number;
  type_id: number | null;
  priority_id: number | null;
  client_name: string | null;
  technician_id: number | null;
  technician_name: string | null;
  opened_at: string | null;
  closed_at: string | null;
  waiting_count: number | bigint;
  hold_cause: string | null;
  hold_description: string | null;
  hold_forecast_at: string | null;
}

interface NowRow {
  generated_at: string;
}

const TECHNICAL_FUNCTIONS = [5, 6, 10, 12, 14];

const TYPE_LABELS: Record<number, string> = {
  0: 'Não informado',
  1: 'Falha',
  2: 'Relacionamento',
  3: 'Requisição de Serviços',
  4: 'Requisição de informação',
  5: 'Notificação de monitoramento',
  6: 'Melhoria',
  7: 'Tarefa',
};

function toTicket(row: TicketRow): TicketAvailabilityTicket {
  const ticketStatus = row.status as TicketStatus;

  return {
    id: row.id,
    status: ticketStatus,
    statusLabel: TICKET_STATUS_LABELS[ticketStatus] ?? `Status ${row.status}`,
    typeId: row.type_id,
    typeLabel:
      row.type_id === null
        ? 'Não informado'
        : TYPE_LABELS[row.type_id] ?? `Tipo ${row.type_id}`,
    priorityId: row.priority_id,
    clientName: row.client_name,
    technicianId: row.technician_id,
    technicianName: row.technician_name,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    waitingCount: Number(row.waiting_count ?? 0),
    holdCause: row.hold_cause,
    holdDescription: row.hold_description,
    holdForecastAt: row.hold_forecast_at,
  };
}

@Injectable()
export class PrismaTicketAvailabilityRepository extends TicketAvailabilityRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async dashboard(): Promise<TicketAvailabilityResponse> {
    const technicians = await this.database.$queryRawUnsafe<TechnicianRow[]>(
      `SELECT
         u.user_id AS id,
         u.user_nome AS name,
         u.user_funcao AS function_id,
         EXISTS(
           SELECT 1
           FROM api_sessions s
           WHERE s.user_id = u.user_id
             AND s.revoked_at IS NULL
             AND s.expires_at > NOW()
             AND COALESCE(s.last_used_at, s.created_at) >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
         ) AS online
       FROM usuarios u
       WHERE u.user_sts = 1
         AND u.user_funcao IN (${TECHNICAL_FUNCTIONS.join(',')})
       ORDER BY u.user_nome ASC`,
    );

    const rows = await this.database.$queryRawUnsafe<TicketRow[]>(
      `SELECT
         a.id,
         a.status,
         a.tipo AS type_id,
         a.prioridade AS priority_id,
         COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS client_name,
         a.tecnico AS technician_id,
         u.user_nome AS technician_name,
         DATE_FORMAT(a.abertura, '%Y-%m-%dT%H:%i:%s') AS opened_at,
         DATE_FORMAT(a.fechamento, '%Y-%m-%dT%H:%i:%s') AS closed_at,
         (
           SELECT COUNT(*)
           FROM espera ec
           WHERE ec.espera_atd = a.id
         ) AS waiting_count,
         (
           SELECT e.espera_causa
           FROM espera e
           WHERE e.espera_atd = a.id
           ORDER BY e.espera_start DESC, e.espera_id DESC
           LIMIT 1
         ) AS hold_cause,
         (
           SELECT e.espera_desc
           FROM espera e
           WHERE e.espera_atd = a.id
           ORDER BY e.espera_start DESC, e.espera_id DESC
           LIMIT 1
         ) AS hold_description,
         (
           SELECT DATE_FORMAT(e.espera_prev, '%Y-%m-%dT%H:%i:%s')
           FROM espera e
           WHERE e.espera_atd = a.id
           ORDER BY e.espera_start DESC, e.espera_id DESC
           LIMIT 1
         ) AS hold_forecast_at
       FROM atendimentos a
       LEFT JOIN clientes c ON c.clt_id = a.cliente
       LEFT JOIN usuarios u ON u.user_id = a.tecnico
       WHERE a.status IN (0, 1, 2, 3)
          OR (
            a.status IN (4, 5)
            AND DATE(a.fechamento) = CURDATE()
          )
       ORDER BY a.status ASC, a.abertura ASC, a.id ASC`,
    );

    const tickets = rows.map(toTicket);
    const executingByTechnician = new Map<number, TicketAvailabilityTicket[]>();

    for (const ticket of tickets) {
      if (
        ticket.status !== TicketStatus.InProgress ||
        !ticket.technicianId
      ) {
        continue;
      }

      const current = executingByTechnician.get(ticket.technicianId) ?? [];
      current.push(ticket);
      executingByTechnician.set(ticket.technicianId, current);
    }

    const technicianItems: TechnicianAvailabilityItem[] = technicians.map((row) => {
      const executing = executingByTechnician.get(row.id) ?? [];
      const online = Number(row.online) === 1;

      return {
        id: row.id,
        name: row.name?.trim() || `Usuário #${row.id}`,
        functionId: row.function_id ?? 0,
        online,
        state: executing.length > 0 ? 'busy' : online ? 'available' : 'offline',
        executing,
      };
    });

    const scheduled = tickets.filter(
      (ticket) => ticket.status === TicketStatus.Scheduled,
    );
    const waitingExecution = tickets.filter(
      (ticket) => ticket.status === TicketStatus.WaitingExecution,
    );
    const onHold = tickets.filter(
      (ticket) => ticket.status === TicketStatus.OnHold,
    );
    const finishedToday = tickets.filter(
      (ticket) =>
        ticket.status === TicketStatus.Finished ||
        ticket.status === TicketStatus.Completed,
    );

    const groups = new Map<string, TicketAvailabilityTicket[]>();
    for (const ticket of onHold) {
      const cause = ticket.holdCause?.trim() || 'Sem motivo';
      const current = groups.get(cause) ?? [];
      current.push(ticket);
      groups.set(cause, current);
    }

    const holds: TicketAvailabilityHoldGroup[] = [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
      .map(([cause, groupTickets]) => ({
        cause,
        tickets: groupTickets,
      }));

    const now = await this.database.$queryRawUnsafe<NowRow[]>(
      `SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') AS generated_at`,
    );

    return {
      generatedAt: now[0]?.generated_at ?? new Date().toISOString(),
      onlineWindowMinutes: 10,
      summary: {
        scheduled: scheduled.length,
        waitingExecution: waitingExecution.length,
        inProgress: tickets.filter(
          (ticket) => ticket.status === TicketStatus.InProgress,
        ).length,
        onHold: onHold.length,
        finishedToday: finishedToday.length,
        onlineTechnicians: technicianItems.filter((item) => item.online).length,
        availableTechnicians: technicianItems.filter(
          (item) => item.state === 'available',
        ).length,
        busyTechnicians: technicianItems.filter(
          (item) => item.state === 'busy',
        ).length,
      },
      technicians: technicianItems,
      scheduled,
      waitingExecution,
      finishedToday,
      holds,
    };
  }
}
