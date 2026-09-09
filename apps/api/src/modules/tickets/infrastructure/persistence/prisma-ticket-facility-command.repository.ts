import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketFacilityClassificationRequest,
  TicketFacilityCreateRequest,
  TicketFacilityStatus,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketFacilityCommandRepository,
  type CreateTicketFacilityPersistenceInput,
  type TicketFacilityAssignmentPersistenceInput,
  type TicketFacilityAssignmentResult,
  type TicketFacilityClassificationResult,
  type TicketFacilityCommandResult,
  type TicketFacilityCommandScope,
  type TicketFacilityCreatePersistenceResult,
  type TicketFacilityFinalizePersistenceInput,
  type TicketFacilityHoldPersistenceInput,
  type TicketFacilityHoldResult,
  type TicketFacilityInteractionPersistenceInput,
  type TicketFacilityRejectionPersistenceInput,
  type TicketFacilityRejectionResult,
  type TicketFacilityResumeResult,
  type UpdateTicketFacilityClassificationPersistenceInput,
} from '../../application/ports/ticket-facility-command.repository';
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

interface FacilityRow {
  id: number;
  status: number | null;
  tecnico: number | null;
  cliente: number;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  nivel: number | null;
}

interface TechnicianRow {
  id: number;
  name: string;
}

interface ActiveHoldRow {
  espera_id: number;
}

type TransactionClient = Pick<
  Nivel3DatabaseClient,
  '$queryRawUnsafe' | '$executeRawUnsafe'
>;

type QueryClient = Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>;

const TECHNICIAN_FUNCTIONS = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14];
const TYPE_IDS = new Set([0, 1, 2, 3, 4, 5, 6]);
const LEVEL_IDS = new Set([0, 1, 2, 3, 4, 5, 6]);
const FORM_IDS = new Set([1, 2, 3, 4]);

@Injectable()
export class PrismaTicketFacilityCommandRepository
  extends TicketFacilityCommandRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async create(
    input: CreateTicketFacilityPersistenceInput,
  ): Promise<TicketFacilityCreatePersistenceResult> {
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
      !this.validCreateStaticCatalogs(input.data) ||
      !(await this.validCreateReferences(this.database, input.data))
    ) {
      return 'invalid-reference';
    }

    const [recentRows, scheduledRows] = await Promise.all([
      this.database.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) AS total
         FROM facility
         WHERE abertura > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           AND cliente = ?
           AND categoria = ?
           AND subcategoria = ?`,
        input.data.clientId,
        input.data.categoryId,
        input.data.subcategoryId,
      ),
      this.database.$queryRawUnsafe<FlagRow[]>(
        `SELECT CASE
           WHEN CAST(REPLACE(?, 'T', ' ') AS DATETIME) > NOW() THEN 1
           ELSE 0
         END AS value`,
        input.data.openingAt,
      ),
    ]);

    const recurrent = Number(recentRows[0]?.total ?? 0) > 0 ? 1 : 0;
    const status = (Number(scheduledRows[0]?.value ?? 0) === 1
      ? 0
      : 1) as TicketFacilityStatus;

    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO facility (
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
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           CAST(REPLACE(?, 'T', ' ') AS DATETIME),
           ?, ?, ?
         )`,
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

      const facilityId = await this.lastInsertId(transaction);
      const openingDescription =
        status === 0
          ? `Registrou o Agendamento do Atendimento para ${legacyLocalDateTimeDisplay(input.data.openingAt)}.`
          : 'Registrou solicitação de Atendimento.';

      await this.insertInteraction(
        transaction,
        1,
        facilityId,
        input.actorUserId,
        openingDescription,
      );

      if (
        input.data.technicianId > 0 &&
        input.data.technicianId !== input.actorUserId
      ) {
        const technician = await this.technician(
          transaction,
          input.data.technicianId,
        );

        if (!technician) {
          throw new Error('Técnico deixou de estar disponível durante a criação.');
        }

        await this.insertInteraction(
          transaction,
          4,
          facilityId,
          input.actorUserId,
          `Direcionou o atendimento para ${technician.name}.`,
        );
      }

      return { id: facilityId, status };
    });
  }

  async updateClassification(
    input: UpdateTicketFacilityClassificationPersistenceInput,
  ): Promise<TicketFacilityClassificationResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const facility = await this.lockVisibleFacility(
        transaction,
        input,
        clientIds,
      );
      if (!facility) {
        return 'not-found';
      }

      if (
        !this.validClassificationStaticCatalogs(input.data) ||
        !(await this.validClassificationReferences(transaction, input.data))
      ) {
        return 'invalid-reference';
      }

      const changes = this.classificationChanges(facility, input.data);
      if (changes.length === 0) {
        return 'updated';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE facility
         SET tipo = ?,
             categoria = ?,
             subcategoria = ?,
             nivel = ?
         WHERE id = ?`,
        input.data.typeId,
        input.data.categoryId,
        input.data.subcategoryId,
        input.data.levelId,
        input.facilityId,
      );

      await this.insertInteraction(
        transaction,
        9,
        input.facilityId,
        input.actorUserId,
        `Editou a classificação do atendimento Facility.\n${changes.join('\n')}`,
      );

      return 'updated';
    });
  }

  async addInteraction(
    input: TicketFacilityInteractionPersistenceInput,
  ): Promise<TicketFacilityCommandResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const facility = await this.lockVisibleFacility(
        transaction,
        input,
        clientIds,
      );
      if (!facility) {
        return 'not-found';
      }

      await this.insertInteraction(
        transaction,
        7,
        input.facilityId,
        input.actorUserId,
        input.description,
      );

      return 'updated';
    });
  }

  async assign(
    input: TicketFacilityAssignmentPersistenceInput,
  ): Promise<TicketFacilityAssignmentResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const facility = await this.lockVisibleFacility(
        transaction,
        input,
        clientIds,
      );
      if (!facility) {
        return 'not-found';
      }

      if (facility.status !== 1) {
        return 'invalid-state';
      }

      const technician = await this.technician(transaction, input.technicianId);
      if (!technician) {
        return 'invalid-technician';
      }

      const acceptingForSelf = input.technicianId === input.actorUserId;
      const nextStatus = acceptingForSelf ? 2 : 1;
      const interactionType = acceptingForSelf ? 2 : 4;
      const interactionDescription = acceptingForSelf
        ? 'Iniciou o atendimento.'
        : `Direcionou o atendimento para ${technician.name}.`;

      await transaction.$executeRawUnsafe(
        `UPDATE facility
         SET tecnico = ?, status = ?
         WHERE id = ?`,
        input.technicianId,
        nextStatus,
        input.facilityId,
      );

      await this.insertInteraction(
        transaction,
        interactionType,
        input.facilityId,
        input.actorUserId,
        interactionDescription,
      );

      return 'updated';
    });
  }

  async putOnHold(
    input: TicketFacilityHoldPersistenceInput,
  ): Promise<TicketFacilityHoldResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const facility = await this.lockVisibleFacility(
        transaction,
        input,
        clientIds,
      );
      if (!facility) {
        return 'not-found';
      }

      if (facility.status !== 2) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(
        transaction,
        input.facilityId,
      );
      if (activeHold) {
        return 'already-on-hold';
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO espera (
           espera_atd,
           espera_start,
           espera_prev,
           espera_desc,
           espera_user
         )
         VALUES (?, NOW(), ?, ?, ?)`,
        input.facilityId,
        input.forecastAt,
        input.description,
        input.actorUserId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE facility
         SET status = 3
         WHERE id = ?`,
        input.facilityId,
      );

      await this.insertInteraction(
        transaction,
        5,
        input.facilityId,
        input.actorUserId,
        [
          'Colocou o atendimento em espera.',
          `Previsão de retorno: ${input.forecastAt}`,
          `Descrição: ${input.description}`,
        ].join('\n'),
      );

      return 'updated';
    });
  }

  async resume(
    input: TicketFacilityCommandScope,
  ): Promise<TicketFacilityResumeResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const facility = await this.lockVisibleFacility(
        transaction,
        input,
        clientIds,
      );
      if (!facility) {
        return 'not-found';
      }

      if (facility.status !== 3) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(
        transaction,
        input.facilityId,
      );
      if (!activeHold) {
        return 'missing-active-hold';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE facility
         SET status = 2
         WHERE id = ?`,
        input.facilityId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE espera
         SET espera_end = NOW()
         WHERE espera_id = ?`,
        activeHold.espera_id,
      );

      await this.insertInteraction(
        transaction,
        6,
        input.facilityId,
        input.actorUserId,
        'Retomou o atendimento.',
      );

      return 'updated';
    });
  }

  async reject(
    input: TicketFacilityRejectionPersistenceInput,
  ): Promise<TicketFacilityRejectionResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const facility = await this.lockVisibleFacility(
        transaction,
        input,
        clientIds,
      );
      if (!facility) {
        return 'not-found';
      }

      if (facility.status !== 2) {
        return 'invalid-state';
      }

      let technicianName: string | null = null;

      if (input.technicianId > 0) {
        const technician = await this.technician(
          transaction,
          input.technicianId,
        );
        if (!technician) {
          return 'invalid-technician';
        }
        technicianName = technician.name;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE facility
         SET tecnico = ?, status = 1
         WHERE id = ?`,
        input.technicianId,
        input.facilityId,
      );

      const interactionType = input.technicianId > 0 ? 4 : 3;
      const interactionDescription =
        input.technicianId > 0
          ? `Direcionou o atendimento para ${technicianName}.\n${input.reason}`
          : `Recusou o atendimento.\n${input.reason}`;

      await this.insertInteraction(
        transaction,
        interactionType,
        input.facilityId,
        input.actorUserId,
        interactionDescription,
      );

      return 'updated';
    });
  }

  async finalize(
    input: TicketFacilityFinalizePersistenceInput,
  ): Promise<TicketFacilityCommandResult> {
    const clientIds = await this.restrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const facility = await this.lockVisibleFacility(
        transaction,
        input,
        clientIds,
      );
      if (!facility) {
        return 'not-found';
      }

      if (
        facility.status === null ||
        !input.allowedStatuses.includes(facility.status)
      ) {
        return 'invalid-state';
      }

      if (facility.status === 3) {
        const activeHold = await this.lockActiveHold(
          transaction,
          input.facilityId,
        );
        if (activeHold) {
          await transaction.$executeRawUnsafe(
            `UPDATE espera
             SET espera_end = NOW()
             WHERE espera_id = ?`,
            activeHold.espera_id,
          );
        }
      }

      await transaction.$executeRawUnsafe(
        `UPDATE facility
         SET desc_fechamento = ?,
             fechamento = NOW(),
             status = 4
         WHERE id = ?`,
        input.description,
        input.facilityId,
      );

      await this.insertInteraction(
        transaction,
        8,
        input.facilityId,
        input.actorUserId,
        `Finalizou o atendimento.\nDescrição: ${input.description}`,
      );

      return 'updated';
    });
  }

  private async insertInteraction(
    transaction: TransactionClient,
    interactionType: number,
    facilityId: number,
    actorUserId: number,
    description: string,
  ): Promise<void> {
    await transaction.$executeRawUnsafe(
      `INSERT INTO inter_facility (
         inter_tipo,
         inter_atd,
         inter_user,
         inter_data,
         inter_desc
       )
       VALUES (?, ?, ?, NOW(), ?)`,
      interactionType,
      facilityId,
      actorUserId,
      description,
    );
  }

  private validCreateStaticCatalogs(data: TicketFacilityCreateRequest): boolean {
    return (
      TYPE_IDS.has(data.typeId) &&
      LEVEL_IDS.has(data.levelId) &&
      FORM_IDS.has(data.formId)
    );
  }

  private validClassificationStaticCatalogs(
    data: TicketFacilityClassificationRequest,
  ): boolean {
    return TYPE_IDS.has(data.typeId) && LEVEL_IDS.has(data.levelId);
  }

  private async validCreateReferences(
    client: QueryClient,
    data: TicketFacilityCreateRequest,
  ): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<CountRow[]>(
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
           WHERE user_id = ?
             AND user_sts = 1
             AND user_funcao IN (${TECHNICIAN_FUNCTIONS.join(',')})
         ))
       ) AS total`,
      data.clientId,
      data.requesterId,
      data.requesterId,
      data.clientId,
      data.locationId,
      data.locationId,
      data.clientId,
      data.categoryId,
      data.subcategoryId,
      data.subcategoryId,
      data.categoryId,
      data.itemId,
      data.itemId,
      data.subcategoryId,
      data.technicianId,
      data.technicianId,
    );

    return Number(rows[0]?.total ?? 0) === 1;
  }

  private async validClassificationReferences(
    client: QueryClient,
    data: TicketFacilityClassificationRequest,
  ): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<CountRow[]>(
      `SELECT (
         EXISTS(
           SELECT 1 FROM categorias
           WHERE cat_id = ? AND cat_sts = 1 AND cat_setor = 1
         ) AND
         (? = 0 OR EXISTS(
           SELECT 1 FROM subcategorias
           WHERE scat_id = ? AND scat_cat = ? AND scat_sts = 1
         ))
       ) AS total`,
      data.categoryId,
      data.subcategoryId,
      data.subcategoryId,
      data.categoryId,
    );

    return Number(rows[0]?.total ?? 0) === 1;
  }

  private classificationChanges(
    facility: FacilityRow,
    data: TicketFacilityClassificationRequest,
  ): string[] {
    const changes: string[] = [];

    if ((facility.tipo ?? 0) !== data.typeId) {
      changes.push(`Tipo: ${facility.tipo ?? 0} -> ${data.typeId}`);
    }
    if ((facility.categoria ?? 0) !== data.categoryId) {
      changes.push(
        `Categoria: ${facility.categoria ?? 0} -> ${data.categoryId}`,
      );
    }
    if ((facility.subcategoria ?? 0) !== data.subcategoryId) {
      changes.push(
        `Subcategoria: ${facility.subcategoria ?? 0} -> ${data.subcategoryId}`,
      );
    }
    if ((facility.nivel ?? 0) !== data.levelId) {
      changes.push(`Nível: ${facility.nivel ?? 0} -> ${data.levelId}`);
    }

    return changes;
  }

  private async technician(
    client: QueryClient,
    technicianId: number,
  ): Promise<TechnicianRow | null> {
    const rows = await client.$queryRawUnsafe<TechnicianRow[]>(
      `SELECT user_id AS id, user_nome AS name
       FROM usuarios
       WHERE user_id = ?
         AND user_sts = 1
         AND user_funcao IN (${TECHNICIAN_FUNCTIONS.join(',')})
       LIMIT 1`,
      technicianId,
    );

    return rows[0] ?? null;
  }

  private async lastInsertId(
    transaction: TransactionClient,
  ): Promise<number> {
    const rows = await transaction.$queryRawUnsafe<InsertIdRow[]>(
      'SELECT LAST_INSERT_ID() AS id',
    );
    const id = Number(rows[0]?.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error(
        'Não foi possível identificar o atendimento Facility criado.',
      );
    }

    return id;
  }

  private async userType(userId: number): Promise<number> {
    const users = await this.database.$queryRawUnsafe<UserTypeRow[]>(
      `SELECT tipo_usuario
       FROM usuarios
       WHERE user_id = ?
       LIMIT 1`,
      userId,
    );

    return users[0]?.tipo_usuario ?? 0;
  }

  private async restrictedClientIds(
    userId: number,
    userType?: number,
  ): Promise<number[] | null> {
    const type = userType ?? (await this.userType(userId));
    if (type !== 2) {
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

  private async lockVisibleFacility(
    transaction: TransactionClient,
    input: TicketFacilityCommandScope,
    clientIds: number[] | null,
  ): Promise<FacilityRow | null> {
    const where = ['f.id = ?'];
    const params: unknown[] = [input.facilityId];

    if (clientIds !== null) {
      where.push(`f.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }

    if (input.ownerTechnicianId !== undefined) {
      where.push('f.tecnico = ?');
      params.push(input.ownerTechnicianId);
    }

    const rows = await transaction.$queryRawUnsafe<FacilityRow[]>(
      `SELECT
         f.id,
         f.status,
         f.tecnico,
         f.cliente,
         f.tipo,
         f.categoria,
         f.subcategoria,
         f.nivel
       FROM facility f
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );

    return rows[0] ?? null;
  }

  private async lockActiveHold(
    transaction: TransactionClient,
    facilityId: number,
  ): Promise<ActiveHoldRow | null> {
    const rows = await transaction.$queryRawUnsafe<ActiveHoldRow[]>(
      `SELECT espera_id
       FROM espera
       WHERE espera_atd = ?
         AND espera_end IS NULL
         AND espera_causa IS NULL
         AND id_melhorias IS NULL
       ORDER BY espera_id DESC
       LIMIT 1
       FOR UPDATE`,
      facilityId,
    );

    return rows[0] ?? null;
  }
}
