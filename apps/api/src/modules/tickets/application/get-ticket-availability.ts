import { Injectable } from '@nestjs/common';
import type { TicketAvailabilityResponse } from '@helpdesk/contracts';
import { TicketAvailabilityRepository } from './ports/ticket-availability.repository';

@Injectable()
export class GetTicketAvailability {
  constructor(private readonly repository: TicketAvailabilityRepository) {}

  execute(): Promise<TicketAvailabilityResponse> {
    return this.repository.dashboard();
  }
}
