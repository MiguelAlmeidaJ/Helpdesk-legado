import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketCatalogOption,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TICKET_FORMS,
  TICKET_LEVELS,
  TICKET_PRIORITIES,
  TICKET_TYPES,
} from '../../application/get-ticket-classification-catalogs';
import {
  TicketClassificationRepository,
  type UpdateTicketClassificationPersistenceInput,
  type UpdateTicketClassificationPersistenceResult,
} from '../../application/ports/ticket-classification.repository';

interface VisibilityRow { tipo_usuario: number; }
interface ClientScopeRow { cliente_id: number; }
interface OptionRow { id: number; name: string; }
interface TicketRow {
  id: number;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  item: number | null;
  nivel: number | null;
  prioridade: number | null;
  forma: number | null;
  desc_abertura: string | null;
}
interface CountRow { total: number | bigint; }

function optionName(
  options: TicketCatalogOption[],
  id: number | null,
): string {
  return options.find((option) => option.id === (id ?? 0))?.name ??
    `#${id ?? 0}`;
}

@Injectable()
export class PrismaTicketClassificationRepository
  extends TicketClassificationRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async listCategories(): Promise<TicketCatalogOption[]> {
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT cat_id AS id, cat_nome AS name
       FROM categorias
       WHERE cat_sts = 1
       ORDER BY cat_nome ASC`,
    );
    return [{ id: 0, name: 'Não informado' }, ...rows];
  }

  async listSubcategories(categoryId: number): Promise<TicketCatalogOption[]> {
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT scat_id AS id, scat_nome AS name
       FROM subcategorias
       WHERE scat_cat = ?
         AND scat_sts = 1
       ORDER BY scat_nome ASC`,
      categoryId,
    );
    return rows.length > 0
      ? [{ id: 0, name: 'Não informado' }, ...rows]
      : [{ id: 0, name: 'Sem SubCategoria cadastrada' }];
  }

  async listItems(subcategoryId: number): Promise<TicketCatalogOption[]> {
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT itens_id AS id, itens_nome AS name
       FROM itens
       WHERE itens_scat = ?
         AND itens_sts = 1
       ORDER BY itens_nome ASC`,
      subcategoryId,
    );
    return rows.length > 0
      ? [{ id: 0, name: 'Não informado' }, ...rows]
      : [{ id: 0, name: 'Sem Item cadastrado' }];
  }

  async update(
    input: UpdateTicketClassificationPersistenceInput,
  ): Promise<UpdateTicketClassificationPersistenceResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const ticket = await this.lockVisibleTicket(
        transaction,
        input.ticketId,
        input.actorUserId,
        input.ownerTechnicianId,
        clientIds,
      );
      if (!ticket) {
        return 'not-found';
      }

      if (!(await this.validCatalogChain(transaction, input))) {
        return 'invalid-catalog';
      }

      const oldCategory = await this.catalogName(
        transaction,
        'categorias',
        'cat_id',
        'cat_nome',
        ticket.categoria,
      );
      const oldSubcategory = await this.catalogName(
        transaction,
        'subcategorias',
        'scat_id',
        'scat_nome',
        ticket.subcategoria,
      );
      const oldItem = await this.catalogName(
        transaction,
        'itens',
        'itens_id',
        'itens_nome',
        ticket.item,
      );
      const newCategory = await this.catalogName(
        transaction,
        'categorias',
        'cat_id',
        'cat_nome',
        input.categoryId,
      );
      const newSubcategory = await this.catalogName(
        transaction,
        'subcategorias',
        'scat_id',
        'scat_nome',
        input.subcategoryId,
      );
      const newItem = await this.catalogName(
        transaction,
        'itens',
        'itens_id',
        'itens_nome',
        input.itemId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET tipo = ?,
             categoria = ?,
             subcategoria = ?,
             item = ?,
             nivel = ?,
             prioridade = ?,
             forma = ?,
             desc_abertura = ?
         WHERE id = ?`,
        input.typeId,
        input.categoryId,
        input.subcategoryId,
        input.itemId,
        input.levelId,
        input.priorityId,
        input.formId,
        input.openingDescription,
        input.ticketId,
      );

      const changes: Array<[string, string, string]> = [
        [
          'Tipo',
          optionName(TICKET_TYPES, ticket.tipo),
          optionName(TICKET_TYPES, input.typeId),
        ],
        [
          'Categoria',
          oldCategory,
          newCategory,
        ],
        [
          'SubCategoria',
          oldSubcategory,
          newSubcategory,
        ],
        [
          'Item',
          oldItem,
          newItem,
        ],
        [
          'Nível',
          optionName(TICKET_LEVELS, ticket.nivel),
          optionName(TICKET_LEVELS, input.levelId),
        ],
        [
          'Prioridade',
          optionName(TICKET_PRIORITIES, ticket.prioridade),
          optionName(TICKET_PRIORITIES, input.priorityId),
        ],
        [
          'Forma de atendimento',
          optionName(TICKET_FORMS, ticket.forma),
          optionName(TICKET_FORMS, input.formId),
        ],
        [
          'Descrição de Abertura',
          ticket.desc_abertura ?? '',
          input.openingDescription,
        ],
      ];

      const previous = [
        ticket.tipo ?? 0,
        ticket.categoria ?? 0,
        ticket.subcategoria ?? 0,
        ticket.item ?? 0,
        ticket.nivel ?? 0,
        ticket.prioridade ?? 0,
        ticket.forma ?? 1,
        ticket.desc_abertura ?? '',
      ];
      const next = [
        input.typeId,
        input.categoryId,
        input.subcategoryId,
        input.itemId,
        input.levelId,
        input.priorityId,
        input.formId,
        input.openingDescription,
      ];

      for (let index = 0; index < changes.length; index += 1) {
        if (previous[index] === next[index]) {
          continue;
        }
        const [field, from, to] = changes[index]!;
        await transaction.$executeRawUnsafe(
          `INSERT INTO interatividade (
             inter_tipo, inter_atd, inter_user, inter_data, inter_desc
           ) VALUES (9, ?, ?, NOW(), ?)`,
          input.ticketId,
          input.actorUserId,
          `Editou ${field}: De: ${from} para ${to}.`,
        );
      }

      return 'updated';
    });
  }

  private async validCatalogChain(
    transaction: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>,
    input: UpdateTicketClassificationPersistenceInput,
  ): Promise<boolean> {
    if (input.categoryId === 0) {
      return input.subcategoryId === 0 && input.itemId === 0;
    }

    const categories = await transaction.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM categorias
       WHERE cat_id = ? AND cat_sts = 1`,
      input.categoryId,
    );
    if (Number(categories[0]?.total ?? 0) !== 1) {
      return false;
    }

    if (input.subcategoryId === 0) {
      return input.itemId === 0;
    }

    const subcategories = await transaction.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM subcategorias
       WHERE scat_id = ?
         AND scat_cat = ?
         AND scat_sts = 1`,
      input.subcategoryId,
      input.categoryId,
    );
    if (Number(subcategories[0]?.total ?? 0) !== 1) {
      return false;
    }

    if (input.itemId === 0) {
      return true;
    }

    const items = await transaction.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM itens
       WHERE itens_id = ?
         AND itens_scat = ?
         AND itens_sts = 1`,
      input.itemId,
      input.subcategoryId,
    );
    return Number(items[0]?.total ?? 0) === 1;
  }

  private async catalogName(
    transaction: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>,
    table: 'categorias' | 'subcategorias' | 'itens',
    idColumn: 'cat_id' | 'scat_id' | 'itens_id',
    nameColumn: 'cat_nome' | 'scat_nome' | 'itens_nome',
    id: number | null,
  ): Promise<string> {
    if (!id) {
      return 'Não informado';
    }
    const rows = await transaction.$queryRawUnsafe<OptionRow[]>(
      `SELECT ${idColumn} AS id, ${nameColumn} AS name
       FROM ${table}
       WHERE ${idColumn} = ?
       LIMIT 1`,
      id,
    );
    return rows[0]?.name ?? `#${id}`;
  }

  private async resolveRestrictedClientIds(userId: number) {
    const users = await this.database.$queryRawUnsafe<VisibilityRow[]>(
      'SELECT tipo_usuario FROM usuarios WHERE user_id = ? LIMIT 1',
      userId,
    );
    if (users[0]?.tipo_usuario !== 2) {
      return null;
    }
    const clients = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      'SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = ?',
      userId,
    );
    return clients.map((client) => client.cliente_id);
  }

  private async lockVisibleTicket(
    transaction: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>,
    ticketId: number,
    actorUserId: number,
    ownerTechnicianId: number | undefined,
    clientIds: number[] | null,
  ): Promise<TicketRow | null> {
    const where = ['a.id = ?'];
    const params: unknown[] = [ticketId];

    if (clientIds !== null) {
      where.push(`a.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }
    if (ownerTechnicianId !== undefined) {
      where.push('a.tecnico = ?');
      params.push(ownerTechnicianId);
    }
    if (actorUserId === 134) {
      where.push(
        '(LOWER(a.desc_abertura) LIKE LOWER(?) OR LOWER(a.desc_fechamento) LIKE LOWER(?))',
      );
      params.push('%NET DO BRASIL%', '%NET DO BRASIL%');
    }

    const rows = await transaction.$queryRawUnsafe<TicketRow[]>(
      `SELECT a.id, a.tipo, a.categoria, a.subcategoria, a.item,
              a.nivel, a.prioridade, a.forma, a.desc_abertura
       FROM atendimentos a
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );
    return rows[0] ?? null;
  }
}
