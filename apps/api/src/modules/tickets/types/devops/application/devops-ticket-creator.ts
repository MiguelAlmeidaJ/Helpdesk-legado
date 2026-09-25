import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type {
  DevOpsTicketCreateRequest,
  DevOpsTicketCreateResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../../../access/domain/authenticated-user';
import { DevOpsTicketCreateRepository } from './ports/devops-ticket-create.repository';

@Injectable()
export class DevOpsTicketCreator {
  constructor(private readonly repository: DevOpsTicketCreateRepository) {}

  catalogs(user: AuthenticatedUser) {
    return this.repository.catalogs(user.id);
  }

  requesters(user: AuthenticatedUser, clientId: number) {
    return this.repository.requesters(user.id, clientId);
  }

  locations(user: AuthenticatedUser, clientId: number) {
    return this.repository.locations(user.id, clientId);
  }

  subcategories(categoryId: number) {
    return this.repository.subcategories(categoryId);
  }

  items(subcategoryId: number) {
    return this.repository.items(subcategoryId);
  }

  async create(
    user: AuthenticatedUser,
    data: DevOpsTicketCreateRequest,
  ): Promise<DevOpsTicketCreateResponse> {
    const result = await this.repository.create(user.id, data);
    if (result === 'invalid-reference') {
      throw new BadRequestException(
        'Um ou mais dados do ticket DevOps são inválidos ou estão inativos.',
      );
    }
    if (result === 'forbidden-client') {
      throw new ForbiddenException('Cliente fora do escopo do usuário.');
    }
    return result;
  }
}
