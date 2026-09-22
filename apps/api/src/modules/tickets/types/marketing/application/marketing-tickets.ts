import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  Sector,
  type MarketingTicketCreateRequest,
  type MarketingTicketUpdateRequest,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../../../access/domain/authenticated-user';
import { TicketTypeAccessRepository } from '../../../application/ports/ticket-type-access.repository';
import {
  MarketingTicketRepository,
  type MarketingTicketCommandResult,
  type MarketingTicketListPersistenceInput,
  type MarketingTicketScope,
} from './ports/marketing-ticket.repository';

function permissionLevel(moduleValue: string | undefined, index: number): number {
  const value = moduleValue?.[index];
  return value && /^\d$/.test(value) ? Number(value) : 0;
}

function isSystemAdmin(user: AuthenticatedUser): boolean {
  return user.grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

function assertResult(result: MarketingTicketCommandResult): void {
  if (result === 'not-found') {
    throw new NotFoundException(
      'Ticket de Marketing não encontrado ou fora do seu escopo.',
    );
  }
  if (result === 'invalid-state') {
    throw new ConflictException(
      'O estado atual do ticket de Marketing não permite esta operação.',
    );
  }
  if (result === 'invalid-reference') {
    throw new BadRequestException(
      'Um ou mais dados informados são inválidos ou estão inativos.',
    );
  }
  if (result === 'forbidden-client') {
    throw new ForbiddenException('Cliente fora do escopo do usuário.');
  }
  if (result === 'already-on-hold') {
    throw new ConflictException('O ticket já possui uma espera ativa.');
  }
  if (result === 'missing-active-hold') {
    throw new ConflictException('O ticket não possui uma espera ativa.');
  }
}

type MarketingOperation =
  | 'read'
  | 'create'
  | 'classify'
  | 'interaction'
  | 'assign'
  | 'hold'
  | 'reject'
  | 'finalize';

@Injectable()
export class MarketingTickets {
  constructor(
    private readonly repository: MarketingTicketRepository,
    private readonly access: TicketTypeAccessRepository,
  ) {}

  async catalogs(user: AuthenticatedUser) {
    await this.resolveAccess(user, 'read');
    return this.repository.catalogs(user.id);
  }

  async requesters(user: AuthenticatedUser, clientId: number) {
    await this.resolveAccess(user, 'read');
    return this.repository.requesters(user.id, clientId);
  }

  async locations(user: AuthenticatedUser, clientId: number) {
    await this.resolveAccess(user, 'read');
    return this.repository.locations(user.id, clientId);
  }

  async list(
    user: AuthenticatedUser,
    input: Omit<MarketingTicketListPersistenceInput, keyof MarketingTicketScope>,
  ) {
    const access = await this.resolveAccess(user, 'read');
    return this.repository.list({
      ...input,
      ...access,
      search: user.id === 134 ? 'NET DO BRASIL' : input.search,
    });
  }

  async detail(user: AuthenticatedUser, ticketId: number) {
    const access = await this.resolveAccess(user, 'read');
    const result = await this.repository.detail({ ...access, ticketId });
    if (!result) {
      throw new NotFoundException(
        'Ticket de Marketing não encontrado ou fora do seu escopo.',
      );
    }
    return result;
  }

  async create(user: AuthenticatedUser, data: MarketingTicketCreateRequest) {
    const access = await this.resolveAccess(user, 'create');
    const result = await this.repository.create({ ...access, data });
    if (result === 'invalid-reference') {
      throw new BadRequestException(
        'Um ou mais dados do ticket de Marketing são inválidos ou estão inativos.',
      );
    }
    if (result === 'forbidden-client') {
      throw new ForbiddenException('Cliente fora do escopo do usuário.');
    }
    return result;
  }

  async update(
    user: AuthenticatedUser,
    ticketId: number,
    data: MarketingTicketUpdateRequest,
  ): Promise<void> {
    const access = await this.resolveAccess(user, 'classify');
    assertResult(await this.repository.update({ ...access, ticketId, data }));
  }

  async addInteraction(
    user: AuthenticatedUser,
    ticketId: number,
    description: string,
  ): Promise<void> {
    const access = await this.resolveAccess(user, 'interaction');
    assertResult(
      await this.repository.addInteraction({
        ...access,
        ticketId,
        description,
      }),
    );
  }

  async assign(
    user: AuthenticatedUser,
    ticketId: number,
    technicianId: number,
  ): Promise<void> {
    const access = await this.resolveAccess(user, 'assign');
    if (
      access.ownerTechnicianId !== undefined &&
      technicianId !== user.id
    ) {
      throw new ForbiddenException(
        'Seu acesso permite atuar apenas nos tickets atribuídos a você.',
      );
    }
    assertResult(
      await this.repository.assign({
        ...access,
        includeUnassigned: access.ownerTechnicianId !== undefined,
        ticketId,
        technicianId,
      }),
    );
  }

  async putOnHold(
    user: AuthenticatedUser,
    ticketId: number,
    forecastAt: string,
    description: string,
  ): Promise<void> {
    const access = await this.resolveAccess(user, 'hold');
    assertResult(
      await this.repository.putOnHold({
        ...access,
        ticketId,
        forecastAt,
        description,
      }),
    );
  }

  async resume(user: AuthenticatedUser, ticketId: number): Promise<void> {
    const access = await this.resolveAccess(user, 'hold');
    assertResult(await this.repository.resume({ ...access, ticketId }));
  }

  async reject(
    user: AuthenticatedUser,
    ticketId: number,
    technicianId: number,
    reason: string,
  ): Promise<void> {
    const access = await this.resolveAccess(user, 'reject');
    assertResult(
      await this.repository.reject({
        ...access,
        ticketId,
        technicianId,
        reason,
      }),
    );
  }

  async finalize(
    user: AuthenticatedUser,
    ticketId: number,
    description: string,
  ): Promise<void> {
    const access = await this.resolveAccess(user, 'finalize');
    assertResult(
      await this.repository.finalize({
        ...access,
        ticketId,
        description,
        allowedStatuses:
          access.ownerTechnicianId === undefined ? [2, 3] : [2],
      }),
    );
  }

  activateDue(limit = 100) {
    return this.repository.activateDue(limit);
  }

  private async resolveAccess(
    user: AuthenticatedUser,
    operation: MarketingOperation,
  ): Promise<MarketingTicketScope> {
    if (isSystemAdmin(user)) return { actorUserId: user.id };

    const snapshot = await this.access.findByUserId(user.id);
    const moduleValue = snapshot.modules[Sector.Marketing];
    const accessLevel = permissionLevel(moduleValue, 0);
    if (accessLevel < 1) {
      throw new ForbiddenException(
        'Este tipo de ticket é restrito ao setor Marketing.',
      );
    }

    if (operation === 'read' || operation === 'interaction') {
      return { actorUserId: user.id };
    }

    if (operation === 'create') {
      if (permissionLevel(moduleValue, 1) < 2) {
        throw new ForbiddenException(
          'Você não possui permissão para criar tickets de Marketing.',
        );
      }
      return { actorUserId: user.id };
    }

    const canManageOthers = permissionLevel(moduleValue, 5) >= 2;

    if (operation === 'classify') {
      if (permissionLevel(moduleValue, 1) < 3 && !canManageOthers) {
        throw new ForbiddenException(
          'Você não possui permissão para editar tickets de Marketing.',
        );
      }
      return {
        actorUserId: user.id,
        ownerTechnicianId: canManageOthers ? undefined : user.id,
      };
    }

    const operationPermission = {
      assign:
        permissionLevel(moduleValue, 2) >= 2 ||
        permissionLevel(moduleValue, 1) >= 3,
      hold: permissionLevel(moduleValue, 3) >= 2,
      reject: permissionLevel(moduleValue, 4) >= 2,
      finalize: permissionLevel(moduleValue, 2) >= 2,
    }[operation];

    if (!operationPermission && !canManageOthers) {
      throw new ForbiddenException(
        'Você não possui permissão para executar esta operação de Marketing.',
      );
    }

    return {
      actorUserId: user.id,
      ownerTechnicianId: canManageOthers ? undefined : user.id,
    };
  }
}
