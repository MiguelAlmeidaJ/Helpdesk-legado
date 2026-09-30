import type { Sector } from '@helpdesk/contracts';

export interface TicketTypePermissions {
  read: boolean;
  create: boolean;
  edit: boolean;
  execute: boolean;
  hold: boolean;
  reject: boolean;
  manageOthers: boolean;
}

export interface TicketTypeAccessSnapshot {
  sectors: Sector[];
  permissions: Partial<Record<Sector, TicketTypePermissions>>;
}

export abstract class TicketTypeAccessRepository {
  abstract findByUserId(userId: number): Promise<TicketTypeAccessSnapshot>;
}
