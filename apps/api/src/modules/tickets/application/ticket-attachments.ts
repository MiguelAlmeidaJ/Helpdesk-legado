import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  type TicketAttachmentKind,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketAttachmentRepository } from './ports/ticket-attachment.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';
import { resolveTicketReadAccess } from './ticket-read-access';

@Injectable()
export class TicketAttachments {
  constructor(private readonly repository: TicketAttachmentRepository) {}

  async list(user: AuthenticatedUser, ticketId: number) {
    const access = resolveTicketReadAccess(user);
    const attachments = await this.repository.list({
      ticketId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });
    if (!attachments) {
      throw new NotFoundException('Atendimento não encontrado ou fora do seu escopo.');
    }
    return { attachments };
  }

  async content(
    user: AuthenticatedUser,
    ticketId: number,
    kind: TicketAttachmentKind,
    attachmentId: number,
  ) {
    const access = resolveTicketReadAccess(user);
    const content = await this.repository.content({
      ticketId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      kind,
      attachmentId,
    });
    if (!content) {
      throw new NotFoundException('Anexo não encontrado ou fora do seu escopo.');
    }
    return content;
  }

  async add(
    user: AuthenticatedUser,
    ticketId: number,
    file: { originalName: string; mimeType: string; data: Buffer },
  ) {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsExecute,
    );
    const attachment = await this.repository.add({
      ticketId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      ...file,
    });
    if (!attachment) {
      throw new NotFoundException('Atendimento não encontrado ou fora do seu escopo.');
    }
    return attachment;
  }

  async delete(
    user: AuthenticatedUser,
    ticketId: number,
    kind: TicketAttachmentKind,
    attachmentId: number,
  ) {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsExecute,
    );
    const deleted = await this.repository.delete({
      ticketId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      kind,
      attachmentId,
    });
    if (!deleted) {
      throw new NotFoundException('Anexo não encontrado ou fora do seu escopo.');
    }
  }
}
