import type { Sector } from '@helpdesk/contracts';

export interface TicketTypeAccessSnapshot {
  sectors: Sector[];
  modules: Partial<Record<Sector, string>>;
}

export abstract class TicketTypeAccessRepository {
  abstract findByUserId(userId: number): Promise<TicketTypeAccessSnapshot>;
}
