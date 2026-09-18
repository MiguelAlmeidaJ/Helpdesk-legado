import type {
  TicketAttachment,
  TicketAttachmentKind,
} from '@helpdesk/contracts';

export interface TicketAttachmentAccessInput {
  ticketId: number;
  actorUserId: number;
  ownerTechnicianId?: number;
}

export interface AddTicketAttachmentInput extends TicketAttachmentAccessInput {
  originalName: string;
  mimeType: string;
  data: Buffer;
}

export interface DeleteTicketAttachmentInput extends TicketAttachmentAccessInput {
  kind: TicketAttachmentKind;
  attachmentId: number;
}

export interface TicketAttachmentContent {
  name: string;
  mimeType: string;
  data: Buffer;
}

export abstract class TicketAttachmentRepository {
  abstract list(input: TicketAttachmentAccessInput): Promise<TicketAttachment[] | null>;
  abstract content(
    input: DeleteTicketAttachmentInput,
  ): Promise<TicketAttachmentContent | null>;
  abstract add(
    input: AddTicketAttachmentInput,
  ): Promise<TicketAttachment | null>;
  abstract delete(input: DeleteTicketAttachmentInput): Promise<boolean>;
}
