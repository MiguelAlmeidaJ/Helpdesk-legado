import { Inject, Injectable } from '@nestjs/common';
import type {
  DevOpsTicketCreateRequest,
  DevOpsTicketCreateResponse,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
  TicketProjectStatus,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../../core/database/database.constants';
import {
  CREATE_TICKET_FORMS,
  CREATE_TICKET_LEVELS,
} from '../../../application/ticket-create-catalogs';
import {
  DevOpsTicketCreateRepository,
  type DevOpsTicketCreatePersistenceResult,
} from '../application/ports/devops-ticket-create.repository';
import { legacyLocalDateTimeDisplay } from '../../../domain/legacy-local-date-time';

interface OptionRow {
  id: number;
  name: string | null;
}

interface UserTypeRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface CountRow {
  total: number | bigint | string;
}

interface FlagRow {
  value: number | bigint | string;
}

interface InsertIdRow {
  id: number | bigint | string;
}

type QueryClient = Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>;

const DEVOPS_TECHNICIAN_FUNCTIONS = [8, 9, 10, 11, 12, 13, 14];
const TYPE_IDS = new Set([0, 1, 2, 3, 4, 5, 6]);
const LEVEL_IDS = new Set([0, 1, 2, 3, 4, 5, 6]);
const FORM_IDS = new Set([1, 2, 3, 4]);

const DEVOPS_TYPES: TicketCatalogOption[] = [
  { id: 0, name: 'Não informado' },
  { id: 1, name: 'Falha' },
  { id: 2, name: 'Relacionamento' },
  { id: 3, name: 'Requisição de Serviços' },
  { id: 4, name: 'Requisição de informação' },
  { id: 5, name: 'Notificação de monitoramento' },
  { id: 6, name: 'Melhorias' },
];

function mapOptions(rows: OptionRow[]): TicketCatalogOption[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? `#${row.id}`,
  }));
}

@Injectable()
export class PrismaDevOpsTicketCreateRepository
  extends DevOpsTicketCreateRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async catalogs(actorUserId: number): Promise<TicketCreateCatalogsResponse> {
    const userType = await this.userType(actorUserId);
    const restricted = await this.restrictedClientIds(actorUserId, userType);
    const where =
      restricted === null
        ? ''
        : restricted.length > 0
          ? `AND clt_id IN (${restricted.map(() => '?').join(', ')})`
          : 'AND 1 = 0';

    const [clients, categories] = await Promise.all([
      this.database.$queryRawUnsafe<OptionRow[]>(
        `SELECT clt_id AS id, COALESCE(NULLIF(clt_nomef, ''), clt_nomer) AS name
         FROM clientes
         WHERE clt_sts = 1
           ${where}
         ORDER BY name`,
        ...(restricted ?? []),
      ),
      this.database.$queryRawUnsafe<OptionRow[]>(
        `SELECT cat_id AS id, cat_nome AS name
         FROM categorias
         WHERE cat_sts = 1
           AND cat_setor = 1
         ORDER BY cat_nome`,
      ),
    ]);

    let technicians: TicketCatalogOption[] = [
      { id: 0, name: 'Não determinado' },
    ];
    if (userType === 1) {
      const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
        `SELECT user_id AS id, user_nome AS name
         FROM usuarios
         WHERE user_sts = 1
           AND user_id > 1
           AND user_funcao IN (${DEVOPS_TECHNICIAN_FUNCTIONS.join(',')})
         ORDER BY user_nome`,
      );
      technicians = [...technicians, ...mapOptions(rows)];
    }

    return {
      clients: mapOptions(clients),
      technicians,
      types: DEVOPS_TYPES,
      categories: mapOptions(categories),
      levels: CREATE_TICKET_LEVELS,
      priorities: [],
      forms: CREATE_TICKET_FORMS,
      recurrenceRules: [],
    };
  }

  requesters(
    actorUserId: number,
    clientId: number,
  ): Promise<TicketCatalogOption[]> {
    return this.partyOptions(actorUserId, clientId, 'requester');
  }

  locations(
    actorUserId: number,
    clientId: number,
  ): Promise<TicketCatalogOption[]> {
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
    return [{ id: 0, name: 'Não informado' }, ...mapOptions(rows)];
  }

  async items(subcategoryId: number): Promise<TicketCatalogOption[]> {
    if (subcategoryId === 0) {
      return [{ id: 0, name: 'Não informado' }];
    }
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT itens_id AS id, itens_nome AS name
       FROM itens
       WHERE itens_scat = ?
         AND itens_sts = 1
       ORDER BY itens_nome`,
      subcategoryId,
    );
    return [{ id: 0, name: 'Não informado' }, ...mapOptions(rows)];
  }

  async create(
    actorUserId: number,
    data: DevOpsTicketCreateRequest,
  ): Promise<DevOpsTicketCreatePersistenceResult> {
    const userType = await this.userType(actorUserId);
    if (!(await this.canUseClient(actorUserId, data.clientId, userType))) {
      return 'forbidden-client';
    }
    if (data.technicianId > 0 && userType !== 1) {
      return 'invalid-reference';
    }
    if (
      !TYPE_IDS.has(data.typeId) ||
      !LEVEL_IDS.has(data.levelId) ||
      !FORM_IDS.has(data.formId) ||
      !(await this.validCreateReferences(this.database, data))
    ) {
      return 'invalid-reference';
    }

    const [recentRows, scheduledRows] = await Promise.all([
      this.database.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) AS total
         FROM tarefas
         WHERE abertura > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           AND cliente = ?
           AND categoria = ?
           AND subcategoria = ?`,
        data.clientId,
        data.categoryId,
        data.subcategoryId,
      ),
      this.database.$queryRawUnsafe<FlagRow[]>(
        `SELECT CASE
           WHEN CAST(REPLACE(?, 'T', ' ') AS DATETIME) > NOW() THEN 1
           ELSE 0
         END AS value`,
        data.openingAt,
      ),
    ]);

    const recurrent = Number(recentRows[0]?.total ?? 0) > 0 ? 1 : 0;
    const status = (Number(scheduledRows[0]?.value ?? 0) === 1
      ? 0
      : 1) as TicketProjectStatus;

    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO tarefas (
           cliente,
           nome_tarefa,
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
        data.clientId,
        data.name,
        data.requesterId,
        data.locationId,
        data.typeId,
        data.categoryId,
        data.subcategoryId,
        data.itemId,
        data.levelId,
        data.formId,
        data.openingDescription,
        data.openingAt,
        data.technicianId,
        recurrent,
        status,
      );

      const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      const id = Number(ids[0]?.id ?? 0);
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('Não foi possível identificar a tarefa DevOps criada.');
      }

      const description =
        status === 0
          ? `Registrou o Agendamento da Tarefa para ${legacyLocalDateTimeDisplay(data.openingAt)}.`
          : 'Registrou solicitação de Tarefa.';

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_tarefa (
           inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc
         ) VALUES (1, ?, ?, NOW(), ?)`,
        id,
        actorUserId,
        description,
      );

      if (data.technicianId > 0 && data.technicianId !== actorUserId) {
        const technicians = await transaction.$queryRawUnsafe<OptionRow[]>(
          `SELECT user_id AS id, user_nome AS name
           FROM usuarios
           WHERE user_id = ?
           LIMIT 1`,
          data.technicianId,
        );
        await transaction.$executeRawUnsafe(
          `INSERT INTO inter_tarefa (
             inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc
           ) VALUES (4, ?, ?, NOW(), ?)`,
          id,
          actorUserId,
          `Direcionou a tarefa para ${technicians[0]?.name ?? `#${data.technicianId}`}.`,
        );
      }

      const response: DevOpsTicketCreateResponse = {
        id,
        status,
        projectId: null,
      };
      return response;
    });
  }

  private async validCreateReferences(
    client: QueryClient,
    data: DevOpsTicketCreateRequest,
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
             AND user_funcao IN (${DEVOPS_TECHNICIAN_FUNCTIONS.join(',')})
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

  private async partyOptions(
    actorUserId: number,
    clientId: number,
    kind: 'requester' | 'location',
  ): Promise<TicketCatalogOption[]> {
    if (!(await this.canUseClient(actorUserId, clientId))) return [];

    const rows =
      kind === 'requester'
        ? await this.database.$queryRawUnsafe<OptionRow[]>(
            `SELECT pessoa_id AS id, pessoa_nom AS name
             FROM pessoas
             WHERE pessoa_clt = ?
               AND pessoa_sts = 1
             ORDER BY pessoa_nom`,
            clientId,
          )
        : await this.database.$queryRawUnsafe<OptionRow[]>(
            `SELECT local_id AS id, local_nom AS name
             FROM locais
             WHERE local_clt = ?
               AND local_sts = 1
             ORDER BY local_nom`,
            clientId,
          );

    return [{ id: 0, name: 'Não informado' }, ...mapOptions(rows)];
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
    userType?: number,
  ): Promise<number[] | null> {
    const type = userType ?? (await this.userType(userId));
    if (type !== 2) return null;

    const rows = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      `SELECT cliente_id
       FROM clientes_usuarios
       WHERE usuario_id = ?`,
      userId,
    );
    return rows.map((row) => row.cliente_id);
  }

  private async canUseClient(
    userId: number,
    clientId: number,
    userType?: number,
  ): Promise<boolean> {
    const restricted = await this.restrictedClientIds(userId, userType);
    return restricted === null || restricted.includes(clientId);
  }
}
