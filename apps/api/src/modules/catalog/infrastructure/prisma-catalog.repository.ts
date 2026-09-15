import { Inject, Injectable } from '@nestjs/common';
import type {
  CatalogCategoryOption,
  CatalogClientOption,
  CatalogSector,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import {
  CatalogRepository,
  type CatalogFilterOptions,
  type CatalogListFilters,
  type CatalogListResult,
  type CatalogRecord,
  type CatalogWriteRecordInput,
} from '../application/ports/catalog.repository';

type CatalogRow = {
  id: number;
  setor: number;
  catalogo_categoria: number;
  cliente_id: number;
  titulo: string;
  conteudo: string;
  data_criacao: Date | null;
  data_edicao: Date | null;
  usuario_id: number;
};

@Injectable()
export class PrismaCatalogRepository extends CatalogRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
  ) {
    super();
  }

  private async decorate(rows: CatalogRow[]): Promise<CatalogRecord[]> {
    const clientIds = [...new Set(rows.map((row) => row.cliente_id))];
    const categoryIds = [
      ...new Set(rows.map((row) => row.catalogo_categoria)),
    ];

    const [clients, categories] = await Promise.all([
      clientIds.length > 0
        ? this.nivel3.clientes.findMany({
            where: { clt_id: { in: clientIds } },
            select: { clt_id: true, clt_nomef: true },
          })
        : Promise.resolve([]),
      categoryIds.length > 0
        ? this.nivel3.catalogos_categoria.findMany({
            where: { categoria_id: { in: categoryIds } },
            select: { categoria_id: true, categoria_nome: true },
          })
        : Promise.resolve([]),
    ]);

    const clientsById = new Map(
      clients.map((client) => [client.clt_id, client.clt_nomef]),
    );
    const categoriesById = new Map(
      categories.map((category) => [
        category.categoria_id,
        category.categoria_nome,
      ]),
    );

    return rows.map((row) => ({
      id: row.id,
      sector: row.setor as CatalogSector,
      categoryId: row.catalogo_categoria,
      categoryName: categoriesById.get(row.catalogo_categoria) ?? null,
      clientId: row.cliente_id,
      clientName: clientsById.get(row.cliente_id) ?? null,
      title: row.titulo,
      content: row.conteudo,
      createdAt: row.data_criacao,
      updatedAt: row.data_edicao,
      authorUserId: row.usuario_id,
    }));
  }

  async list(
    filters: CatalogListFilters,
    sectors: CatalogSector[],
  ): Promise<CatalogListResult> {
    const search = filters.search?.trim();
    const rows = await this.nivel3.catalogos.findMany({
      where: {
        setor: { in: sectors },
        ...(filters.clientId !== undefined
          ? { cliente_id: filters.clientId }
          : {}),
        ...(filters.categoryId !== undefined
          ? { catalogo_categoria: filters.categoryId }
          : {}),
        ...(search
          ? {
              OR: [
                { titulo: { contains: search } },
                { conteudo: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { id: 'desc' },
      skip: filters.offset,
      take: filters.limit + 1,
    });

    const hasMore = rows.length > filters.limit;
    const page = rows.slice(0, filters.limit);

    return {
      items: await this.decorate(page),
      hasMore,
    };
  }

  async findById(
    id: number,
    sectors: CatalogSector[],
  ): Promise<CatalogRecord | null> {
    const row = await this.nivel3.catalogos.findFirst({
      where: {
        id,
        setor: { in: sectors },
      },
    });

    if (!row) {
      return null;
    }

    const [record] = await this.decorate([row]);
    return record ?? null;
  }

  async filterOptions(): Promise<CatalogFilterOptions> {
    const [categories, clients] = await Promise.all([
      this.nivel3.catalogos_categoria.findMany({
        select: { categoria_id: true, categoria_nome: true },
        orderBy: { categoria_nome: 'asc' },
      }),
      this.nivel3.clientes.findMany({
        select: { clt_id: true, clt_nomef: true },
        orderBy: { clt_nomef: 'asc' },
      }),
    ]);

    return {
      categories: categories.map(
        (category): CatalogCategoryOption => ({
          id: category.categoria_id,
          name: category.categoria_nome,
        }),
      ),
      clients: clients.map(
        (client): CatalogClientOption => ({
          id: client.clt_id,
          name: client.clt_nomef,
        }),
      ),
    };
  }

  async resolveIds(
    clientId: number,
    categoryId: number,
    sectors: CatalogSector[],
  ): Promise<number[]> {
    const rows = await this.nivel3.catalogos.findMany({
      where: {
        cliente_id: clientId,
        catalogo_categoria: categoryId,
        setor: { in: sectors },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => row.id);
  }

  async clientExists(clientId: number): Promise<boolean> {
    const count = await this.nivel3.clientes.count({
      where: { clt_id: clientId },
    });

    return count > 0;
  }

  async categoryExists(categoryId: number): Promise<boolean> {
    const count = await this.nivel3.catalogos_categoria.count({
      where: { categoria_id: categoryId },
    });

    return count > 0;
  }

  async create(input: CatalogWriteRecordInput): Promise<CatalogRecord> {
    const now = new Date();
    const row = await this.nivel3.catalogos.create({
      data: {
        catalogo_categoria: input.categoryId,
        cliente_id: input.clientId,
        setor: input.sector,
        titulo: input.title,
        conteudo: input.content,
        usuario_id: input.authorUserId,
        data_criacao: now,
        data_edicao: now,
      },
    });

    return (await this.decorate([row]))[0]!;
  }

  async update(
    id: number,
    input: CatalogWriteRecordInput,
  ): Promise<CatalogRecord> {
    const row = await this.nivel3.catalogos.update({
      where: { id },
      data: {
        catalogo_categoria: input.categoryId,
        cliente_id: input.clientId,
        setor: input.sector,
        titulo: input.title,
        conteudo: input.content,
        usuario_id: input.authorUserId,
        data_edicao: new Date(),
      },
    });

    return (await this.decorate([row]))[0]!;
  }
}
