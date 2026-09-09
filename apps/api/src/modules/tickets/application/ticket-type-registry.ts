import { Injectable } from '@nestjs/common';
import {
  AppPermission,
  type Sector,
  type TicketTypeDescriptor,
  type TicketTypesResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import {
  TICKET_TYPE_DEFINITIONS,
  type RegisteredTicketTypeDefinition,
} from '../domain/ticket-type-definitions';

@Injectable()
export class TicketTypeRegistry {
  listForUser(user: AuthenticatedUser): TicketTypesResponse {
    return {
      ticketTypes: TICKET_TYPE_DEFINITIONS
        .filter((definition) => this.canSeeType(user, definition))
        .map((definition) => this.toDescriptor(user, definition)),
    };
  }

  private toDescriptor(
    user: AuthenticatedUser,
    definition: RegisteredTicketTypeDefinition,
  ): TicketTypeDescriptor {
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      serviceSectors: [...definition.serviceSectors],
      capabilities: { ...definition.capabilities },
      requiredFields: [...definition.requiredFields],
      optionalFields: [...definition.optionalFields],
      canCreate:
        this.hasPermission(user, AppPermission.TicketsCreate) &&
        this.canSeeType(user, definition),
    };
  }

  private canSeeType(
    user: AuthenticatedUser,
    definition: RegisteredTicketTypeDefinition,
  ): boolean {
    if (this.isSystemAdmin(user)) {
      return true;
    }

    if (definition.restrictedToSectors.length === 0) {
      return true;
    }

    const userSectors = this.userSectors(user);
    return definition.restrictedToSectors.some((sector) =>
      userSectors.has(sector),
    );
  }

  private userSectors(user: AuthenticatedUser): Set<Sector> {
    return new Set(
      user.roleAssignments.flatMap((assignment) => assignment.sectors),
    );
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
