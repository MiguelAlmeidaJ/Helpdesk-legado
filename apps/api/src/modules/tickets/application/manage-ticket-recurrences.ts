import { Injectable } from '@nestjs/common';
import type {
  TicketRecurrenceListResponse,
  TicketRecurrenceMutationRequest,
  TicketRecurrenceMutationResponse,
  TicketRecurrenceStatusFilter,
} from '@helpdesk/contracts';
import { TicketRecurrenceManagementRepository } from './ports/ticket-recurrence-management.repository';

export const TICKET_RECURRENCE_PERIODS = [
  { id: 1 as const, name: 'Diário' },
  { id: 6 as const, name: 'Semanal' },
  { id: 7 as const, name: 'Mesmo dia/semana do mês' },
  { id: 2 as const, name: 'Mensal' },
  { id: 3 as const, name: 'A cada 3 meses' },
  { id: 4 as const, name: 'A cada 6 meses' },
  { id: 5 as const, name: 'Anual' },
  { id: 8 as const, name: 'Dias úteis' },
];

@Injectable()
export class ManageTicketRecurrences {
  constructor(private readonly repository: TicketRecurrenceManagementRepository) {}

  async list(userId: number, filters: { clientId?: number; period?: number; status: TicketRecurrenceStatusFilter }): Promise<TicketRecurrenceListResponse> {
    const [data, clients] = await Promise.all([
      this.repository.list({ userId, ...filters }),
      this.repository.clients(userId),
    ]);
    return { data, clients, periods: TICKET_RECURRENCE_PERIODS, total: data.length };
  }

  create(userId: number, input: TicketRecurrenceMutationRequest): Promise<TicketRecurrenceMutationResponse> {
    return this.repository.create(userId, input);
  }

  update(userId: number, recurrenceId: number, input: TicketRecurrenceMutationRequest): Promise<void> {
    return this.repository.update(userId, recurrenceId, input);
  }

  setActive(userId: number, recurrenceId: number, active: boolean): Promise<void> {
    return this.repository.setActive(userId, recurrenceId, active);
  }
}
