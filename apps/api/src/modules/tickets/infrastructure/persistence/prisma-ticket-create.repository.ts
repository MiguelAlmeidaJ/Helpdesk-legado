import { Inject, Injectable } from '@nestjs/common';
import {
  TicketStatus,
  type CreateTicketRequest,
  type TicketCatalogOption,
  type TicketCreateCatalogsResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  CREATE_TICKET_FORMS,
  CREATE_TICKET_LEVELS,
  CREATE_TICKET_PRIORITIES,
  CREATE_TICKET_RECURRENCE_RULES,
  CREATE_TICKET_TYPES,
} from '../../application/ticket-create-catalogs';
import {
  TicketCreateRepository,
  type CreateTicketPersistenceResult,
} from '../../application/ports/ticket-create.repository';
import { legacyLocalDateTimeDisplay } from '../../domain/legacy-local-date-time';
import { enqueueTicketNotification } from '../outbox/enqueue-ticket-notification';

interface OptionRow { id: number; name: string | null }
interface TypeRow { tipo_usuario: number }
interface CountRow { total: number | bigint }
interface InsertIdRow { id: number | bigint }
interface FlagRow { value: number | bigint }

const TECHNICIAN_FUNCTIONS = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14];

function mapOptions(rows: OptionRow[]): TicketCatalogOption[] {
  return rows.map((row) => ({ id: row.id, name: row.name ?? `#${row.id}` }));
}

@Injectable()
export class PrismaTicketCreateRepository extends TicketCreateRepository {
  constructor(@Inject(NIVEL3_DATABASE) private readonly database: Nivel3DatabaseClient) {
    super();
  }

  async catalogs(actorUserId: number): Promise<TicketCreateCatalogsResponse> {
    const userType = await this.userType(actorUserId);
    const restrictedIds = await this.restrictedClientIds(actorUserId, userType);
    const where = restrictedIds === null
      ? ''
      : restrictedIds.length
        ? `AND clt_id IN (${restrictedIds.map(() => '?').join(',')})`
        : 'AND 1 = 0';

    const clients = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT clt_id AS id, COALESCE(NULLIF(clt_nomef, ''), clt_nomer) AS name
       FROM clientes
       WHERE clt_sts = 1
         ${where}
       ORDER BY name`,
      ...(restrictedIds ?? []),
    );

    const categories = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT cat_id AS id, cat_nome AS name
       FROM categorias
       WHERE cat_sts = 1
         AND cat_setor = 1
       ORDER BY cat_nome`,
    );

    let technicians: TicketCatalogOption[] = [{ id: 0, name: 'Não determinado' }];
    if (userType === 1) {
      const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
        `SELECT user_id AS id, user_nome AS name
         FROM usuarios
         WHERE user_sts = 1
           AND user_funcao IN (${TECHNICIAN_FUNCTIONS.join(',')})
         ORDER BY user_nome`,
      );
      technicians = [...technicians, ...mapOptions(rows)];
    }

    return {
      clients: mapOptions(clients),
      technicians,
      types: CREATE_TICKET_TYPES,
      categories: mapOptions(categories),
      levels: CREATE_TICKET_LEVELS,
      priorities: CREATE_TICKET_PRIORITIES,
      forms: CREATE_TICKET_FORMS,
      recurrenceRules: CREATE_TICKET_RECURRENCE_RULES,
    };
  }

  requesters(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]> {
    return this.partyOptions(actorUserId, clientId, 'requester');
  }

  locations(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]> {
    return this.partyOptions(actorUserId, clientId, 'location');
  }

  async subcategories(categoryId: number): Promise<TicketCatalogOption[]> {
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT scat_id AS id, scat_nome AS name
       FROM subcategorias
       WHERE scat_cat = ?
         AND scat_sts = 1
       ORDER BY scat_nome`,
      categoryId,
    );
    return rows.length
      ? [{ id: 0, name: 'Não informado' }, ...mapOptions(rows)]
      : [{ id: 0, name: 'Sem SubCategoria cadastrada' }];
  }

  async items(subcategoryId: number): Promise<TicketCatalogOption[]> {
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT itens_id AS id, itens_nome AS name
       FROM itens
       WHERE itens_scat = ?
         AND itens_sts = 1
       ORDER BY itens_nome`,
      subcategoryId,
    );
    return rows.length
      ? [{ id: 0, name: 'Não informado' }, ...mapOptions(rows)]
      : [{ id: 0, name: 'Sem Item cadastrado' }];
  }

  async create(actorUserId: number, input: CreateTicketRequest): Promise<CreateTicketPersistenceResult> {
    const userType = await this.userType(actorUserId);

    if (!(await this.canUseClient(actorUserId, input.clientId, userType))) {
      return 'forbidden-client';
    }

    if (input.technicianId > 0 && userType !== 1) {
      return 'invalid-reference';
    }

    const valid = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT (
          EXISTS(SELECT 1 FROM clientes WHERE clt_id = ? AND clt_sts = 1) AND
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
        ) AS total`,
      input.clientId,
      input.requesterId, input.requesterId, input.clientId,
      input.locationId, input.locationId, input.clientId,
      input.categoryId,
      input.subcategoryId, input.subcategoryId, input.categoryId,
      input.itemId, input.itemId, input.subcategoryId,
      input.technicianId, input.technicianId,
    );
    if (Number(valid[0]?.total ?? 0) !== 1) return 'invalid-reference';

    if (input.recurrence) {
      const future = await this.database.$queryRawUnsafe<FlagRow[]>(
        `SELECT CASE
           WHEN CAST(REPLACE(?, 'T', ' ') AS DATETIME) > NOW() THEN 1
           ELSE 0
         END AS value`,
        input.recurrence.recurrenceAt,
      );
      if (Number(future[0]?.value ?? 0) !== 1) return 'invalid-recurrence';
    }

    const recent = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE abertura > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         AND cliente = ?
         AND categoria = ?
         AND subcategoria = ?`,
      input.clientId, input.categoryId, input.subcategoryId,
    );

    const scheduledRows = await this.database.$queryRawUnsafe<FlagRow[]>(
      `SELECT CASE
         WHEN CAST(REPLACE(?, 'T', ' ') AS DATETIME) > NOW() THEN 1
         ELSE 0
       END AS value`,
      input.openingAt,
    );
    const status = Number(scheduledRows[0]?.value ?? 0) === 1
      ? TicketStatus.Scheduled
      : TicketStatus.WaitingExecution;
    const recurrence = input.recurrence;

    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO atendimentos (
           cliente, pessoa, \`local\`, tipo, categoria, subcategoria, item, nivel,
           forma, desc_abertura, abertura, tecnico, reincidente, status, recorrente,
           data_recorrencia, vezes_reabrir, vezes, semana, prioridade
         )
         VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           CAST(REPLACE(?, 'T', ' ') AS DATETIME),
           ?, ?, ?, ?,
           CASE
             WHEN ? IS NULL THEN NULL
             ELSE CAST(REPLACE(?, 'T', ' ') AS DATETIME)
           END,
           ?, ?, ?, ?
         )`,
        input.clientId, input.requesterId, input.locationId, input.typeId,
        input.categoryId, input.subcategoryId, input.itemId, input.levelId,
        input.formId, input.openingDescription, input.openingAt, input.technicianId,
        Number(recent[0]?.total ?? 0) > 0 ? 1 : 0, status, recurrence ? 2 : 1,
        recurrence?.recurrenceAt ?? null,
        recurrence?.recurrenceAt ?? null,
        recurrence?.rule ?? 0,
        recurrence?.remaining ?? 0,
        recurrence?.week ?? null,
        input.priorityId,
      );

      const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>('SELECT LAST_INSERT_ID() AS id');
      const id = Number(ids[0]?.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('Não foi possível identificar o atendimento criado.');
      }

      const description = status === TicketStatus.Scheduled
        ? `Registrou o Agendamento do Atendimento para ${legacyLocalDateTimeDisplay(input.openingAt)}.`
        : 'Registrou solicitação de Atendimento.';

      await transaction.$executeRawUnsafe(
        'INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) VALUES (1, ?, ?, NOW(), ?)',
        id, actorUserId, description,
      );

      if (input.technicianId > 0 && input.technicianId !== actorUserId) {
        const names = await transaction.$queryRawUnsafe<OptionRow[]>(
          'SELECT user_id AS id, user_nome AS name FROM usuarios WHERE user_id = ? LIMIT 1',
          input.technicianId,
        );
        await transaction.$executeRawUnsafe(
          'INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) VALUES (4, ?, ?, NOW(), ?)',
          id, actorUserId, `Direcionou o atendimento para ${names[0]?.name ?? `#${input.technicianId}`}.`,
        );
      }

      await enqueueTicketNotification(transaction, 'ticket.opened', id, {
        actorUserId,
        openingAt: input.openingAt,
        status,
      });

      return { id, status };
    });
  }

  private async partyOptions(actorUserId: number, clientId: number, kind: 'requester' | 'location'): Promise<TicketCatalogOption[]> {
    if (!(await this.canUseClient(actorUserId, clientId))) return [];

    const rows = kind === 'requester'
      ? await this.database.$queryRawUnsafe<OptionRow[]>(
          'SELECT pessoa_id AS id, pessoa_nom AS name FROM pessoas WHERE pessoa_clt = ? AND pessoa_sts = 1 ORDER BY pessoa_nom',
          clientId,
        )
      : await this.database.$queryRawUnsafe<OptionRow[]>(
          'SELECT local_id AS id, local_nom AS name FROM locais WHERE local_clt = ? AND local_sts = 1 ORDER BY local_nom',
          clientId,
        );

    return rows.length
      ? mapOptions(rows)
      : [{ id: 0, name: kind === 'requester' ? 'Sem solicitante cadastrado' : 'Sem local cadastrado' }];
  }

  private async userType(userId: number): Promise<number> {
    const users = await this.database.$queryRawUnsafe<TypeRow[]>(
      'SELECT tipo_usuario FROM usuarios WHERE user_id = ? LIMIT 1',
      userId,
    );
    return users[0]?.tipo_usuario ?? 0;
  }

  private async restrictedClientIds(userId: number, userType?: number): Promise<number[] | null> {
    const type = userType ?? await this.userType(userId);
    if (type !== 2) return null;

    const rows = await this.database.$queryRawUnsafe<{ cliente_id: number }[]>(
      'SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = ?',
      userId,
    );
    return rows.map((row) => row.cliente_id);
  }

  private async canUseClient(userId: number, clientId: number, userType?: number): Promise<boolean> {
    const restricted = await this.restrictedClientIds(userId, userType);
    return restricted === null || restricted.includes(clientId);
  }
}
