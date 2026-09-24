import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  type CatalogDetailResponse,
  type CatalogFiltersResponse,
  type CatalogListItem,
  type CatalogListResponse,
  type CatalogResolutionResponse,
  type CatalogSector,
  type CatalogWriteInput,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import {
  CatalogRepository,
  type CatalogListFilters,
  type CatalogRecord,
} from './ports/catalog.repository';

function hasPermission(user: AuthenticatedUser, permission: AppPermission): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function canEditSector(user: AuthenticatedUser, sector: CatalogSector): boolean {
  if (hasPermission(user, AppPermission.CatalogManage)) return true;
  return hasPermission(
    user,
    sector === 1 ? AppPermission.CatalogTiEdit : AppPermission.CatalogDevOpsEdit,
  );
}

function allowedCatalogSectors(user: AuthenticatedUser): CatalogSector[] {
  if (hasPermission(user, AppPermission.CatalogManage)) return [1, 2];

  const sectors: CatalogSector[] = [];
  if (
    hasPermission(user, AppPermission.CatalogTiRead) ||
    hasPermission(user, AppPermission.CatalogTiEdit)
  ) sectors.push(1);
  if (
    hasPermission(user, AppPermission.CatalogDevOpsRead) ||
    hasPermission(user, AppPermission.CatalogDevOpsEdit)
  ) sectors.push(2);
  return sectors;
}

function item(record: CatalogRecord): CatalogListItem {
  return {
    id: record.id,
    sector: record.sector,
    categoryId: record.categoryId,
    categoryName: record.categoryName,
    clientId: record.clientId,
    clientName: record.clientName,
    title: record.title,
    createdAt: record.createdAt?.toISOString() ?? null,
    updatedAt: record.updatedAt?.toISOString() ?? null,
  };
}

function detail(record: CatalogRecord): CatalogDetailResponse {
  return { ...item(record), content: record.content, authorUserId: record.authorUserId };
}

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  private sectors(user: AuthenticatedUser, requestedSector?: CatalogSector): CatalogSector[] {
    const allowed = allowedCatalogSectors(user);
    if (allowed.length === 0) throw new ForbiddenException('Usuário sem acesso ao catálogo.');
    if (requestedSector === undefined) return allowed;
    if (!allowed.includes(requestedSector)) throw new ForbiddenException('Setor de catálogo não permitido.');
    return [requestedSector];
  }

  private requireEditSector(user: AuthenticatedUser, sector: CatalogSector): void {
    if (!canEditSector(user, sector)) {
      throw new ForbiddenException('Usuário sem permissão para editar este setor do catálogo.');
    }
  }

  private async validateReferences(input: CatalogWriteInput): Promise<void> {
    const [clientExists, categoryExists] = await Promise.all([
      this.repository.clientExists(input.clientId),
      this.repository.categoryExists(input.categoryId),
    ]);
    if (!clientExists) throw new BadRequestException('Cliente informado não existe.');
    if (!categoryExists) throw new BadRequestException('Categoria informada não existe.');
  }

  async list(
    user: AuthenticatedUser,
    filters: CatalogListFilters & { sector?: CatalogSector },
  ): Promise<CatalogListResponse> {
    const sectors = this.sectors(user, filters.sector);
    const result = await this.repository.list(filters, sectors);
    const nextOffset = result.hasMore ? filters.offset + result.items.length : null;
    return { items: result.items.map(item), offset: filters.offset, nextOffset, hasMore: result.hasMore };
  }

  async detail(user: AuthenticatedUser, id: number): Promise<CatalogDetailResponse> {
    const record = await this.repository.findById(id, this.sectors(user));
    if (!record) throw new NotFoundException('Catálogo não encontrado.');
    return detail(record);
  }

  async create(user: AuthenticatedUser, input: CatalogWriteInput): Promise<CatalogDetailResponse> {
    this.requireEditSector(user, input.sector);
    await this.validateReferences(input);
    return detail(await this.repository.create({ ...input, authorUserId: user.id }));
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    input: CatalogWriteInput,
  ): Promise<CatalogDetailResponse> {
    const existing = await this.repository.findById(id, this.sectors(user));
    if (!existing) throw new NotFoundException('Catálogo não encontrado.');
    this.requireEditSector(user, existing.sector);
    this.requireEditSector(user, input.sector);
    await this.validateReferences(input);
    return detail(await this.repository.update(id, { ...input, authorUserId: user.id }));
  }

  async archive(user: AuthenticatedUser, id: number): Promise<void> {
    if (!hasPermission(user, AppPermission.CatalogManage)) {
      throw new ForbiddenException('Somente quem gerencia todos os catálogos pode arquivar registros.');
    }
    const existing = await this.repository.findById(id, [1, 2]);
    if (!existing) throw new NotFoundException('Catálogo não encontrado.');
    await this.repository.archive(id);
  }

  async filters(user: AuthenticatedUser): Promise<CatalogFiltersResponse> {
    const allowedSectors = this.sectors(user);
    const options = await this.repository.filterOptions();
    return { allowedSectors, categories: options.categories, clients: options.clients };
  }

  async resolve(
    user: AuthenticatedUser,
    clientId: number,
    categoryId: number,
    requestedSector?: CatalogSector,
  ): Promise<CatalogResolutionResponse> {
    const catalogIds = await this.repository.resolveIds(
      clientId,
      categoryId,
      this.sectors(user, requestedSector),
    );
    return {
      status: catalogIds.length === 0 ? 'none' : catalogIds.length === 1 ? 'single' : 'multiple',
      catalogIds,
    };
  }
}
