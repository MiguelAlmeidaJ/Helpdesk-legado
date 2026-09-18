import { Injectable } from '@nestjs/common';
import {
  AppPermission,
  Sector,
  type TicketTypeDescriptor,
  type TicketTypesResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import {
  TICKET_TYPE_DEFINITIONS,
  type RegisteredTicketTypeDefinition,
} from '../domain/ticket-type-definitions';
import {
  TicketTypeAccessRepository,
  type TicketTypeAccessSnapshot,
} from './ports/ticket-type-access.repository';

function permissionLevel(moduleValue: string | undefined, index: number): number {
  const value = moduleValue?.[index];
  return value && /^\d$/.test(value) ? Number(value) : 0;
}

@Injectable()
export class TicketTypeRegistry {
  constructor(private readonly access: TicketTypeAccessRepository) {}

  async listForUser(user: AuthenticatedUser): Promise<TicketTypesResponse> {
    const snapshot = await this.access.findByUserId(user.id);
    const userSectors = this.userSectors(user, snapshot);
    return {
      ticketTypes: TICKET_TYPE_DEFINITIONS
        .filter((definition) =>
          this.canSeeType(user, definition, userSectors, snapshot),
        )
        .map((definition) =>
          this.toDescriptor(user, definition, userSectors, snapshot),
        ),
    };
  }

  private toDescriptor(
    user: AuthenticatedUser,
    definition: RegisteredTicketTypeDefinition,
    userSectors: ReadonlySet<Sector>,
    snapshot: TicketTypeAccessSnapshot,
  ): TicketTypeDescriptor {
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      serviceSectors: [...definition.serviceSectors],
      capabilities: { ...definition.capabilities },
      requiredFields: [...definition.requiredFields],
      optionalFields: [...definition.optionalFields],
      canCreate: this.canCreateType(user, definition, userSectors, snapshot),
    };
  }

  private canSeeType(
    user: AuthenticatedUser,
    definition: RegisteredTicketTypeDefinition,
    userSectors: ReadonlySet<Sector>,
    snapshot: TicketTypeAccessSnapshot,
  ): boolean {
    if (this.isSystemAdmin(user)) return true;

    if (definition.key === 'atendimento') {
      return (
        permissionLevel(snapshot.modules[Sector.IT], 0) >= 1 ||
        this.hasPermission(user, AppPermission.TicketsRead)
      );
    }

    return definition.restrictedToSectors.some((sector) =>
      userSectors.has(sector),
    );
  }

  private canCreateType(
    user: AuthenticatedUser,
    definition: RegisteredTicketTypeDefinition,
    userSectors: ReadonlySet<Sector>,
    snapshot: TicketTypeAccessSnapshot,
  ): boolean {
    if (this.isSystemAdmin(user)) return true;
    if (!this.canSeeType(user, definition, userSectors, snapshot)) return false;

    if (definition.key === 'devops') {
      return permissionLevel(snapshot.modules[Sector.DevOps], 1) >= 2;
    }
    if (definition.key === 'marketing') {
      return permissionLevel(snapshot.modules[Sector.Marketing], 1) >= 2;
    }
    return (
      permissionLevel(snapshot.modules[Sector.IT], 1) >= 2 ||
      this.hasPermission(user, AppPermission.TicketsCreate)
    );
  }

  private userSectors(
    user: AuthenticatedUser,
    snapshot: TicketTypeAccessSnapshot,
  ): Set<Sector> {
    const sectors = new Set<Sector>(snapshot.sectors);
    for (const assignment of user.roleAssignments) {
      for (const sector of assignment.sectors) sectors.add(sector);
    }
    for (const grant of user.grants) {
      for (const sector of grant.sectors ?? []) sectors.add(sector);
    }
    return sectors;
  }

  private isSystemAdmin(user: AuthenticatedUser): boolean {
    return user.grants.some(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );
  }

  private hasPermission(
    user: AuthenticatedUser,
    permission: AppPermission,
  ): boolean {
    return user.grants.some(
      (grant) =>
        grant.permission === AppPermission.SystemAdmin ||
        grant.permission === permission,
    );
  }
}
