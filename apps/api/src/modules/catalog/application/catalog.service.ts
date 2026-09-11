import {
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
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import {
  CatalogRepository,
  type CatalogListFilters,
  type CatalogRecord,
} from './ports/catalog.repository';

function hasPermission(
  user: AuthenticatedUser,
  permission: AppPermission,
): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function allowedCatalogSectors(user: AuthenticatedUser): CatalogSector[] {
  const sectors: CatalogSector[] = [];

  if (
    hasPermission(user, AppPermission.CatalogTiRead) ||
    hasPermission(user, AppPermission.CatalogTiManage)
  ) {
    sectors.push(1);
  }

  if (
    hasPermission(user, AppPermission.CatalogDevOpsRead) ||
    hasPermission(user, AppPermission.CatalogDevOpsManage)
  ) {
    sectors.push(2);
  }

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

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  private sectors(
    user: AuthenticatedUser,
    requestedSector?: CatalogSector,
  ): CatalogSector[] {
    const allowed = allowedCatalogSectors(user);

    if (allowed.length === 0) {
      throw new ForbiddenException('Usuário sem acesso ao catálogo.');
    }

    if (requestedSector === undefined) {
      return allowed;
    }

    if (!allowed.includes(requestedSector)) {
      throw new ForbiddenException('Setor de catálogo não permitido.');
    }

    return [requestedSector];
  }

  async list(
    user: AuthenticatedUser,
    filters: CatalogListFilters & { sector?: CatalogSector },
  ): Promise<CatalogListResponse> {
    const sectors = this.sectors(user, filters.sector);
    const result = await this.repository.list(filters, sectors);
    const nextOffset = result.hasMore
      ? filters.offset + result.items.length
      : null;

    return {
      items: result.items.map(item),
      offset: filters.offset,
      nextOffset,
      hasMore: result.hasMore,
    };
  }

  async detail(
    user: AuthenticatedUser,
    id: number,
  ): Promise<CatalogDetailResponse> {
    const record = await this.repository.findById(id, this.sectors(user));

    if (!record) {
      throw new NotFoundException('Catálogo não encontrado.');
    }

    return {
      ...item(record),
      content: record.content,
      authorUserId: record.authorUserId,
    };
  }

  async filters(user: AuthenticatedUser): Promise<CatalogFiltersResponse> {
    const allowedSectors = this.sectors(user);
    const options = await this.repository.filterOptions();

    return {
      allowedSectors,
      categories: options.categories,
      clients: options.clients,
    };
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
      status:
        catalogIds.length === 0
          ? 'none'
          : catalogIds.length === 1
            ? 'single'
            : 'multiple',
      catalogIds,
    };
  }
}
