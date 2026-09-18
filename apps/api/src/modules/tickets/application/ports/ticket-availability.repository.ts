import type { TicketAvailabilityResponse } from '@helpdesk/contracts';

export abstract class TicketAvailabilityRepository {
  abstract dashboard(): Promise<TicketAvailabilityResponse>;
}
