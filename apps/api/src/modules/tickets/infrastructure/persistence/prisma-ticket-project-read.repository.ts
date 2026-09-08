import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketFilterOption,
  TicketFilterOptions,
  TicketListParty,
  TicketProjectFilters,
  TicketProjectListItem,
  TicketProjectStatus,
  TicketProjectTaskFilters,
  TicketProjectTaskListItem,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketProjectReadRepository,
  type TicketProjectReadQuery,
  type TicketProjectReadResult,
} from '../../application/ports/ticket-project-read.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface CountRow {
  total: bigint | number | string;
}

interface OptionRow {
  id: number;
  name: string;
}

interface ProjectRow {
  id: number;
  nome_proj: string | null;
  status: number | null;
  nivel: number | null;
  forma: number | null;
  abertura: Date | string | null;
  desc_abertura: string | null;
  cliente_id: number | null;
  cliente_nome: string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  local_id: number | null;
  local_nome: string | null;
  categoria_id: number | null;
  categoria_nome: string | null;
  subcategoria_id: number | null;
  subcategoria_nome: string | null;
  item_id: number | null;
  item_nome: string | null;
  tecnico_id: number | null;
  tecnico_nome: string | null;
  espera_segundos: bigint | number | string | null;
  ultima_interacao: Date | string | null;
}

interface TaskRow extends ProjectRow {
  id_projeto: number | null;
  nome_projeto: string | null;
  nome_tarefa: string | null;
  desc_fechamento: string | null;
  fechamento: Date | string | null;
  dias: number | null;
}

interface Visibility {
  restrictClients: boolean;
  clientIds: number[];
}

interface BuiltWhere {
  sql: string;
  params: unknown[];
}

const PROJECT_SORT_SQL: Record<TicketProjectFilters['sort'], string> = {
  id: 'projetos.id',
  client: 'clientes.clt_nomef',
  openedAt: 'projetos.abertura',
  level: 'projetos.nivel',
  form: 'projetos.forma',
  technician: 'tecnico.user_nome',
  status: 'projetos.status',
};

const TASK_SORT_SQL: Record<TicketProjectTaskFilters['sort'], string> = {
  id: 'tarefas.id',
  client: 'clientes.clt_nomef',
  openedAt: 'tarefas.abertura',
  level: 'tarefas.nivel',
  form: 'tarefas.forma',
  technician: 'tecnico.user_nome',
  status: 'tarefas.status',
  project: 'tarefas.id_projeto',
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

function toNumber(value: bigint | number | string | null): number {
  if (value === null) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function status(value: number | null): TicketProjectStatus {
  if (value !== null && value >= 0 && value <= 4) {
    return value as TicketProjectStatus;
  }

  return 1;
}

function statusLabel(value: TicketProjectStatus, task = false): string {
  const labels: Record<TicketProjectStatus, string> = {
    0: task ? 'Agendada' : 'Agendado',
    1: 'Aguardando',
    2: 'Em execução',
    3: 'Em espera',
    4: task ? 'Finalizada' : 'Concluído',
  };

  return labels[value];
}

function party(id: number | null, name: string | null): TicketListParty {
  return { id, name };
}

function appendInFilter(
  where: string[],
  params: unknown[],
  column: string,
  values: number[],
) {
  const normalized = [
    ...new Set(
      values.filter((value) => Number.isInteger(value) && value >= 0),
    ),
  ];

  if (normalized.length === 0) {
    return;
  }

  where.push(`${column} IN (${normalized.map(() => '?').join(', ')})`);
  params.push(...normalized);
}

@Injectable()
export class PrismaTicketProjectReadRepository extends TicketProjectReadRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async listProjects(
    query: TicketProjectReadQuery<TicketProjectFilters>,
  ): Promise<TicketProjectReadResult<TicketProjectListItem>> {
    const visibility = await this.resolveVisibility(query.userId);

    if (visibility.restrictClients && visibility.clientIds.length === 0) {
      return {
        data: [],
        total: 0,
        options: await this.fetchOptions(undefined, visibility),
      };
    }

    const where = this.buildProjectWhere(query, visibility);
    const from = `
      FROM projetos
      INNER JOIN clientes ON projetos.cliente = clientes.clt_id
      LEFT JOIN pessoas ON projetos.pessoa = pessoas.pessoa_id
      LEFT JOIN locais ON projetos.local = locais.local_id
      LEFT JOIN categorias ON projetos.categoria = categorias.cat_id
      LEFT JOIN subcategorias ON projetos.subcategoria = subcategorias.scat_id
      LEFT JOIN itens ON projetos.item = itens.itens_id
      LEFT JOIN usuarios AS tecnico ON projetos.tecnico = tecnico.user_id
    `;

    const countRows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total ${from} ${where.sql}`,
      ...where.params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const options = await this.fetchOptions(query.filters.clientId, visibility);

    if (total === 0) {
      return { data: [], total, options };
    }

    const direction = query.filters.direction === 'desc' ? 'DESC' : 'ASC';
    const order = PROJECT_SORT_SQL[query.filters.sort];
    const offset = (query.page - 1) * query.limit;

    const rows = await this.database.$queryRawUnsafe<ProjectRow[]>(
      `
      SELECT
        projetos.id,
        projetos.nome_proj,
        projetos.status,
        projetos.nivel,
        projetos.forma,
        projetos.abertura,
        projetos.desc_abertura,
        clientes.clt_id AS cliente_id,
        clientes.clt_nomef AS cliente_nome,
        pessoas.pessoa_id AS pessoa_id,
        pessoas.pessoa_nom AS pessoa_nome,
        locais.local_id AS local_id,
        locais.local_nom AS local_nome,
        categorias.cat_id AS categoria_id,
        categorias.cat_nome AS categoria_nome,
        subcategorias.scat_id AS subcategoria_id,
        subcategorias.scat_nome AS subcategoria_nome,
        itens.itens_id AS item_id,
        itens.itens_nome AS item_nome,
        tecnico.user_id AS tecnico_id,
        tecnico.user_nome AS tecnico_nome,
        COALESCE((
          SELECT SUM(
            TIMESTAMPDIFF(
              SECOND,
              espera_projeto.espera_start,
              COALESCE(espera_projeto.espera_end, NOW())
            )
          )
          FROM espera_projeto
          WHERE espera_projeto.espera_projeto = projetos.id
        ), 0) AS espera_segundos,
        (
          SELECT MAX(inter_projeto.inter_data)
          FROM inter_projeto
          WHERE inter_projeto.inter_projeto = projetos.id
            AND inter_projeto.inter_tipo > 0
        ) AS ultima_interacao
      ${from}
      ${where.sql}
      ORDER BY ${order} ${direction}, projetos.id DESC
      LIMIT ? OFFSET ?
      `,
      ...where.params,
      query.limit,
      offset,
    );

    return {
      data: rows.map((row) => this.mapProject(row)),
      total,
      options,
    };
  }

  async listTasks(
    query: TicketProjectReadQuery<TicketProjectTaskFilters>,
  ): Promise<TicketProjectReadResult<TicketProjectTaskListItem>> {
    const visibility = await this.resolveVisibility(query.userId);

    if (visibility.restrictClients && visibility.clientIds.length === 0) {
      return {
        data: [],
        total: 0,
        options: await this.fetchOptions(undefined, visibility),
      };
    }

    const where = this.buildTaskWhere(query, visibility);
    const from = `
      FROM tarefas
      INNER JOIN clientes ON tarefas.cliente = clientes.clt_id
      LEFT JOIN pessoas ON tarefas.pessoa = pessoas.pessoa_id
      LEFT JOIN locais ON tarefas.local = locais.local_id
      LEFT JOIN categorias ON tarefas.categoria = categorias.cat_id
      LEFT JOIN subcategorias ON tarefas.subcategoria = subcategorias.scat_id
      LEFT JOIN itens ON tarefas.item = itens.itens_id
      LEFT JOIN usuarios AS tecnico ON tarefas.tecnico = tecnico.user_id
      LEFT JOIN projetos ON tarefas.id_projeto = projetos.id
    `;

    const countRows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total ${from} ${where.sql}`,
      ...where.params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const options = await this.fetchOptions(query.filters.clientId, visibility);

    if (total === 0) {
      return { data: [], total, options };
    }

    const direction = query.filters.direction === 'desc' ? 'DESC' : 'ASC';
    const order = TASK_SORT_SQL[query.filters.sort];
    const offset = (query.page - 1) * query.limit;

    const rows = await this.database.$queryRawUnsafe<TaskRow[]>(
      `
      SELECT
        tarefas.id,
        tarefas.id_projeto,
        projetos.nome_proj AS nome_projeto,
        tarefas.nome_tarefa,
        tarefas.dias,
        tarefas.status,
        tarefas.nivel,
        tarefas.forma,
        tarefas.abertura,
        tarefas.fechamento,
        tarefas.desc_abertura,
        tarefas.desc_fechamento,
        clientes.clt_id AS cliente_id,
        clientes.clt_nomef AS cliente_nome,
        pessoas.pessoa_id AS pessoa_id,
        pessoas.pessoa_nom AS pessoa_nome,
        locais.local_id AS local_id,
        locais.local_nom AS local_nome,
        categorias.cat_id AS categoria_id,
        categorias.cat_nome AS categoria_nome,
        subcategorias.scat_id AS subcategoria_id,
        subcategorias.scat_nome AS subcategoria_nome,
        itens.itens_id AS item_id,
        itens.itens_nome AS item_nome,
        tecnico.user_id AS tecnico_id,
        tecnico.user_nome AS tecnico_nome,
        COALESCE((
          SELECT SUM(
            TIMESTAMPDIFF(
              SECOND,
              espera_tarefas.espera_start,
              COALESCE(espera_tarefas.espera_end, NOW())
            )
          )
          FROM espera_tarefas
          WHERE espera_tarefas.espera_tarefa = tarefas.id
        ), 0) AS espera_segundos,
        (
          SELECT MAX(inter_tarefa.inter_data)
          FROM inter_tarefa
          WHERE inter_tarefa.inter_tarefa = tarefas.id
            AND inter_tarefa.inter_tipo > 0
        ) AS ultima_interacao
      ${from}
      ${where.sql}
      ORDER BY CASE WHEN tarefas.status = 4 THEN 1 ELSE 0 END ASC,
        ${order} ${direction},
        tarefas.id DESC
      LIMIT ? OFFSET ?
      `,
      ...where.params,
      query.limit,
      offset,
    );

    return {
      data: rows.map((row) => this.mapTask(row)),
      total,
      options,
    };
  }

  private buildProjectWhere(
    query: TicketProjectReadQuery<TicketProjectFilters>,
    visibility: Visibility,
  ): BuiltWhere {
    const where: string[] = [];
    const params: unknown[] = [];
    const filters = query.filters;

    appendInFilter(where, params, 'projetos.status', filters.statuses);
    this.appendCommonWhere(
      where,
      params,
      'projetos',
      filters,
      visibility,
      query.ownerTechnicianId,
    );

    if (filters.search) {
      where.push(
        '(LOWER(projetos.nome_proj) LIKE LOWER(?) OR LOWER(projetos.desc_abertura) LIKE LOWER(?) OR LOWER(clientes.clt_nomef) LIKE LOWER(?))',
      );
      const like = `%${filters.search}%`;
      params.push(like, like, like);
    }

    if (filters.openedFrom) {
      where.push('projetos.abertura >= ?');
      params.push(`${filters.openedFrom} 00:00:00`);
    }

    if (filters.openedTo) {
      where.push('projetos.abertura <= ?');
      params.push(`${filters.openedTo} 23:59:59`);
    }

    return {
      sql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
      params,
    };
  }

  private buildTaskWhere(
    query: TicketProjectReadQuery<TicketProjectTaskFilters>,
    visibility: Visibility,
  ): BuiltWhere {
    const where: string[] = [];
    const params: unknown[] = [];
    const filters = query.filters;

    appendInFilter(where, params, 'tarefas.status', filters.statuses);
    this.appendCommonWhere(
      where,
      params,
      'tarefas',
      filters,
      visibility,
      query.ownerTechnicianId,
    );

    if (filters.projectId) {
      where.push('tarefas.id_projeto = ?');
      params.push(filters.projectId);
    }

    const effectiveSearch =
      query.userId === 134 && !filters.search
        ? 'NET DO BRASIL'
        : filters.search;

    if (effectiveSearch) {
      where.push(
        '(LOWER(tarefas.nome_tarefa) LIKE LOWER(?) OR LOWER(tarefas.desc_abertura) LIKE LOWER(?) OR LOWER(tarefas.desc_fechamento) LIKE LOWER(?) OR LOWER(clientes.clt_nomef) LIKE LOWER(?))',
      );
      const like = `%${effectiveSearch}%`;
      params.push(like, like, like, like);
    }

    if (filters.openedFrom) {
      where.push('tarefas.abertura >= ?');
      params.push(`${filters.openedFrom} 00:00:00`);
    }

    if (filters.openedTo) {
      where.push('tarefas.abertura <= ?');
      params.push(`${filters.openedTo} 23:59:59`);
    }

    return {
      sql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
      params,
    };
  }

  private appendCommonWhere(
    where: string[],
    params: unknown[],
    alias: 'projetos' | 'tarefas',
    filters: {
      clientId?: number;
      requesterId?: number;
      technicianId?: number;
      id?: number;
    },
    visibility: Visibility,
    ownerTechnicianId?: number,
  ) {
    if (filters.clientId) {
      where.push(`${alias}.cliente = ?`);
      params.push(filters.clientId);
    }

    if (filters.requesterId) {
      where.push(`${alias}.pessoa = ?`);
      params.push(filters.requesterId);
    }

    if (filters.technicianId) {
      where.push(`${alias}.tecnico = ?`);
      params.push(filters.technicianId);
    }

    if (filters.id) {
      where.push(`${alias}.id = ?`);
      params.push(filters.id);
    }

    if (visibility.restrictClients) {
      appendInFilter(where, params, `${alias}.cliente`, visibility.clientIds);
    }

    if (ownerTechnicianId) {
      where.push(`${alias}.tecnico = ?`);
      params.push(ownerTechnicianId);
    }
  }

  private async resolveVisibility(userId: number): Promise<Visibility> {
    const users = await this.database.$queryRawUnsafe<VisibilityRow[]>(
      `SELECT tipo_usuario
       FROM usuarios
       WHERE user_id = ?
       LIMIT 1`,
      userId,
    );

    if (users[0]?.tipo_usuario !== 2) {
      return {
        restrictClients: false,
        clientIds: [],
      };
    }

    const clients = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      `SELECT cliente_id
       FROM clientes_usuarios
       WHERE usuario_id = ?`,
      userId,
    );

    return {
      restrictClients: true,
      clientIds: clients.map((row) => row.cliente_id),
    };
  }

  private async fetchOptions(
    selectedClientId: number | undefined,
    visibility: Visibility,
  ): Promise<TicketFilterOptions> {
    const [clients, requesters, technicians] = await Promise.all([
      this.fetchClients(visibility),
      selectedClientId
        ? this.database.$queryRawUnsafe<OptionRow[]>(
            `SELECT pessoa_id AS id, pessoa_nom AS name
             FROM pessoas
             WHERE pessoa_clt = ?
             ORDER BY pessoa_nom ASC`,
            selectedClientId,
          )
        : Promise.resolve<OptionRow[]>([]),
      this.database.$queryRawUnsafe<OptionRow[]>(
        `SELECT user_id AS id, user_nome AS name
         FROM usuarios
         WHERE user_sts = '1'
           AND user_id > 1
           AND user_funcao IN (2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14)
         ORDER BY user_nome ASC`,
      ),
    ]);

    return {
      clients: clients.map(this.mapOption),
      requesters: requesters.map(this.mapOption),
      technicians: technicians.map(this.mapOption),
    };
  }

  private async fetchClients(visibility: Visibility): Promise<OptionRow[]> {
    const where = ["clt_sts = '1'"];
    const params: unknown[] = [];

    if (visibility.restrictClients) {
      appendInFilter(where, params, 'clt_id', visibility.clientIds);
    }

    return this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT clt_id AS id, clt_nomef AS name
       FROM clientes
       WHERE ${where.join(' AND ')}
       ORDER BY clt_nomef ASC`,
      ...params,
    );
  }

  private mapOption(row: OptionRow): TicketFilterOption {
    return { id: row.id, name: row.name };
  }

  private mapProject(row: ProjectRow): TicketProjectListItem {
    const projectStatus = status(row.status);

    return {
      id: row.id,
      name: row.nome_proj ?? '',
      openingDescription: row.desc_abertura,
      openedAt: toIsoString(row.abertura),
      status: projectStatus,
      statusLabel: statusLabel(projectStatus),
      level: row.nivel,
      form: row.forma,
      client: party(row.cliente_id, row.cliente_nome),
      requester: party(row.pessoa_id, row.pessoa_nome),
      location: party(row.local_id, row.local_nome),
      category: party(row.categoria_id, row.categoria_nome),
      subcategory: party(row.subcategoria_id, row.subcategoria_nome),
      item: party(row.item_id, row.item_nome),
      technician: party(row.tecnico_id, row.tecnico_nome),
      waitSeconds: toNumber(row.espera_segundos),
      lastActivityAt: toIsoString(row.ultima_interacao),
    };
  }

  private mapTask(row: TaskRow): TicketProjectTaskListItem {
    const taskStatus = status(row.status);

    return {
      id: row.id,
      project: party(row.id_projeto, row.nome_projeto),
      name: row.nome_tarefa ?? '',
      openingDescription: row.desc_abertura,
      closingDescription: row.desc_fechamento,
      openedAt: toIsoString(row.abertura),
      closedAt: toIsoString(row.fechamento),
      days: row.dias,
      status: taskStatus,
      statusLabel: statusLabel(taskStatus, true),
      level: row.nivel,
      form: row.forma,
      client: party(row.cliente_id, row.cliente_nome),
      requester: party(row.pessoa_id, row.pessoa_nome),
      location: party(row.local_id, row.local_nome),
      category: party(row.categoria_id, row.categoria_nome),
      subcategory: party(row.subcategoria_id, row.subcategoria_nome),
      item: party(row.item_id, row.item_nome),
      technician: party(row.tecnico_id, row.tecnico_nome),
      waitSeconds: toNumber(row.espera_segundos),
      lastActivityAt: toIsoString(row.ultima_interacao),
    };
  }
}
