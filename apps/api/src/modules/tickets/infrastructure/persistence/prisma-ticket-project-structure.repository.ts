import { Inject, Injectable } from '@nestjs/common';
import {
  type TicketProjectCreateRequest,
  type TicketProjectStatus,
  type TicketProjectTaskCreateRequest,
  type TicketProjectTaskUpdateRequest,
  type TicketProjectUpdateRequest,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketProjectStructureRepository,
  type CreateTicketProjectPersistenceInput,
  type CreateTicketProjectTaskPersistenceInput,
  type TicketProjectCreatePersistenceResult,
  type TicketProjectStructurePersistenceResult,
  type TicketProjectTaskCreatePersistenceResult,
  type TicketProjectTaskDependencyPersistenceResult,
  type TicketProjectStructureScope,
  type UpdateTicketProjectPersistenceInput,
  type UpdateTicketProjectTaskDependencyPersistenceInput,
  type UpdateTicketProjectTaskPersistenceInput,
} from '../../application/ports/ticket-project-structure.repository';
import { legacyLocalDateTimeDisplay } from '../../domain/legacy-local-date-time';

interface UserTypeRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface CountRow {
  total: bigint | number | string;
}

interface FlagRow {
  value: bigint | number | string;
}

interface InsertIdRow {
  id: bigint | number | string;
}

interface NameRow {
  name: string | null;
}

interface ProjectStructureRow {
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

interface TaskStructureRow {
  id: number;
  status: number | null;
  tecnico: number | null;
  cliente: number;
  id_projeto: number | null;
  tarefas_relacionadas: number | null;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  item: number | null;
  nivel: number | null;
  forma: number | null;
  desc_abertura: string | null;
}

interface DependencyRow {
  id: number;
  id_projeto: number | null;
  tarefas_relacionadas: number | null;
}

type TransactionClient = Pick<
  Nivel3DatabaseClient,
  '$queryRawUnsafe' | '$executeRawUnsafe'
>;

type QueryClient = Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>;

const TECHNICIAN_FUNCTIONS = [8, 9, 10, 11, 12, 13, 14];
const TYPE_IDS = new Set([0, 1, 2, 3, 4, 5, 6]);
const LEVEL_IDS = new Set([0, 1, 2, 3, 4, 5, 6]);
const FORM_IDS = new Set([1, 2, 3, 4]);

function nullableNumber(value: number | null): number {
  return value ?? 0;
}

@Injectable()
export class PrismaTicketProjectStructureRepository
  extends TicketProjectStructureRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async createProject(
    input: CreateTicketProjectPersistenceInput,
  ): Promise<TicketProjectCreatePersistenceResult> {
    const userType = await this.userType(input.actorUserId);
    const restrictedClients = await this.restrictedClientIds(
      input.actorUserId,
      userType,
    );

    if (
      restrictedClients !== null &&
      !restrictedClients.includes(input.data.clientId)
    ) {
      return 'forbidden-client';
    }

    if (input.data.technicianId > 0 && userType !== 1) {
      return 'invalid-reference';
    }

    if (
      !this.validStaticCatalogs(input.data) ||
      !(await this.validCreateReferences(
        this.database,
        input.data.clientId,
        input.data.requesterId,
        input.data.locationId,
        input.data.categoryId,
        input.data.subcategoryId,
        input.data.itemId,
        input.data.technicianId,
      ))
    ) {
      return 'invalid-reference';
    }

    const [recentRows, scheduledRows] = await Promise.all([
      this.database.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) AS total
         FROM projetos
         WHERE abertura > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           AND cliente = ?
           AND categoria = ?
           AND subcategoria = ?`,
        input.data.clientId,
        input.data.categoryId,
        input.data.subcategoryId,
      ),
      this.scheduledFlag(this.database, input.data.openingAt),
    ]);

    const recurrent = Number(recentRows[0]?.total ?? 0) > 0 ? 1 : 0;
    const status = (Number(scheduledRows[0]?.value ?? 0) === 1
      ? 0
      : 1) as TicketProjectStatus;

    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO projetos (
           nome_proj,
           cliente,
           pessoa,
           \`local\`,
           tipo,
           categoria,
           subcategoria,
           item,
           nivel,
           forma,
           desc_abertura,
           abertura,
           tecnico,
           reincidente,
           status
         )
         VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           CAST(REPLACE(?, 'T', ' ') AS DATETIME),
           ?, ?, ?
         )`,
        input.data.name,
        input.data.clientId,
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
        recurrent,
        status,
      );

      const projectId = await this.lastInsertId(transaction, 'projeto');
      const openingDescription =
        status === 0
          ? `Registrou o Agendamento do projeto para ${legacyLocalDateTimeDisplay(input.data.openingAt)}.`
          : 'Registrou solicitação de projeto.';

      await this.addProjectInteraction(
        transaction,
        1,
        projectId,
        input.actorUserId,
        openingDescription,
      );

      await this.addProjectAssignmentInteraction(
        transaction,
        projectId,
        input.actorUserId,
        input.data.technicianId,
      );

      return { id: projectId, status };
    });
  }

  async updateProject(
    input: UpdateTicketProjectPersistenceInput,
  ): Promise<TicketProjectStructurePersistenceResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input.projectId,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      if (
        !this.validStaticCatalogs(input.data) ||
        !(await this.validClassificationReferences(
          transaction,
          input.data.categoryId,
          input.data.subcategoryId,
          input.data.itemId,
        ))
      ) {
        return 'invalid-reference';
      }

      const changes = this.projectChanges(project, input.data);
      if (changes.length === 0) {
        return 'updated';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE projetos
         SET tipo = ?,
             categoria = ?,
             subcategoria = ?,
             item = ?,
             nivel = ?,
             forma = ?,
             desc_abertura = ?
         WHERE id = ?`,
        input.data.typeId,
        input.data.categoryId,
        input.data.subcategoryId,
        input.data.itemId,
        input.data.levelId,
        input.data.formId,
        input.data.openingDescription,
        input.projectId,
      );

      await this.addProjectInteraction(
        transaction,
        9,
        input.projectId,
        input.actorUserId,
        `Editou dados estruturais do projeto.\n${changes.join('\n')}`,
      );

      return 'updated';
    });
  }

  async createTask(
    input: CreateTicketProjectTaskPersistenceInput,
  ): Promise<TicketProjectTaskCreatePersistenceResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    const userType = await this.userType(input.actorUserId);
    if (input.data.technicianId > 0 && userType !== 1) {
      return 'invalid-reference';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input.projectId,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      if (project.status === 4) {
        return 'invalid-state';
      }

      if (
        !this.validStaticCatalogs(input.data) ||
        !(await this.validCreateReferences(
          transaction,
          project.cliente,
          input.data.requesterId,
          input.data.locationId,
          input.data.categoryId,
          input.data.subcategoryId,
          input.data.itemId,
          input.data.technicianId,
        ))
      ) {
        return 'invalid-reference';
      }

      if (
        input.data.dependencyTaskId > 0 &&
        !(await this.dependencyBelongsToProject(
          transaction,
          input.data.dependencyTaskId,
          input.projectId,
        ))
      ) {
        return 'invalid-dependency';
      }

      const [recentRows, scheduledRows] = await Promise.all([
        transaction.$queryRawUnsafe<CountRow[]>(
          `SELECT COUNT(*) AS total
           FROM tarefas
           WHERE abertura > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             AND cliente = ?
             AND categoria = ?
             AND subcategoria = ?`,
          project.cliente,
          input.data.categoryId,
          input.data.subcategoryId,
        ),
        this.scheduledFlag(transaction, input.data.openingAt),
      ]);

      const recurrent = Number(recentRows[0]?.total ?? 0) > 0 ? 1 : 0;
      const status = (Number(scheduledRows[0]?.value ?? 0) === 1
        ? 0
        : 1) as TicketProjectStatus;

      await transaction.$executeRawUnsafe(
        `INSERT INTO tarefas (
           id_projeto,
           nome_tarefa,
           cliente,
           pessoa,
           \`local\`,
           tipo,
           categoria,
           subcategoria,
           item,
           nivel,
           forma,
           desc_abertura,
           abertura,
           tecnico,
           reincidente,
           status,
           dias,
           tarefas_relacionadas
         )
         VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           CAST(REPLACE(?, 'T', ' ') AS DATETIME),
           ?, ?, ?, ?, ?
         )`,
        input.projectId,
        input.data.name,
        project.cliente,
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
        recurrent,
        status,
        input.data.days,
        input.data.dependencyTaskId,
      );

      const taskId = await this.lastInsertId(transaction, 'tarefa');
      const openingDescription =
        status === 0
          ? `Registrou o Agendamento da Tarefa para ${legacyLocalDateTimeDisplay(input.data.openingAt)}.`
          : 'Registrou solicitação de Tarefa.';

      await this.addTaskInteraction(
        transaction,
        1,
        taskId,
        input.actorUserId,
        openingDescription,
      );

      await this.addTaskAssignmentInteraction(
        transaction,
        taskId,
        input.actorUserId,
        input.data.technicianId,
      );

      return { id: taskId, status };
    });
  }

  async updateTask(
    input: UpdateTicketProjectTaskPersistenceInput,
  ): Promise<TicketProjectStructurePersistenceResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (
        !this.validStaticCatalogs(input.data) ||
        !(await this.validClassificationReferences(
          transaction,
          input.data.categoryId,
          input.data.subcategoryId,
          input.data.itemId,
        ))
      ) {
        return 'invalid-reference';
      }

      const changes = this.taskChanges(task, input.data);
      if (changes.length === 0) {
        return 'updated';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET tipo = ?,
             categoria = ?,
             subcategoria = ?,
             item = ?,
             nivel = ?,
             forma = ?,
             desc_abertura = ?
         WHERE id = ?`,
        input.data.typeId,
        input.data.categoryId,
        input.data.subcategoryId,
        input.data.itemId,
        input.data.levelId,
        input.data.formId,
        input.data.openingDescription,
        input.taskId,
      );

      await this.addTaskInteraction(
        transaction,
        9,
        input.taskId,
        input.actorUserId,
        `Editou dados estruturais da tarefa.\n${changes.join('\n')}`,
      );

      return 'updated';
    });
  }

  async updateTaskDependency(
    input: UpdateTicketProjectTaskDependencyPersistenceInput,
  ): Promise<TicketProjectTaskDependencyPersistenceResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (!task.id_projeto || task.id_projeto <= 0) {
        return 'invalid-dependency';
      }

      if (input.dependencyTaskId === input.taskId) {
        return 'dependency-cycle';
      }

      if (input.dependencyTaskId > 0) {
        const dependencyCheck = await this.validateDependencyChain(
          transaction,
          input.taskId,
          task.id_projeto,
          input.dependencyTaskId,
        );
        if (dependencyCheck !== 'valid') {
          return dependencyCheck;
        }
      }

      const previousDependency = nullableNumber(task.tarefas_relacionadas);
      if (previousDependency === input.dependencyTaskId) {
        return 'updated';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET tarefas_relacionadas = ?
         WHERE id = ?`,
        input.dependencyTaskId,
        input.taskId,
      );

      await this.addTaskInteraction(
        transaction,
        9,
        input.taskId,
        input.actorUserId,
        `Alterou dependência da tarefa: ${previousDependency || 'nenhuma'} -> ${input.dependencyTaskId || 'nenhuma'}.`,
      );

      return 'updated';
    });
  }

  private validStaticCatalogs(
    input:
      | TicketProjectCreateRequest
      | TicketProjectTaskCreateRequest
      | TicketProjectUpdateRequest
      | TicketProjectTaskUpdateRequest,
  ): boolean {
    return (
      TYPE_IDS.has(input.typeId) &&
      LEVEL_IDS.has(input.levelId) &&
      FORM_IDS.has(input.formId)
    );
  }

  private async validCreateReferences(
    client: QueryClient,
    clientId: number,
    requesterId: number,
    locationId: number,
    categoryId: number,
    subcategoryId: number,
    itemId: number,
    technicianId: number,
  ): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<FlagRow[]>(
      `SELECT (
         EXISTS(
           SELECT 1 FROM clientes
           WHERE clt_id = ? AND clt_sts = 1
         ) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM pessoas
           WHERE pessoa_id = ? AND pessoa_clt = ? AND pessoa_sts = 1
         )) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM locais
           WHERE local_id = ? AND local_clt = ? AND local_sts = 1
         )) AND
         EXISTS(
           SELECT 1 FROM categorias
           WHERE cat_id = ? AND cat_sts = 1 AND cat_setor = 1
         ) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM subcategorias
           WHERE scat_id = ? AND scat_cat = ? AND scat_sts = 1
         )) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM itens
           WHERE itens_id = ? AND itens_scat = ? AND itens_sts = 1
         )) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM usuarios
           WHERE user_id = ? AND user_sts = 1
             AND user_funcao IN (${TECHNICIAN_FUNCTIONS.join(',')})
         ))
       ) AS value`,
      clientId,
      requesterId,
      requesterId,
      clientId,
      locationId,
      locationId,
      clientId,
      categoryId,
      subcategoryId,
      subcategoryId,
      categoryId,
      itemId,
      itemId,
      subcategoryId,
      technicianId,
      technicianId,
    );

    return Number(rows[0]?.value ?? 0) === 1;
  }

  private async validClassificationReferences(
    client: QueryClient,
    categoryId: number,
    subcategoryId: number,
    itemId: number,
  ): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<FlagRow[]>(
      `SELECT (
         EXISTS(
           SELECT 1 FROM categorias
           WHERE cat_id = ? AND cat_sts = 1 AND cat_setor = 1
         ) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM subcategorias
           WHERE scat_id = ? AND scat_cat = ? AND scat_sts = 1
         )) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM itens
           WHERE itens_id = ? AND itens_scat = ? AND itens_sts = 1
         ))
       ) AS value`,
      categoryId,
      subcategoryId,
      subcategoryId,
      categoryId,
      itemId,
      itemId,
      subcategoryId,
    );

    return Number(rows[0]?.value ?? 0) === 1;
  }

  private async scheduledFlag(
    client: QueryClient,
    openingAt: string,
  ): Promise<FlagRow[]> {
    return client.$queryRawUnsafe<FlagRow[]>(
      `SELECT CASE
         WHEN CAST(REPLACE(?, 'T', ' ') AS DATETIME) > NOW() THEN 1
         ELSE 0
       END AS value`,
      openingAt,
    );
  }

  private async lastInsertId(
    transaction: TransactionClient,
    label: string,
  ): Promise<number> {
    const rows = await transaction.$queryRawUnsafe<InsertIdRow[]>(
      'SELECT LAST_INSERT_ID() AS id',
    );
    const id = Number(rows[0]?.id ?? 0);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error(`Não foi possível identificar o ${label} criado.`);
    }
    return id;
  }

  private async addProjectInteraction(
    transaction: TransactionClient,
    type: number,
    projectId: number,
    actorUserId: number,
    description: string,
  ): Promise<void> {
    await transaction.$executeRawUnsafe(
      `INSERT INTO inter_projeto (
         inter_tipo,
         inter_projeto,
         inter_user,
         inter_data,
         inter_desc
       ) VALUES (?, ?, ?, NOW(), ?)`,
      type,
      projectId,
      actorUserId,
      description,
    );
  }

  private async addTaskInteraction(
    transaction: TransactionClient,
    type: number,
    taskId: number,
    actorUserId: number,
    description: string,
  ): Promise<void> {
    await transaction.$executeRawUnsafe(
      `INSERT INTO inter_tarefa (
         inter_tipo,
         inter_tarefa,
         inter_user,
         inter_data,
         inter_desc
       ) VALUES (?, ?, ?, NOW(), ?)`,
      type,
      taskId,
      actorUserId,
      description,
    );
  }

  private async addProjectAssignmentInteraction(
    transaction: TransactionClient,
    projectId: number,
    actorUserId: number,
    technicianId: number,
  ): Promise<void> {
    if (technicianId <= 0 || technicianId === actorUserId) {
      return;
    }

    const name = await this.technicianName(transaction, technicianId);
    await this.addProjectInteraction(
      transaction,
      4,
      projectId,
      actorUserId,
      `Direcionou o projeto para ${name}.`,
    );
  }

  private async addTaskAssignmentInteraction(
    transaction: TransactionClient,
    taskId: number,
    actorUserId: number,
    technicianId: number,
  ): Promise<void> {
    if (technicianId <= 0 || technicianId === actorUserId) {
      return;
    }

    const name = await this.technicianName(transaction, technicianId);
    await this.addTaskInteraction(
      transaction,
      4,
      taskId,
      actorUserId,
      `Direcionou a tarefa para ${name}.`,
    );
  }

  private async technicianName(
    client: QueryClient,
    technicianId: number,
  ): Promise<string> {
    const rows = await client.$queryRawUnsafe<NameRow[]>(
      `SELECT user_nome AS name
       FROM usuarios
       WHERE user_id = ?
       LIMIT 1`,
      technicianId,
    );
    return rows[0]?.name ?? `#${technicianId}`;
  }

  private async lockVisibleProject(
    transaction: TransactionClient,
    projectId: number,
    scope: TicketProjectStructureScope,
    clientIds: number[] | null,
  ): Promise<ProjectStructureRow | null> {
    const where = ['p.id = ?'];
    const params: unknown[] = [projectId];

    if (clientIds !== null) {
      where.push(`p.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }

    if (scope.ownerTechnicianId !== undefined) {
      where.push('p.tecnico = ?');
      params.push(scope.ownerTechnicianId);
    }

    const rows = await transaction.$queryRawUnsafe<ProjectStructureRow[]>(
      `SELECT
         p.id,
         p.status,
         p.tecnico,
         p.cliente,
         p.tipo,
         p.categoria,
         p.subcategoria,
         p.item,
         p.nivel,
         p.forma,
         p.desc_abertura
       FROM projetos p
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );

    return rows[0] ?? null;
  }

  private async lockVisibleTask(
    transaction: TransactionClient,
    input: TicketProjectStructureScope & { taskId: number },
    clientIds: number[] | null,
  ): Promise<TaskStructureRow | null> {
    const where = ['t.id = ?'];
    const params: unknown[] = [input.taskId];

    if (clientIds !== null) {
      where.push(`t.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }

    if (input.ownerTechnicianId !== undefined) {
      where.push('t.tecnico = ?');
      params.push(input.ownerTechnicianId);
    }

    if (input.actorUserId === 134) {
      where.push(
        '(LOWER(t.nome_tarefa) LIKE LOWER(?) OR LOWER(t.desc_abertura) LIKE LOWER(?) OR LOWER(t.desc_fechamento) LIKE LOWER(?) OR LOWER(c.clt_nomef) LIKE LOWER(?))',
      );
      params.push(
        '%NET DO BRASIL%',
        '%NET DO BRASIL%',
        '%NET DO BRASIL%',
        '%NET DO BRASIL%',
      );
    }

    const rows = await transaction.$queryRawUnsafe<TaskStructureRow[]>(
      `SELECT
         t.id,
         t.status,
         t.tecnico,
         t.cliente,
         t.id_projeto,
         t.tarefas_relacionadas,
         t.tipo,
         t.categoria,
         t.subcategoria,
         t.item,
         t.nivel,
         t.forma,
         t.desc_abertura
       FROM tarefas t
       INNER JOIN clientes c ON c.clt_id = t.cliente
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );

    return rows[0] ?? null;
  }

  private async dependencyBelongsToProject(
    transaction: TransactionClient,
    dependencyTaskId: number,
    projectId: number,
  ): Promise<boolean> {
    const rows = await transaction.$queryRawUnsafe<DependencyRow[]>(
      `SELECT id, id_projeto, tarefas_relacionadas
       FROM tarefas
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      dependencyTaskId,
    );
    return rows[0]?.id_projeto === projectId;
  }

  private async validateDependencyChain(
    transaction: TransactionClient,
    taskId: number,
    projectId: number,
    dependencyTaskId: number,
  ): Promise<'valid' | 'invalid-dependency' | 'dependency-cycle'> {
    let current = dependencyTaskId;
    const seen = new Set<number>([taskId]);

    for (let depth = 0; depth < 100; depth += 1) {
      if (seen.has(current)) {
        return 'dependency-cycle';
      }
      seen.add(current);

      const rows = await transaction.$queryRawUnsafe<DependencyRow[]>(
        `SELECT id, id_projeto, tarefas_relacionadas
         FROM tarefas
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        current,
      );
      const row = rows[0];

      if (!row || row.id_projeto !== projectId) {
        return 'invalid-dependency';
      }

      const next = nullableNumber(row.tarefas_relacionadas);
      if (next <= 0) {
        return 'valid';
      }

      current = next;
    }

    return 'dependency-cycle';
  }

  private projectChanges(
    row: ProjectStructureRow,
    data: TicketProjectUpdateRequest,
  ): string[] {
    return this.structureChanges(row, data);
  }

  private taskChanges(
    row: TaskStructureRow,
    data: TicketProjectTaskUpdateRequest,
  ): string[] {
    return this.structureChanges(row, data);
  }

  private structureChanges(
    row: {
      tipo: number | null;
      categoria: number | null;
      subcategoria: number | null;
      item: number | null;
      nivel: number | null;
      forma: number | null;
      desc_abertura: string | null;
    },
    data: TicketProjectUpdateRequest | TicketProjectTaskUpdateRequest,
  ): string[] {
    const changes: string[] = [];
    const numeric: Array<[string, number, number]> = [
      ['tipo', nullableNumber(row.tipo), data.typeId],
      ['categoria', nullableNumber(row.categoria), data.categoryId],
      ['subcategoria', nullableNumber(row.subcategoria), data.subcategoryId],
      ['item', nullableNumber(row.item), data.itemId],
      ['nível', nullableNumber(row.nivel), data.levelId],
      ['forma', nullableNumber(row.forma), data.formId],
    ];

    for (const [label, before, after] of numeric) {
      if (before !== after) {
        changes.push(`${label}: ${before} -> ${after}`);
      }
    }

    const beforeDescription = row.desc_abertura ?? '';
    if (beforeDescription !== data.openingDescription) {
      changes.push('descrição de abertura alterada');
    }

    return changes;
  }

  private async userType(userId: number): Promise<number> {
    const rows = await this.database.$queryRawUnsafe<UserTypeRow[]>(
      `SELECT tipo_usuario
       FROM usuarios
       WHERE user_id = ?
       LIMIT 1`,
      userId,
    );
    return rows[0]?.tipo_usuario ?? 0;
  }

  private async restrictedClientIds(
    userId: number,
    knownUserType?: number,
  ): Promise<number[] | null> {
    const userType = knownUserType ?? (await this.userType(userId));
    if (userType !== 2) {
      return null;
    }

    const rows = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      `SELECT cliente_id
       FROM clientes_usuarios
       WHERE usuario_id = ?`,
      userId,
    );
    return rows.map((row) => row.cliente_id);
  }
}
