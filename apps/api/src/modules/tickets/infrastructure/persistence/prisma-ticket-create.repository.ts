import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus, type CreateTicketRequest, type TicketCatalogOption, type TicketCreateCatalogsResponse } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import { TicketCreateRepository, type CreateTicketPersistenceResult } from '../../application/ports/ticket-create.repository';

interface OptionRow { id: number; name: string | null }
interface TypeRow { tipo_usuario: number }
interface CountRow { total: number | bigint }
interface InsertIdRow { id: number | bigint }

@Injectable()
export class PrismaTicketCreateRepository extends TicketCreateRepository {
  constructor(@Inject(NIVEL3_DATABASE) private readonly database: Nivel3DatabaseClient) { super(); }

  async catalogs(actorUserId: number): Promise<TicketCreateCatalogsResponse> {
    const restrictedIds = await this.restrictedClientIds(actorUserId);
    const where = restrictedIds === null ? '' : restrictedIds.length ? `AND clt_id IN (${restrictedIds.map(() => '?').join(',')})` : 'AND 1 = 0';
    const clients = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT clt_id AS id, COALESCE(NULLIF(clt_nomef, ''), clt_nomer) AS name FROM clientes WHERE clt_sts = 1 ${where} ORDER BY name`,
      ...(restrictedIds ?? []),
    );
    const technicians = await this.database.$queryRaw<OptionRow[]>`
      SELECT user_id AS id, user_nome AS name FROM usuarios
      WHERE user_sts = 1 AND user_funcao IN (1,2,3,4,5,6,7,9,10,11,12,13,14)
      ORDER BY user_nome`;
    const map = (rows: OptionRow[]): TicketCatalogOption[] => rows.map((row) => ({ id: row.id, name: row.name ?? `#${row.id}` }));
    return { clients: map(clients), technicians: [{ id: 0, name: 'Não determinado' }, ...map(technicians)] };
  }

  requesters(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]> {
    return this.partyOptions(actorUserId, clientId, 'requester');
  }

  locations(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]> {
    return this.partyOptions(actorUserId, clientId, 'location');
  }

  async create(actorUserId: number, input: CreateTicketRequest): Promise<CreateTicketPersistenceResult> {
    if (!(await this.canUseClient(actorUserId, input.clientId))) return 'forbidden-client';
    const valid = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT (
          EXISTS(SELECT 1 FROM clientes WHERE clt_id = ? AND clt_sts = 1) AND
          EXISTS(SELECT 1 FROM pessoas WHERE pessoa_id = ? AND pessoa_clt = ? AND pessoa_sts = 1) AND
          EXISTS(SELECT 1 FROM locais WHERE local_id = ? AND local_clt = ? AND local_sts = 1) AND
          EXISTS(SELECT 1 FROM categorias WHERE cat_id = ? AND cat_sts = 1) AND
          (? = 0 OR EXISTS(SELECT 1 FROM subcategorias WHERE scat_id = ? AND scat_cat = ? AND scat_sts = 1)) AND
          (? = 0 OR EXISTS(SELECT 1 FROM itens WHERE itens_id = ? AND itens_scat = ? AND itens_sts = 1)) AND
          (? = 0 OR EXISTS(SELECT 1 FROM usuarios WHERE user_id = ? AND user_sts = 1))
        ) AS total`,
      input.clientId, input.requesterId, input.clientId, input.locationId, input.clientId,
      input.categoryId, input.subcategoryId, input.subcategoryId, input.categoryId,
      input.itemId, input.itemId, input.subcategoryId, input.technicianId, input.technicianId,
    );
    if (Number(valid[0]?.total ?? 0) !== 1) return 'invalid-reference';

    const recent = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total FROM atendimentos
       WHERE abertura > DATE_SUB(NOW(), INTERVAL 30 DAY)
         AND cliente = ? AND categoria = ? AND subcategoria = ?`,
      input.clientId, input.categoryId, input.subcategoryId,
    );
    const openingAt = new Date(input.openingAt);
    const status = openingAt.getTime() > Date.now() ? TicketStatus.Scheduled : TicketStatus.WaitingExecution;
    const recurrence = input.recurrence;

    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO atendimentos
          (cliente, pessoa, \`local\`, tipo, categoria, subcategoria, item, nivel,
           forma, desc_abertura, abertura, tecnico, reincidente, status, recorrente,
           data_recorrencia, vezes_reabrir, vezes, semana, prioridade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.clientId, input.requesterId, input.locationId, input.typeId,
        input.categoryId, input.subcategoryId, input.itemId, input.levelId,
        input.formId, input.openingDescription, openingAt, input.technicianId,
        Number(recent[0]?.total ?? 0) > 0 ? 1 : 0, status, recurrence ? 2 : 1,
        recurrence ? new Date(recurrence.recurrenceAt) : null,
        recurrence?.rule ?? 0, recurrence?.remaining ?? 0, recurrence?.week ?? null,
        input.priorityId,
      );
      const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>('SELECT LAST_INSERT_ID() AS id');
      const id = Number(ids[0]?.id);
      const description = status === TicketStatus.Scheduled
        ? `Registrou o agendamento do atendimento para ${openingAt.toLocaleString('pt-BR')}.`
        : 'Registrou solicitação de atendimento.';
      await transaction.$executeRawUnsafe(
        'INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) VALUES (1, ?, ?, NOW(), ?)',
        id, actorUserId, description,
      );
      if (input.technicianId > 0 && input.technicianId !== actorUserId) {
        const names = await transaction.$queryRawUnsafe<OptionRow[]>('SELECT user_id AS id, user_nome AS name FROM usuarios WHERE user_id = ? LIMIT 1', input.technicianId);
        await transaction.$executeRawUnsafe(
          'INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) VALUES (4, ?, ?, NOW(), ?)',
          id, actorUserId, `Direcionou o atendimento para ${names[0]?.name ?? `#${input.technicianId}`}.`,
        );
      }
      return { id, status };
    });
  }

  private async partyOptions(actorUserId: number, clientId: number, kind: 'requester' | 'location'): Promise<TicketCatalogOption[]> {
    if (!(await this.canUseClient(actorUserId, clientId))) return [];
    const rows = kind === 'requester'
      ? await this.database.$queryRawUnsafe<OptionRow[]>('SELECT pessoa_id AS id, pessoa_nom AS name FROM pessoas WHERE pessoa_clt = ? AND pessoa_sts = 1 ORDER BY pessoa_nom', clientId)
      : await this.database.$queryRawUnsafe<OptionRow[]>('SELECT local_id AS id, local_nom AS name FROM locais WHERE local_clt = ? AND local_sts = 1 ORDER BY local_nom', clientId);
    return rows.map((row) => ({ id: row.id, name: row.name ?? `#${row.id}` }));
  }

  private async restrictedClientIds(userId: number): Promise<number[] | null> {
    const users = await this.database.$queryRawUnsafe<TypeRow[]>('SELECT tipo_usuario FROM usuarios WHERE user_id = ? LIMIT 1', userId);
    if (users[0]?.tipo_usuario !== 2) return null;
    const rows = await this.database.$queryRawUnsafe<{ cliente_id: number }[]>('SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = ?', userId);
    return rows.map((row) => row.cliente_id);
  }

  private async canUseClient(userId: number, clientId: number): Promise<boolean> {
    const restricted = await this.restrictedClientIds(userId);
    return restricted === null || restricted.includes(clientId);
  }
}
