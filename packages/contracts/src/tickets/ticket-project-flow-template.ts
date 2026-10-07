export interface TicketProjectFlowTemplateStep {
  key: string;
  name: string;
  description: string;
  durationDays: number;
  dependsOnKey: string | null;
  sortOrder: number;
}

export interface TicketProjectFlowTemplate {
  id: number;
  name: string;
  description: string;
  createdBy: { id: number | null; name: string | null };
  createdAt: string;
  updatedAt: string;
  steps: TicketProjectFlowTemplateStep[];
}

export interface TicketProjectFlowTemplatesResponse {
  data: TicketProjectFlowTemplate[];
}

export interface TicketProjectFlowTemplateWriteRequest {
  name: string;
  description: string;
  steps: Array<{
    key: string;
    name: string;
    description: string;
    durationDays: number;
    dependsOnKey: string | null;
  }>;
}

export interface TicketProjectFlowTemplateApplyResponse {
  templateId: number;
  projectId: number;
  createdTaskIds: number[];
}
