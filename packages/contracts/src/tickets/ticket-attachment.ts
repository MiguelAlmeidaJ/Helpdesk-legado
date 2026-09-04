export type TicketAttachmentKind = 'document' | 'image';

export interface TicketAttachment {
  id: number;
  kind: TicketAttachmentKind;
  name: string;
  mimeType: string;
  uploadedAt: string | null;
  uploadedBy: {
    id: number | null;
    name: string | null;
  };
}

export interface TicketAttachmentsResponse {
  attachments: TicketAttachment[];
}
