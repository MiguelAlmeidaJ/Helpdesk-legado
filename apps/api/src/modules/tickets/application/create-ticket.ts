import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketCreateRepository } from './ports/ticket-create.repository';

@Injectable()
export class CreateTicket {
  constructor(private readonly repository: TicketCreateRepository) {}

  catalogs(user: AuthenticatedUser) { return this.repository.catalogs(user.id); }
  requesters(user: AuthenticatedUser, clientId: number) { return this.repository.requesters(user.id, clientId); }
  locations(user: AuthenticatedUser, clientId: number) { return this.repository.locations(user.id, clientId); }
  subcategories(categoryId: number) { return this.repository.subcategories(categoryId); }
  items(subcategoryId: number) {
    return subcategoryId === 0
      ? Promise.resolve([{ id: 0, name: 'Sem Item cadastrado' }])
      : this.repository.items(subcategoryId);
  }

  async execute(user: AuthenticatedUser, input: Parameters<TicketCreateRepository['create']>[1]) {
    const result = await this.repository.create(user.id, input);
    if (result === 'forbidden-client') throw new ForbiddenException('Cliente fora do escopo do usuário.');
    if (result === 'invalid-reference') throw new BadRequestException('Um ou mais dados do atendimento são inválidos ou estão inativos.');
    if (result === 'invalid-recurrence') throw new BadRequestException('A primeira recorrência deve estar no futuro.');
    return result;
  }
}
