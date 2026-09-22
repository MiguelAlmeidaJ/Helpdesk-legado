import { Inject, Injectable } from '@nestjs/common';
import {
  type MarketingTicketCatalogsResponse,
  type MarketingTicketCreateResponse,
  type MarketingTicketDetailResponse,
  type MarketingTicketListItem,
  type MarketingTicketListResponse,
  type MarketingTicketStatus,
  type MarketingTicketTimelineItem,
  type TicketCatalogOption,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../../core/database/database.constants';
import {
  MarketingTicketRepository,
  type MarketingTicketAssignmentPersistenceInput,
  type MarketingTicketCommandResult,
  type MarketingTicketCreatePersistenceInput,
  type MarketingTicketFinalizePersistenceInput,
  type MarketingTicketHoldPersistenceInput,
  type MarketingTicketInteractionPersistenceInput,
  type MarketingTicketListPersistenceInput,
  type MarketingTicketRejectPersistenceInput,
  type MarketingTicketScope,
  type MarketingTicketUpdatePersistenceInput,
} from '../application/ports/marketing-ticket.repository';

interface OptionRow { id: number; name: string | null }
interface UserTypeRow { tipo_usuario: number }
interface ClientScopeRow { cliente_id: number }
interface CountRow { total: number | bigint | string }
interface FlagRow { value: number | bigint | string }
interface InsertIdRow { id: number | bigint | string }
interface TaskRow {
  id: number;
  nome_tarefa: string | null;
  desc_abertura: string | null;
  desc_fechamento: string | null;
  abertura: Date | string | null;
  fechamento: Date | string | null;
  status: number | null;
  forma: number | null;
  reincidente: number | null;
  tecnico: number | null;
  clt_id: number | null;
  clt_nomef: string | null;
  pessoa_id: number | null;
  pessoa_nom: string | null;
  local_id: number | null;
  local_nom: string | null;
  tipo: number | null;
  tipo_nome: string | null;
  categoria: number | null;
  cat_nome: string | null;
  subcategoria: number | null;
  scat_nome: string | null;
  nivel: number | null;
  nivel_nome: string | null;
  item: number | null;
  itens_nome: string | null;
  tecnico_nome: string | null;
  espera_segundos: number | bigint | string | null;
  ultima_interacao: Date | string | null;
}
interface LockedTaskRow {
  id: number;
  status: number | null;
  tecnico: number | null;
  cliente: number;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  item: number | null;
  nivel: number | null;
  forma: number | null;
  desc_abertura: string | null;
}
interface TimelineRow {
  inter_id: number;
  inter_tipo: number | null;
  inter_data: Date | string | null;
  inter_desc: string | null;
  inter_user: number | null;
  user_nome: string | null;
}
interface HoldRow { espera_id: number }
interface DueRow { id: number }

type QueryClient = Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>;
type TxClient = Pick<Nivel3DatabaseClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

const FORMS: TicketCatalogOption[] = [
  { id: 1, name: 'Remoto' },
  { id: 2, name: 'Presencial' },
  { id: 3, name: 'Remoto - Plantão' },
  { id: 4, name: 'Presencial - Plantão' },
];
const STATUS_LABELS: Record<number, string> = {
  0: 'Agendado',
  1: 'Aguardando',
  2: 'Em execução',
  3: 'Em espera',
  4: 'Concluído',
};
const SORT_COLUMNS: Record<MarketingTicketListPersistenceInput['sort'], string> = {
  status: 't.status',
  id: 't.id',
  client: 'c.clt_nomef',
  openedAt: 't.abertura',
  level: 't.nivel',
  technician: 'u.user_nome',
};

function mapOptions(rows: OptionRow[]): TicketCatalogOption[] {
  return rows.map((row) => ({ id: row.id, name: row.name ?? `#${row.id}` }));
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function party(id: number | null, name: string | null) {
  return { id: id ?? null, name: name ?? null };
}

@Injectable()
export class PrismaMarketingTicketRepository extends MarketingTicketRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async catalogs(actorUserId: number): Promise<MarketingTicketCatalogsResponse> {
    const restricted = await this.restrictedClientIds(actorUserId);
    const where: string[] = ['clt_sts = 1', 'clt_mkt = 1'];
    const params: unknown[] = [];
    if (actorUserId === 145) {
      where.push('clt_id = 93');
    }
    if (restricted !== null) {
      if (restricted.length === 0) where.push('1 = 0');
      else {
        where.push(`clt_id IN (${restricted.map(() => '?').join(', ')})`);
        params.push(...restricted);
      }
    }

    const [clients, technicians, types, categories, subcategories, levels] =
      await Promise.all([
        this.database.$queryRawUnsafe<OptionRow[]>(
          `SELECT clt_id AS id, COALESCE(NULLIF(clt_nomef, ''), clt_nomer) AS name
           FROM clientes
           WHERE ${where.join(' AND ')}
           ORDER BY name`,
          ...params,
        ),
        this.database.$queryRawUnsafe<OptionRow[]>(
          `SELECT user_id AS id, user_nome AS name
           FROM usuarios
           WHERE user_sts = 1
             AND user_id > 1
             AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 1, 1) AS UNSIGNED) >= 1
             AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 3, 1) AS UNSIGNED) >= 2
           ORDER BY user_nome`,
        ),
        this.catalog('tipos_terc_andar'),
        this.catalog('categorias_terc_andar'),
        this.catalog('subcategorias_terc_andar'),
        this.catalog('niveis_terc_andar'),
      ]);

    return {
      clients: mapOptions(clients),
      technicians: [{ id: 0, name: 'Não determinado' }, ...mapOptions(technicians)],
      types,
      categories,
      subcategories,
      levels,
      forms: FORMS,
    };
  }

  async requesters(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]> {
    if (!(await this.canUseMarketingClient(actorUserId, clientId))) return [];
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT pessoa_id AS id, pessoa_nom AS name
       FROM pessoas
       WHERE pessoa_clt = ? AND pessoa_sts = 1
       ORDER BY pessoa_nom`,
      clientId,
    );
    return mapOptions(rows);
  }

  async locations(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]> {
    if (!(await this.canUseMarketingClient(actorUserId, clientId))) return [];
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT local_id AS id, local_nom AS name
       FROM locais
       WHERE local_clt = ? AND local_sts = 1
       ORDER BY local_nom`,
      clientId,
    );
    return mapOptions(rows);
  }

  async list(input: MarketingTicketListPersistenceInput): Promise<MarketingTicketListResponse> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return { data: [], meta: { page: input.page, limit: input.limit, total: 0, totalPages: 0 } };
    }

    const { where, params } = this.visibilityWhere(input, clientIds);
    const counts = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM tarefas_terc_andar t
       INNER JOIN clientes c ON c.clt_id = t.cliente
       WHERE ${where.join(' AND ')}`,
      ...params,
    );
    const total = Number(counts[0]?.total ?? 0);
    const offset = (input.page - 1) * input.limit;
    const rows = await this.database.$queryRawUnsafe<TaskRow[]>(
      `${this.selectTaskSql()}
       WHERE ${where.join(' AND ')}
       ORDER BY ${SORT_COLUMNS[input.sort]} ${input.direction.toUpperCase()}, t.id DESC
       LIMIT ? OFFSET ?`,
      ...params,
      input.limit,
      offset,
    );

    return {
      data: rows.map((row) => this.mapTask(row)),
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
      },
    };
  }

  async detail(input: MarketingTicketScope & { ticketId: number }): Promise<MarketingTicketDetailResponse | null> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) return null;
    const where = ['t.id = ?'];
    const params: unknown[] = [input.ticketId];
    this.appendVisibility(where, params, input, clientIds, 't');
    const rows = await this.database.$queryRawUnsafe<TaskRow[]>(
      `${this.selectTaskSql()} WHERE ${where.join(' AND ')} LIMIT 1`,
      ...params,
    );
    const row = rows[0];
    if (!row) return null;
    const timelineRows = await this.database.$queryRawUnsafe<TimelineRow[]>(
      `SELECT i.inter_id, i.inter_tipo, i.inter_data, i.inter_desc, i.inter_user, u.user_nome
       FROM inter_terc_andar i
       LEFT JOIN usuarios u ON u.user_id = i.inter_user
       WHERE i.inter_tarefa = ? AND i.inter_tipo > 0
       ORDER BY i.inter_id DESC`,
      input.ticketId,
    );
    const timeline: MarketingTicketTimelineItem[] = timelineRows.map((item) => ({
      id: item.inter_id,
      type: item.inter_tipo ?? 0,
      at: iso(item.inter_data),
      description: item.inter_desc,
      user: party(item.inter_user, item.user_nome),
    }));
    return { ...this.mapTask(row), timeline };
  }

  async create(input: MarketingTicketCreatePersistenceInput): Promise<MarketingTicketCreateResponse | 'invalid-reference' | 'forbidden-client'> {
    if (!(await this.canUseMarketingClient(input.actorUserId, input.data.clientId))) {
      return 'forbidden-client';
    }
    if (!(await this.validCreateReferences(this.database, input.data))) {
      return 'invalid-reference';
    }
    const recent = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM tarefas_terc_andar
       WHERE abertura > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         AND cliente = ? AND categoria = ? AND subcategoria = ?`,
      input.data.clientId,
      input.data.categoryId,
      input.data.subcategoryId,
    );
    const scheduled = await this.database.$queryRawUnsafe<FlagRow[]>(
      `SELECT CASE WHEN CAST(REPLACE(?, 'T', ' ') AS DATETIME) > NOW() THEN 1 ELSE 0 END AS value`,
      input.data.openingAt,
    );
    const status = (Number(scheduled[0]?.value ?? 0) === 1 ? 0 : 1) as MarketingTicketStatus;

    return this.database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO tarefas_terc_andar (
           cliente, nome_tarefa, pessoa, \`local\`, tipo, categoria, subcategoria,
           item, nivel, forma, desc_abertura, abertura, tecnico, reincidente, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(REPLACE(?, 'T', ' ') AS DATETIME), ?, ?, ?)`,
        input.data.clientId,
        input.data.name,
        input.data.requesterId,
        input.data.locationId,
        input.data.typeId,
        input.data.categoryId,
        input.data.subcategoryId,
        input.data.itemId,
        input.data.levelId,
        input.data.formId,
        input.data.openingDescription,
        input.data.openingAt,
        input.data.technicianId,
        Number(recent[0]?.total ?? 0) > 0 ? 1 : 0,
        status,
      );
      const ids = await tx.$queryRawUnsafe<InsertIdRow[]>('SELECT LAST_INSERT_ID() AS id');
      const id = Number(ids[0]?.id ?? 0);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Falha ao identificar ticket Marketing criado.');
      const description = status === 0
        ? `Registrou o Agendamento da Tarefa para ${input.data.openingAt.replace('T', ' ')}.`
        : 'Registrou solicitação de Tarefa.';
      await this.addInteractionRow(tx, 1, id, input.actorUserId, description);
      if (input.data.technicianId > 0 && input.data.technicianId !== input.actorUserId) {
        const name = await this.userName(tx, input.data.technicianId);
        await this.addInteractionRow(tx, 4, id, input.actorUserId, `Direcionou a tarefa para ${name}.`);
      }
      return { id, status };
    });
  }

  async update(input: MarketingTicketUpdatePersistenceInput): Promise<MarketingTicketCommandResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) return 'not-found';
    return this.database.$transaction(async (tx) => {
      const task = await this.lockVisibleTask(tx, input.ticketId, input, clientIds);
      if (!task) return 'not-found';
      if (!(await this.validClassificationReferences(tx, input.data))) return 'invalid-reference';
      const changes: string[] = [];
      const compare = (label: string, before: unknown, after: unknown) => {
        if (String(before ?? '') !== String(after ?? '')) changes.push(`${label}: ${before ?? ''} -> ${after}`);
      };
      compare('Tipo', task.tipo, input.data.typeId);
      compare('Categoria', task.categoria, input.data.categoryId);
      compare('Subcategoria', task.subcategoria, input.data.subcategoryId);
      compare('Item', task.item, input.data.itemId);
      compare('Nível', task.nivel, input.data.levelId);
      compare('Forma', task.forma, input.data.formId);
      compare('Descrição de abertura', task.desc_abertura, input.data.openingDescription);
      if (changes.length === 0) return 'updated';
      await tx.$executeRawUnsafe(
        `UPDATE tarefas_terc_andar
         SET tipo = ?, categoria = ?, subcategoria = ?, item = ?, nivel = ?, forma = ?, desc_abertura = ?
         WHERE id = ?`,
        input.data.typeId,
        input.data.categoryId,
        input.data.subcategoryId,
        input.data.itemId,
        input.data.levelId,
        input.data.formId,
        input.data.openingDescription,
        input.ticketId,
      );
      await this.addInteractionRow(tx, 9, input.ticketId, input.actorUserId, `Editou dados de classificação do ticket Marketing.\n${changes.join('\n')}`);
      return 'updated';
    });
  }

  async addInteraction(input: MarketingTicketInteractionPersistenceInput): Promise<MarketingTicketCommandResult> {
    return this.withLockedVisibleTask(input, async (tx) => {
      await this.addInteractionRow(tx, 7, input.ticketId, input.actorUserId, input.description);
      return 'updated';
    });
  }

  async assign(input: MarketingTicketAssignmentPersistenceInput): Promise<MarketingTicketCommandResult> {
    if (!(await this.validTechnician(this.database, input.technicianId))) return 'invalid-reference';
    return this.withLockedVisibleTask(input, async (tx, task) => {
      if (![1, 2, 3].includes(task.status ?? -1)) return 'invalid-state';
      const own = input.technicianId === input.actorUserId;
      await tx.$executeRawUnsafe(
        'UPDATE tarefas_terc_andar SET tecnico = ?, status = ? WHERE id = ?',
        input.technicianId,
        own ? 2 : 1,
        input.ticketId,
      );
      if (own) {
        await this.addInteractionRow(tx, 2, input.ticketId, input.actorUserId, 'Iniciou a tarefa.');
      } else {
        const name = await this.userName(tx, input.technicianId);
        await this.addInteractionRow(tx, 4, input.ticketId, input.actorUserId, `Direcionou a tarefa para ${name}.`);
      }
      return 'updated';
    });
  }

  async putOnHold(input: MarketingTicketHoldPersistenceInput): Promise<MarketingTicketCommandResult> {
    return this.withLockedVisibleTask(input, async (tx, task) => {
      if (task.status !== 2) return 'invalid-state';
      const active = await this.lockActiveHold(tx, input.ticketId);
      if (active) return 'already-on-hold';
      await tx.$executeRawUnsafe(
        `INSERT INTO espera_terc_andar (espera_tarefa, espera_start, espera_prev, espera_desc, espera_user)
         VALUES (?, NOW(), CAST(REPLACE(?, 'T', ' ') AS DATETIME), ?, ?)`,
        input.ticketId,
        input.forecastAt,
        input.description,
        input.actorUserId,
      );
      await tx.$executeRawUnsafe('UPDATE tarefas_terc_andar SET status = 3 WHERE id = ?', input.ticketId);
      await this.addInteractionRow(tx, 5, input.ticketId, input.actorUserId, `Colocou a tarefa Em Espera.\nPrevisão de retorno: ${input.forecastAt.replace('T', ' ')}\nDescrição: ${input.description}`);
      return 'updated';
    });
  }

  async resume(input: MarketingTicketScope & { ticketId: number }): Promise<MarketingTicketCommandResult> {
    return this.withLockedVisibleTask(input, async (tx, task) => {
      if (task.status !== 3) return 'invalid-state';
      const active = await this.lockActiveHold(tx, input.ticketId);
      if (!active) return 'missing-active-hold';
      await tx.$executeRawUnsafe('UPDATE tarefas_terc_andar SET status = 2 WHERE id = ?', input.ticketId);
      await tx.$executeRawUnsafe('UPDATE espera_terc_andar SET espera_end = NOW() WHERE espera_id = ?', active.espera_id);
      await this.addInteractionRow(tx, 6, input.ticketId, input.actorUserId, 'Retomou a tarefa.');
      return 'updated';
    });
  }

  async reject(input: MarketingTicketRejectPersistenceInput): Promise<MarketingTicketCommandResult> {
    if (input.technicianId > 0 && !(await this.validTechnician(this.database, input.technicianId))) {
      return 'invalid-reference';
    }
    return this.withLockedVisibleTask(input, async (tx, task) => {
      if (task.status !== 2) return 'invalid-state';
      await tx.$executeRawUnsafe('UPDATE tarefas_terc_andar SET tecnico = ?, status = 1 WHERE id = ?', input.technicianId, input.ticketId);
      if (input.technicianId > 0) {
        const name = await this.userName(tx, input.technicianId);
        await this.addInteractionRow(tx, 4, input.ticketId, input.actorUserId, `Direcionou a tarefa para ${name}:\n${input.reason}`);
      } else {
        await this.addInteractionRow(tx, 3, input.ticketId, input.actorUserId, `Recusou a tarefa:\n${input.reason}`);
      }
      return 'updated';
    });
  }

  async finalize(input: MarketingTicketFinalizePersistenceInput): Promise<MarketingTicketCommandResult> {
    return this.withLockedVisibleTask(input, async (tx, task) => {
      if (!input.allowedStatuses.includes(task.status ?? -1)) return 'invalid-state';
      const active = await this.lockActiveHold(tx, input.ticketId);
      if (active) {
        await tx.$executeRawUnsafe('UPDATE espera_terc_andar SET espera_end = NOW() WHERE espera_id = ?', active.espera_id);
      }
      await tx.$executeRawUnsafe(
        `UPDATE tarefas_terc_andar
         SET desc_fechamento = ?, fechamento = NOW(), status = 4
         WHERE id = ?`,
        input.description,
        input.ticketId,
      );
      await this.addInteractionRow(tx, 8, input.ticketId, input.actorUserId, `Finalizou o atendimento.\nDescrição: ${input.description}`);
      return 'updated';
    });
  }

  async activateDue(limit: number): Promise<{ activated: number; truncated: boolean }> {
    const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
    return this.database.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<DueRow[]>(
        `SELECT id
         FROM tarefas_terc_andar
         WHERE status = 0 AND abertura < NOW()
         ORDER BY abertura, id
         LIMIT ?
         FOR UPDATE`,
        safeLimit + 1,
      );
      const due = rows.slice(0, safeLimit);
      for (const row of due) {
        await tx.$executeRawUnsafe(
          'UPDATE tarefas_terc_andar SET status = 1 WHERE id = ? AND status = 0 AND abertura < NOW()',
          row.id,
        );
        await this.addInteractionRow(
          tx,
          1,
          row.id,
          1,
          'Status do atendimento alterado automaticamente para Aguardando Execução.',
        );
      }
      return { activated: due.length, truncated: rows.length > safeLimit };
    });
  }

  private async withLockedVisibleTask<T extends MarketingTicketScope & { ticketId: number }>(
    input: T,
    action: (tx: TxClient, task: LockedTaskRow) => Promise<MarketingTicketCommandResult>,
  ): Promise<MarketingTicketCommandResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) return 'not-found';
    return this.database.$transaction(async (tx) => {
      const task = await this.lockVisibleTask(tx, input.ticketId, input, clientIds);
      if (!task) return 'not-found';
      return action(tx, task);
    });
  }

  private async lockVisibleTask(
    tx: TxClient,
    ticketId: number,
    input: MarketingTicketScope,
    clientIds: number[] | null,
  ): Promise<LockedTaskRow | null> {
    const where = ['t.id = ?'];
    const params: unknown[] = [ticketId];
    this.appendVisibility(where, params, input, clientIds, 't');
    const rows = await tx.$queryRawUnsafe<LockedTaskRow[]>(
      `SELECT t.id, t.status, t.tecnico, t.cliente, t.tipo, t.categoria, t.subcategoria,
              t.item, t.nivel, t.forma, t.desc_abertura
       FROM tarefas_terc_andar t
       INNER JOIN clientes c ON c.clt_id = t.cliente
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );
    return rows[0] ?? null;
  }

  private visibilityWhere(
    input: MarketingTicketListPersistenceInput,
    clientIds: number[] | null,
  ): { where: string[]; params: unknown[] } {
    const where = [`t.status IN (${input.statuses.map(() => '?').join(', ')})`];
    const params: unknown[] = [...input.statuses];
    this.appendVisibility(where, params, input, clientIds, 't');
    if (input.clientId) { where.push('t.cliente = ?'); params.push(input.clientId); }
    if (input.requesterId) { where.push('t.pessoa = ?'); params.push(input.requesterId); }
    if (input.technicianId) { where.push('t.tecnico = ?'); params.push(input.technicianId); }
    if (input.id) { where.push('t.id = ?'); params.push(input.id); }
    if (input.search) {
      where.push('(LOWER(t.nome_tarefa) LIKE LOWER(?) OR LOWER(t.desc_abertura) LIKE LOWER(?) OR LOWER(t.desc_fechamento) LIKE LOWER(?) OR LOWER(c.clt_nomef) LIKE LOWER(?))');
      const q = `%${input.search}%`;
      params.push(q, q, q, q);
    }
    if (input.openedFrom) { where.push('t.abertura >= ?'); params.push(`${input.openedFrom} 00:00:00`); }
    if (input.openedTo) { where.push('t.abertura <= ?'); params.push(`${input.openedTo} 23:59:59`); }
    return { where, params };
  }

  private appendVisibility(
    where: string[],
    params: unknown[],
    input: MarketingTicketScope,
    clientIds: number[] | null,
    alias: string,
  ): void {
    if (clientIds !== null) {
      where.push(`${alias}.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }
    if (input.ownerTechnicianId !== undefined) {
      if (input.includeUnassigned) {
        where.push(`(${alias}.tecnico = ? OR ${alias}.tecnico = 0)`);
      } else {
        where.push(`${alias}.tecnico = ?`);
      }
      params.push(input.ownerTechnicianId);
    }
    if (input.actorUserId === 134) {
      where.push(`(LOWER(${alias}.nome_tarefa) LIKE LOWER(?) OR LOWER(${alias}.desc_abertura) LIKE LOWER(?) OR LOWER(${alias}.desc_fechamento) LIKE LOWER(?))`);
      params.push('%NET DO BRASIL%', '%NET DO BRASIL%', '%NET DO BRASIL%');
    }
  }

  private selectTaskSql(): string {
    return `SELECT
      t.id, t.nome_tarefa, t.desc_abertura, t.desc_fechamento, t.abertura, t.fechamento,
      t.status, t.forma, t.reincidente, t.tecnico,
      c.clt_id, COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS clt_nomef,
      p.pessoa_id, p.pessoa_nom,
      l.local_id, l.local_nom,
      t.tipo, ty.nome AS tipo_nome,
      t.categoria, ca.nome AS cat_nome,
      t.subcategoria, sc.nome AS scat_nome,
      t.nivel, nv.nome AS nivel_nome,
      t.item, it.itens_nome,
      u.user_nome AS tecnico_nome,
      COALESCE(w.espera_segundos, 0) AS espera_segundos,
      ia.ultima_interacao
    FROM tarefas_terc_andar t
    INNER JOIN clientes c ON c.clt_id = t.cliente
    LEFT JOIN pessoas p ON p.pessoa_id = t.pessoa
    LEFT JOIN locais l ON l.local_id = t.local
    LEFT JOIN tipos_terc_andar ty ON ty.id = t.tipo
    LEFT JOIN categorias_terc_andar ca ON ca.id = t.categoria
    LEFT JOIN subcategorias_terc_andar sc ON sc.id = t.subcategoria
    LEFT JOIN niveis_terc_andar nv ON nv.id = t.nivel
    LEFT JOIN itens it ON it.itens_id = t.item
    LEFT JOIN usuarios u ON u.user_id = t.tecnico
    LEFT JOIN (
      SELECT espera_tarefa, SUM(TIMESTAMPDIFF(SECOND, espera_start, COALESCE(espera_end, NOW()))) AS espera_segundos
      FROM espera_terc_andar GROUP BY espera_tarefa
    ) w ON w.espera_tarefa = t.id
    LEFT JOIN (
      SELECT inter_tarefa, MAX(inter_data) AS ultima_interacao
      FROM inter_terc_andar WHERE inter_tipo > 0 GROUP BY inter_tarefa
    ) ia ON ia.inter_tarefa = t.id`;
  }

  private mapTask(row: TaskRow): MarketingTicketListItem {
    const status = (row.status ?? 0) as MarketingTicketStatus;
    return {
      id: row.id,
      name: row.nome_tarefa ?? `#${row.id}`,
      openingDescription: row.desc_abertura,
      closingDescription: row.desc_fechamento,
      openedAt: iso(row.abertura),
      closedAt: iso(row.fechamento),
      status,
      statusLabel: STATUS_LABELS[status] ?? 'Indefinido',
      form: row.forma,
      recurrent: Number(row.reincidente ?? 0) === 1,
      client: party(row.clt_id, row.clt_nomef),
      requester: party(row.pessoa_id, row.pessoa_nom),
      location: party(row.local_id, row.local_nom),
      type: party(row.tipo, row.tipo_nome),
      category: party(row.categoria, row.cat_nome),
      subcategory: party(row.subcategoria, row.scat_nome),
      level: party(row.nivel, row.nivel_nome),
      item: party(row.item, row.itens_nome),
      technician: party(row.tecnico, row.tecnico_nome),
      waitSeconds: Number(row.espera_segundos ?? 0),
      lastActivityAt: iso(row.ultima_interacao),
    };
  }

  private async catalog(table: 'tipos_terc_andar' | 'categorias_terc_andar' | 'subcategorias_terc_andar' | 'niveis_terc_andar'): Promise<TicketCatalogOption[]> {
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT id, nome AS name FROM ${table} WHERE ativo = 1 ORDER BY ordem, nome`,
    );
    return mapOptions(rows);
  }

  private async validCreateReferences(
    client: QueryClient,
    data: MarketingTicketCreatePersistenceInput['data'],
  ): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<CountRow[]>(
      `SELECT (
        EXISTS(SELECT 1 FROM clientes WHERE clt_id = ? AND clt_sts = 1 AND clt_mkt = 1) AND
        (? = 0 OR EXISTS(SELECT 1 FROM pessoas WHERE pessoa_id = ? AND pessoa_clt = ? AND pessoa_sts = 1)) AND
        (? = 0 OR EXISTS(SELECT 1 FROM locais WHERE local_id = ? AND local_clt = ? AND local_sts = 1)) AND
        EXISTS(SELECT 1 FROM tipos_terc_andar WHERE id = ? AND ativo = 1) AND
        EXISTS(SELECT 1 FROM categorias_terc_andar WHERE id = ? AND ativo = 1) AND
        EXISTS(SELECT 1 FROM subcategorias_terc_andar WHERE id = ? AND ativo = 1) AND
        EXISTS(SELECT 1 FROM niveis_terc_andar WHERE id = ? AND ativo = 1) AND
        (? = 0 OR EXISTS(SELECT 1 FROM itens WHERE itens_id = ? AND itens_sts = 1)) AND
        (? = 0 OR EXISTS(
          SELECT 1 FROM usuarios
          WHERE user_id = ? AND user_sts = 1 AND user_id > 1
            AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 1, 1) AS UNSIGNED) >= 1
            AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 3, 1) AS UNSIGNED) >= 2
        )) AND
        ? IN (1,2,3,4)
      ) AS total`,
      data.clientId,
      data.requesterId, data.requesterId, data.clientId,
      data.locationId, data.locationId, data.clientId,
      data.typeId,
      data.categoryId,
      data.subcategoryId,
      data.levelId,
      data.itemId, data.itemId,
      data.technicianId, data.technicianId,
      data.formId,
    );
    return Number(rows[0]?.total ?? 0) === 1;
  }

  private async validClassificationReferences(
    client: QueryClient,
    data: MarketingTicketUpdatePersistenceInput['data'],
  ): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<CountRow[]>(
      `SELECT (
        EXISTS(SELECT 1 FROM tipos_terc_andar WHERE id = ? AND ativo = 1) AND
        EXISTS(SELECT 1 FROM categorias_terc_andar WHERE id = ? AND ativo = 1) AND
        EXISTS(SELECT 1 FROM subcategorias_terc_andar WHERE id = ? AND ativo = 1) AND
        EXISTS(SELECT 1 FROM niveis_terc_andar WHERE id = ? AND ativo = 1) AND
        (? = 0 OR EXISTS(SELECT 1 FROM itens WHERE itens_id = ? AND itens_sts = 1)) AND
        ? IN (1,2,3,4)
      ) AS total`,
      data.typeId,
      data.categoryId,
      data.subcategoryId,
      data.levelId,
      data.itemId, data.itemId,
      data.formId,
    );
    return Number(rows[0]?.total ?? 0) === 1;
  }

  private async validTechnician(client: QueryClient, userId: number): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM usuarios
       WHERE user_id = ? AND user_sts = 1 AND user_id > 1
         AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 1, 1) AS UNSIGNED) >= 1
         AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 3, 1) AS UNSIGNED) >= 2`,
      userId,
    );
    return Number(rows[0]?.total ?? 0) === 1;
  }

  private async userName(client: QueryClient, userId: number): Promise<string> {
    const rows = await client.$queryRawUnsafe<OptionRow[]>(
      'SELECT user_id AS id, user_nome AS name FROM usuarios WHERE user_id = ? LIMIT 1',
      userId,
    );
    return rows[0]?.name ?? `#${userId}`;
  }

  private async addInteractionRow(
    tx: TxClient,
    type: number,
    ticketId: number,
    userId: number,
    description: string,
  ): Promise<void> {
    await tx.$executeRawUnsafe(
      `INSERT INTO inter_terc_andar (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
       VALUES (?, ?, ?, NOW(), ?)`,
      type,
      ticketId,
      userId,
      description,
    );
  }

  private async lockActiveHold(tx: TxClient, ticketId: number): Promise<HoldRow | null> {
    const rows = await tx.$queryRawUnsafe<HoldRow[]>(
      `SELECT espera_id FROM espera_terc_andar
       WHERE espera_tarefa = ? AND espera_end IS NULL
       ORDER BY espera_id DESC LIMIT 1 FOR UPDATE`,
      ticketId,
    );
    return rows[0] ?? null;
  }

  private async userType(userId: number): Promise<number> {
    const rows = await this.database.$queryRawUnsafe<UserTypeRow[]>(
      'SELECT tipo_usuario FROM usuarios WHERE user_id = ? LIMIT 1',
      userId,
    );
    return rows[0]?.tipo_usuario ?? 0;
  }

  private async restrictedClientIds(userId: number): Promise<number[] | null> {
    if ((await this.userType(userId)) !== 2) return null;
    const rows = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      'SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = ?',
      userId,
    );
    return rows.map((row) => row.cliente_id);
  }

  private async canUseMarketingClient(userId: number, clientId: number): Promise<boolean> {
    if (userId === 145 && clientId !== 93) return false;
    const restricted = await this.restrictedClientIds(userId);
    if (restricted !== null && !restricted.includes(clientId)) return false;
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      'SELECT COUNT(*) AS total FROM clientes WHERE clt_id = ? AND clt_sts = 1 AND clt_mkt = 1',
      clientId,
    );
    return Number(rows[0]?.total ?? 0) === 1;
  }
}
