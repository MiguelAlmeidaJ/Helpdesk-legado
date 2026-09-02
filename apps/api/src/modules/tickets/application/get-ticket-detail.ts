import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  PermissionScope,
  type TicketDetailResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketDetailRepository } from './ports/ticket-detail.repository';

export interface GetTicketDetailInput {
  user: AuthenticatedUser;
  ticketId: number;
}

@Injectable()
export class GetTicketDetail {
  constructor(private readonly repository: TicketDetailRepository) {}

  async execute(input: GetTicketDetailInput): Promise<TicketDetailResponse> {
    const systemAdmin = input.user.grants.find(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );
    const readGrant =
      systemAdmin ??
      input.user.grants.find(
        (grant) => grant.permission === AppPermission.TicketsRead,
      );

    if (!readGrant) {
      throw new ForbiddenException('Permissão insuficiente.');
    }

    if (readGrant.scope === PermissionScope.Sector) {
      throw new ForbiddenException(
        'O escopo de setor ainda não foi configurado para Atendimentos.',
      );
    }

    const ownerTechnicianId =
      readGrant.scope === PermissionScope.Own ? input.user.id : undefined;

    const ticket = await this.repository.findById({
      ticketId: input.ticketId,
      userId: input.user.id,
      ownerTechnicianId,
    });

    if (!ticket) {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    return ticket;
  }
}
