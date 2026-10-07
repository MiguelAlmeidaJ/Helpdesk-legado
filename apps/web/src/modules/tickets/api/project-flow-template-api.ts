import type {
  TicketProjectFlowTemplate,
  TicketProjectFlowTemplateApplyResponse,
  TicketProjectFlowTemplatesResponse,
  TicketProjectFlowTemplateWriteRequest,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchProjectFlowTemplates(
  signal?: AbortSignal,
): Promise<TicketProjectFlowTemplatesResponse> {
  return apiRequest<TicketProjectFlowTemplatesResponse>(
    'tickets/project-flow-templates',
    { signal },
  );
}

export function createProjectFlowTemplate(
  input: TicketProjectFlowTemplateWriteRequest,
): Promise<TicketProjectFlowTemplate> {
  return apiRequest<TicketProjectFlowTemplate>('tickets/project-flow-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateProjectFlowTemplate(
  templateId: number,
  input: TicketProjectFlowTemplateWriteRequest,
): Promise<TicketProjectFlowTemplate> {
  return apiRequest<TicketProjectFlowTemplate>(
    `tickets/project-flow-templates/${templateId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function deleteProjectFlowTemplate(templateId: number): Promise<void> {
  return apiRequest<null>(`tickets/project-flow-templates/${templateId}`, {
    method: 'DELETE',
  }).then(() => undefined);
}

export function applyProjectFlowTemplate(
  projectId: number,
  templateId: number,
): Promise<TicketProjectFlowTemplateApplyResponse> {
  return apiRequest<TicketProjectFlowTemplateApplyResponse>(
    `tickets/projects/${projectId}/flow-templates/${templateId}/apply`,
    { method: 'POST' },
  );
}
