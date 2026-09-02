import { Inject, Injectable } from '@nestjs/common';
import {
  TICKET_STATUS_LABELS,
  TicketStatus,
  type TicketDetailCode,
  type TicketDetailResponse,
  type TicketHoldInfo,
  type TicketInteraction,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketDetailRepository,
  type TicketDetailRepositoryQuery,
} from '../../application/ports/ticket-detail.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface TicketDetailRow {
  id: number;
  area: number | null;
  status: number | null;
  tipo: number | null;
  nivel: number | null;
  prioridade: number | null;
  forma: number | null;
  reincidente: number | null;
  abertura: Date | string | null;
  fechamento: Date | string | null;
  desc_abertura: string | null;
  desc_fechamento: string | null;
  cliente_id: number;
  cliente_razao: string | null;
  cliente_fantasia: string | null;
  cliente_documento: string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  pessoa_cargo: string | null;
  pessoa_tel: string | null;
  pessoa_mail: string | null;
  local_id: number | null;
  local_nome: string | null;
  local_end: string | null;
  local_city: string | null;
  local_uf: string | null;
  categoria_id: number | null;
  categoria_nome: string | null;
  subcategoria_id: number | null;
  subcategoria_nome: string | null;
  item_id: number | null;
  item_nome: string | null;
  tecnico_id: number | null;
  tecnico_nome: string | null;
  tecnico_tel: string | null;
  tecnico_mail: string | null;
}

interface InteractionRow {
  inter_id: number;
  inter_tipo: number;
  inter_data: Date | string | null;
  inter_desc: string | null;
  user_id: number;
  user_nome: string;
}

interface HoldRow {
  espera_id: number;
  espera_user: number;
  espera_start: Date | string | null;
  espera_prev: Date | string;
  espera_causa: string;
  espera_desc: string;
  user_nome: string | null;
}

const TYPE_LABELS: Record<number, string> = {
  0: 'Não informado',
  1: 'Falha',
  2: 'Relacionamento',
  3: 'Requisição de Serviços',
  4: 'Requisição de informação',
  5: 'Notificação de monitoramento',
  6: 'Melhorias',
  7: 'Tarefa',
};

const LEVEL_LABELS: Record<number, string> = {
  0: 'Não informado',
  1: 'Nível 1',
  2: 'Nível 2',
  3: 'Nível 3',
  4: 'Rotina',
  5: 'Administrativo',
  6: 'Tarefa',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Não informado',
  1: 'Baixa',
  2: 'Média',
  3: 'Alta',
  4: 'Urgente',
};

const FORM_LABELS: Record<number, string> = {
  0: 'Não informado',
  1: 'Remoto',
  2: 'Presencial',
  3: 'Remoto - Plantão',
  4: 'Presencial - Plantão',
};

function toIsoString(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function code(
  value: number | null,
  labels: Record<number, string>,
): TicketDetailCode {
  return {
    code: value,
    label:
      value === null
        ? 'Não informado'
        : (labels[value] ?? `Código ${value}`),
  };
}

function validStatus(value: number | null): TicketStatus {
  if (
    value !== null &&
    value >= TicketStatus.Scheduled &&
    value <= TicketStatus.Completed
  ) {
    return value as TicketStatus;
  }

  return TicketStatus.WaitingExecution;
}

@Injectable()
export class PrismaTicketDetailRepository extends TicketDetailRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async findById(
    query: TicketDetailRepositoryQuery,
  ): Promise<TicketDetailResponse | null> {
    const clientIds = await this.resolveRestrictedClientIds(query.userId);

    if (clientIds !== null && clientIds.length === 0) {
      return null;
    }

    const where = ['a.id = ?'];
    const params: unknown[] = [query.ticketId];

    if (clientIds !== null) {
      where.push(`a.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }

    if (query.ownerTechnicianId !== undefined) {
      where.push('a.tecnico = ?');
      params.push(query.ownerTechnicianId);
    }

    // Preserve the exceptional visibility rule already used by the list.
    if (query.userId === 134) {
      where.push(
        '(LOWER(a.desc_abertura) LIKE LOWER(?) OR LOWER(a.desc_fechamento) LIKE LOWER(?))',
      );
      params.push('%NET DO BRASIL%', '%NET DO BRASIL%');
    }

    const rows = await this.database.$queryRawUnsafe<TicketDetailRow[]>(
      `SELECT
         a.id,
         a.area,
         a.status,
         a.tipo,
         a.nivel,
         a.prioridade,
         a.forma,
         a.reincidente,
         a.abertura,
         a.fechamento,
         a.desc_abertura,
         a.desc_fechamento,
         c.clt_id AS cliente_id,
         c.clt_nomer AS cliente_razao,
         c.clt_nomef AS cliente_fantasia,
         c.clt_cnpj AS cliente_documento,
         p.pessoa_id AS pessoa_id,
         p.pessoa_nom AS pessoa_nome,
         p.pessoa_cargo,
         p.pessoa_tel,
         p.pessoa_mail,
         l.local_id AS local_id,
         l.local_nom AS local_nome,
         l.local_end,
         l.local_city,
         l.local_uf,
         cat.cat_id AS categoria_id,
         cat.cat_nome AS categoria_nome,
         scat.scat_id AS subcategoria_id,
         scat.scat_nome AS subcategoria_nome,
         i.itens_id AS item_id,
         i.itens_nome AS item_nome,
         u.user_id AS tecnico_id,
         u.user_nome AS tecnico_nome,
         u.user_cel AS tecnico_tel,
         u.user_mail AS tecnico_mail
       FROM atendimentos a
       INNER JOIN clientes c ON c.clt_id = a.cliente
       LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa
       LEFT JOIN locais l ON l.local_id = a.local
       LEFT JOIN categorias cat ON cat.cat_id = a.categoria
       LEFT JOIN subcategorias scat ON scat.scat_id = a.subcategoria
       LEFT JOIN itens i ON i.itens_id = a.item
       LEFT JOIN usuarios u ON u.user_id = a.tecnico
       WHERE ${where.join(' AND ')}
       LIMIT 1`,
      ...params,
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const [interactions, hold] = await Promise.all([
      this.fetchInteractions(row.id),
      this.fetchActiveHold(row.id),
    ]);
    const status = validStatus(row.status);

    return {
      id: row.id,
      area: row.area,
      status,
      statusLabel: TICKET_STATUS_LABELS[status],
      type: code(row.tipo, TYPE_LABELS),
      level: code(row.nivel, LEVEL_LABELS),
      priority: code(row.prioridade, PRIORITY_LABELS),
      form: code(row.forma, FORM_LABELS),
      incident: {
        reincident: row.reincidente === 1,
      },
      openedAt: toIsoString(row.abertura),
      closedAt: toIsoString(row.fechamento),
      openingDescription: row.desc_abertura,
      closingDescription: row.desc_fechamento,
      client: {
        id: row.cliente_id,
        legalName: row.cliente_razao,
        tradeName: row.cliente_fantasia,
        document: row.cliente_documento,
      },
      requester: {
        id: row.pessoa_id,
        name: row.pessoa_nome,
        role: row.pessoa_cargo,
        phone: row.pessoa_tel,
        email: row.pessoa_mail,
      },
      location: {
        id: row.local_id,
        name: row.local_nome,
        address: row.local_end,
        city: row.local_city,
        state: row.local_uf,
      },
      classification: {
        category: {
          id: row.categoria_id,
          name: row.categoria_nome,
        },
        subcategory: {
          id: row.subcategoria_id,
          name: row.subcategoria_nome,
        },
        item: {
          id: row.item_id,
          name: row.item_nome,
        },
      },
      technician: {
        id: row.tecnico_id,
        name: row.tecnico_nome,
        phone: row.tecnico_tel,
        email: row.tecnico_mail,
      },
      hold,
      interactions,
    };
  }

  private async resolveRestrictedClientIds(
    userId: number,
  ): Promise<number[] | null> {
    const users = await this.database.$queryRawUnsafe<VisibilityRow[]>(
      `SELECT tipo_usuario
       FROM usuarios
       WHERE user_id = ?
       LIMIT 1`,
      userId,
    );

    if (users[0]?.tipo_usuario !== 2) {
      return null;
    }

    const clients = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      `SELECT cliente_id
       FROM clientes_usuarios
       WHERE usuario_id = ?`,
      userId,
    );

    return clients.map((client) => client.cliente_id);
  }

  private async fetchActiveHold(
    ticketId: number,
  ): Promise<TicketHoldInfo | null> {
    const rows = await this.database.$queryRawUnsafe<HoldRow[]>(
      `SELECT
         e.espera_id,
         e.espera_user,
         e.espera_start,
         e.espera_prev,
         e.espera_causa,
         e.espera_desc,
         u.user_nome
       FROM espera e
       LEFT JOIN usuarios u ON u.user_id = e.espera_user
       WHERE e.espera_atd = ?
         AND e.espera_end IS NULL
       ORDER BY e.espera_id DESC
       LIMIT 1`,
      ticketId,
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.espera_id,
      startedAt: toIsoString(row.espera_start),
      forecastAt: toIsoString(row.espera_prev) ?? String(row.espera_prev),
      cause: row.espera_causa,
      description: row.espera_desc,
      user: {
        id: row.espera_user,
        name: row.user_nome,
      },
    };
  }

  private async fetchInteractions(
    ticketId: number,
  ): Promise<TicketInteraction[]> {
    const rows = await this.database.$queryRawUnsafe<InteractionRow[]>(
      `SELECT
         inter.inter_id,
         inter.inter_tipo,
         inter.inter_data,
         inter.inter_desc,
         u.user_id,
         u.user_nome
       FROM interatividade inter
       INNER JOIN usuarios u ON u.user_id = inter.inter_user
       WHERE inter.inter_atd = ?
         AND inter.inter_tipo > 0
       ORDER BY inter.inter_id DESC`,
      ticketId,
    );

    return rows.map((row) => ({
      id: row.inter_id,
      type: row.inter_tipo,
      occurredAt: toIsoString(row.inter_data),
      description: row.inter_desc ?? '',
      user: {
        id: row.user_id,
        name: row.user_nome,
      },
    }));
  }
}
