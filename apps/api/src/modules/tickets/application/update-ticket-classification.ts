import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  type UpdateTicketClassificationRequest,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import {
  TICKET_FORMS,
  TICKET_LEVELS,
  TICKET_PRIORITIES,
  TICKET_TYPES,
} from './get-ticket-classification-catalogs';
import { TicketClassificationRepository } from './ports/ticket-classification.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

function contains(options: { id: number }[], value: number): boolean {
  return options.some((option) => option.id === value);
}

@Injectable()
export class UpdateTicketClassification {
  constructor(private readonly repository: TicketClassificationRepository) {}

  async execute(
    user: AuthenticatedUser,
    ticketId: number,
    input: UpdateTicketClassificationRequest,
  ): Promise<void> {
    if (
      !contains(TICKET_TYPES, input.typeId) ||
      !contains(TICKET_LEVELS, input.levelId) ||
      !contains(TICKET_PRIORITIES, input.priorityId) ||
      !contains(TICKET_FORMS, input.formId) ||
      ![input.categoryId, input.subcategoryId, input.itemId].every(
        (value) => Number.isSafeInteger(value) && value >= 0,
      )
    ) {
      throw new BadRequestException('Classificação inválida.');
    }

    const description = input.openingDescription.trim();
    if (description.length < 1 || description.length > 10_000) {
      throw new BadRequestException(
        'openingDescription deve ter entre 1 e 10000 caracteres.',
      );
    }

    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsClassify,
    );

    const result = await this.repository.update({
      ...input,
      openingDescription: description,
      ticketId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'not-found') {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    if (result === 'invalid-catalog') {
      throw new BadRequestException(
        'Categoria, subcategoria ou item não pertencem à cadeia informada.',
      );
    }
  }
}
