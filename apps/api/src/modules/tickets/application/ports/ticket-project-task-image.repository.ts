import type { TicketProjectTaskImage } from '@helpdesk/contracts';

export interface TicketProjectTaskImageAccessInput {
  taskId: number;
  actorUserId: number;
  ownerTechnicianId?: number;
}

export interface TicketProjectTaskImageIdentityInput
  extends TicketProjectTaskImageAccessInput {
  imageId: number;
}

export interface TicketProjectTaskImageWriteInput
  extends TicketProjectTaskImageAccessInput {
  data: Buffer;
}

export interface TicketProjectTaskImageReplaceInput
  extends TicketProjectTaskImageIdentityInput {
  data: Buffer;
}

export interface TicketProjectTaskImageContent {
  name: string;
  mimeType: 'image/jpeg';
  data: Buffer;
}

export abstract class TicketProjectTaskImageRepository {
  abstract list(
    input: TicketProjectTaskImageAccessInput,
  ): Promise<TicketProjectTaskImage[] | null>;

  abstract content(
    input: TicketProjectTaskImageIdentityInput,
  ): Promise<TicketProjectTaskImageContent | null>;

  abstract add(
    input: TicketProjectTaskImageWriteInput,
  ): Promise<TicketProjectTaskImage | null>;

  abstract replace(
    input: TicketProjectTaskImageReplaceInput,
  ): Promise<TicketProjectTaskImage | null>;

  abstract delete(
    input: TicketProjectTaskImageIdentityInput,
  ): Promise<boolean>;
}
