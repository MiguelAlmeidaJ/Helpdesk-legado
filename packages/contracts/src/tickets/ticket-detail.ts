import type { TicketStatus } from './ticket-status';

export interface TicketDetailCode {
  code: number | null;
  label: string;
}

export interface TicketDetailReference {
  id: number | null;
  name: string | null;
}

export interface TicketDetailClient {
  id: number;
  legalName: string | null;
  tradeName: string | null;
  document: string | null;
}

export interface TicketDetailRequester extends TicketDetailReference {
  role: string | null;
  phone: string | null;
  email: string | null;
}

export interface TicketDetailLocation extends TicketDetailReference {
  address: string | null;
  city: string | null;
  state: string | null;
}

export interface TicketDetailTechnician extends TicketDetailReference {
  phone: string | null;
  email: string | null;
}

export interface TicketInteraction {
  id: number;
  type: number;
  occurredAt: string | null;
  description: string;
  user: {
    id: number;
    name: string;
  };
}

export interface TicketDetailResponse {
  id: number;
  area: number | null;
  status: TicketStatus;
  statusLabel: string;
  type: TicketDetailCode;
  level: TicketDetailCode;
  priority: TicketDetailCode;
  form: TicketDetailCode;
  incident: {
    reincident: boolean;
  };
  openedAt: string | null;
  closedAt: string | null;
  openingDescription: string | null;
  closingDescription: string | null;
  client: TicketDetailClient;
  requester: TicketDetailRequester;
  location: TicketDetailLocation;
  classification: {
    category: TicketDetailReference;
    subcategory: TicketDetailReference;
    item: TicketDetailReference;
  };
  technician: TicketDetailTechnician;
  interactions: TicketInteraction[];
}
