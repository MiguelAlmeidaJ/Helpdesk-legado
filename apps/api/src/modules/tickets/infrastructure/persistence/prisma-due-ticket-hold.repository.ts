import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  DueTicketHoldRepository,
  type DueTicketHold,
  type ResumeDueTicketHoldInput,
} from '../../application/ports/due-ticket-hold.repository';
import { enqueueTicketNotification } from '../outbox/enqueue-ticket-notification';

interface DueTicketHoldRow {
  ticket_id: number;
  espera_id: number;
}

interface TicketStatusRow {
  id: number;
  status: number | null;
}

interface HoldStateRow {
  espera_id: number;
}

@Injectable()
export class PrismaDueTicketHoldRepository extends DueTicketHoldRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async findDue(limit: number): Promise<DueTicketHold[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

    const rows = await this.database.$queryRawUnsafe<DueTicketHoldRow[]>(
      `SELECT
         a.id AS ticket_id,
         e.espera_id
       FROM atendimentos a
       INNER JOIN espera e ON e.espera_atd = a.id
       INNER JOIN (
         SELECT espera_atd, MAX(espera_id) AS espera_id
         FROM espera
         GROUP BY espera_atd
       ) latest
         ON latest.espera_atd = e.espera_atd
        AND latest.espera_id = e.espera_id
       WHERE a.status = ?
         AND e.espera_end IS NULL
         AND e.espera_prev IS NOT NULL
         AND e.espera_prev <= NOW()
       ORDER BY e.espera_prev ASC, e.espera_id ASC
       LIMIT ${safeLimit}`,
      TicketStatus.OnHold,
    );

    return rows.map((row) => ({
      ticketId: row.ticket_id,
      holdId: row.espera_id,
    }));
  }

  async resumeDue(input: ResumeDueTicketHoldInput): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const tickets = await transaction.$queryRawUnsafe<TicketStatusRow[]>(
        `SELECT id, status
         FROM atendimentos
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        input.ticketId,
      );

      if (tickets[0]?.status !== TicketStatus.OnHold) {
        return false;
      }

      const holds = await transaction.$queryRawUnsafe<HoldStateRow[]>(
        `SELECT espera_id
         FROM espera
         WHERE espera_id = ?
           AND espera_atd = ?
           AND espera_end IS NULL
           AND espera_prev IS NOT NULL
           AND espera_prev <= NOW()
         LIMIT 1
         FOR UPDATE`,
        input.holdId,
        input.ticketId,
      );

      if (!holds[0]) {
        return false;
      }

      const updatedTicket = await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET status = ?
         WHERE id = ?
           AND status = ?`,
        TicketStatus.InProgress,
        input.ticketId,
        TicketStatus.OnHold,
      );

      if (updatedTicket === 0) {
        return false;
      }

      const closedHold = await transaction.$executeRawUnsafe(
        `UPDATE espera
         SET espera_end = NOW()
         WHERE espera_id = ?
           AND espera_atd = ?
           AND espera_end IS NULL`,
        input.holdId,
        input.ticketId,
      );

      if (closedHold === 0) {
        throw new Error(
          `Falha ao encerrar a espera ${input.holdId} do atendimento ${input.ticketId}.`,
        );
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO interatividade (
           inter_tipo,
           inter_atd,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (6, ?, 1, NOW(), ?)`,
        input.ticketId,
        'Status do atendimento alterado automaticamente para Em Execucao.',
      );

      await enqueueTicketNotification(
        transaction,
        'ticket.resumed',
        input.ticketId,
        { actorUserId: 1, automatic: true },
      );

      return true;
    });
  }
}
