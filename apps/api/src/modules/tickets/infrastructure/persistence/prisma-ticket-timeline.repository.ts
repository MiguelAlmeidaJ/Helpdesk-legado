import { Inject, Injectable } from '@nestjs/common';
import {
  TicketStatus,
  type TicketTimelineEntry,
  type TicketTimelineResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import { TicketTimelineRepository } from '../../application/ports/ticket-timeline.repository';

interface TimelineRow {
  interaction_id: number;
  ticket_id: number;
  interaction_type: number | null;
  occurred_at: string;
  description: string | null;
  ticket_status: number | null;
  actor_id: number | null;
  actor_name: string | null;
  client_id: number | null;
  client_name: string | null;
  requester_id: number | null;
  requester_name: string | null;
  technician_id: number | null;
  technician_name: string | null;
  location_name: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  item_name: string | null;
}

interface NowRow {
  generated_at: string;
}

function status(value: number | null): TicketStatus | null {
  return value !== null && value >= TicketStatus.Scheduled && value <= TicketStatus.Completed
    ? (value as TicketStatus)
    : null;
}

@Injectable()
export class PrismaTicketTimelineRepository extends TicketTimelineRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async last24Hours(limit: number): Promise<TicketTimelineResponse> {
    const rows = await this.database.$queryRawUnsafe<TimelineRow[]>(
      `SELECT
         i.inter_id AS interaction_id,
         a.id AS ticket_id,
         i.inter_tipo AS interaction_type,
         DATE_FORMAT(i.inter_data, '%Y-%m-%dT%H:%i:%s') AS occurred_at,
         i.inter_desc AS description,
         a.status AS ticket_status,
         actor.user_id AS actor_id,
         actor.user_nome AS actor_name,
         c.clt_id AS client_id,
         COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS client_name,
         p.pessoa_id AS requester_id,
         p.pessoa_nom AS requester_name,
         tech.user_id AS technician_id,
         tech.user_nome AS technician_name,
         l.local_nom AS location_name,
         cat.cat_nome AS category_name,
         scat.scat_nome AS subcategory_name,
         item.itens_nome AS item_name
       FROM interatividade i
       INNER JOIN atendimentos a ON a.id = i.inter_atd
       LEFT JOIN usuarios actor ON actor.user_id = i.inter_user
       LEFT JOIN clientes c ON c.clt_id = a.cliente
       LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa
       LEFT JOIN usuarios tech ON tech.user_id = a.tecnico
       LEFT JOIN locais l ON l.local_id = a.\`local\`
       LEFT JOIN categorias cat ON cat.cat_id = a.categoria
       LEFT JOIN subcategorias scat ON scat.scat_id = a.subcategoria
       LEFT JOIN itens item ON item.itens_id = a.item
       WHERE i.inter_data BETWEEN DATE_SUB(NOW(), INTERVAL 1 DAY) AND NOW()
       ORDER BY i.inter_data DESC, i.inter_id DESC
       LIMIT ${limit}`,
    );

    const now = await this.database.$queryRawUnsafe<NowRow[]>(
      `SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') AS generated_at`,
    );

    const items: TicketTimelineEntry[] = rows.map((row) => ({
      interactionId: row.interaction_id,
      ticketId: row.ticket_id,
      interactionType: row.interaction_type ?? 0,
      occurredAt: row.occurred_at,
      description: row.description?.trim() || 'Sem descrição.',
      ticketStatus: status(row.ticket_status),
      actor: { id: row.actor_id, name: row.actor_name },
      client: { id: row.client_id, name: row.client_name },
      requester: { id: row.requester_id, name: row.requester_name },
      technician: { id: row.technician_id, name: row.technician_name },
      location: row.location_name,
      classification: {
        category: row.category_name,
        subcategory: row.subcategory_name,
        item: row.item_name,
      },
    }));

    return {
      windowHours: 24,
      generatedAt: now[0]?.generated_at ?? new Date().toISOString(),
      items,
    };
  }
}
