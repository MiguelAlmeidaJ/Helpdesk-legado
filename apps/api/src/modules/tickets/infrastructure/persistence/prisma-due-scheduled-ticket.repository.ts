import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  DueScheduledTicketRepository,
  type DueScheduledTicket,
} from '../../application/ports/due-scheduled-ticket.repository';

interface DueScheduledTicketRow {
  ticket_id: number;
}

interface LockedScheduledTicketRow {
  id: number;
}

@Injectable()
export class PrismaDueScheduledTicketRepository extends DueScheduledTicketRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async findDue(limit: number): Promise<DueScheduledTicket[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

    const rows = await this.database.$queryRawUnsafe<DueScheduledTicketRow[]>(
      `SELECT id AS ticket_id
       FROM atendimentos
       WHERE status = ?
         AND abertura IS NOT NULL
         AND abertura <= NOW()
       ORDER BY abertura ASC, id ASC
       LIMIT ${safeLimit}`,
      TicketStatus.Scheduled,
    );

    return rows.map((row) => ({
      ticketId: row.ticket_id,
    }));
  }

  async activateDue(ticketId: number): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<LockedScheduledTicketRow[]>(
        `SELECT id
         FROM atendimentos
         WHERE id = ?
           AND status = ?
           AND abertura IS NOT NULL
           AND abertura <= NOW()
         LIMIT 1
         FOR UPDATE`,
        ticketId,
        TicketStatus.Scheduled,
      );

      if (!rows[0]) {
        return false;
      }

      const updated = await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET status = ?
         WHERE id = ?
           AND status = ?`,
        TicketStatus.WaitingExecution,
        ticketId,
        TicketStatus.Scheduled,
      );

      if (updated === 0) {
        return false;
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO interatividade (
           inter_tipo,
           inter_atd,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (1, ?, 1, NOW(), ?)`,
        ticketId,
        'Status do atendimento alterado automaticamente para Aguardando Execucao.',
      );

      return true;
    });
  }
}
