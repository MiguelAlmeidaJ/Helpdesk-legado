export interface TicketSlaRule {
  id: number;
  name: string;
  clientId: number | null;
  clientName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  priority: number | null;
  qualityMinutes: number;
  clerioMinutes: number;
  active: boolean;
  sortOrder: number;
}

export interface TicketSlaRuleCatalogOption {
  id: number;
  name: string;
}

export interface TicketSlaRuleCatalogs {
  clients: TicketSlaRuleCatalogOption[];
  categories: TicketSlaRuleCatalogOption[];
}

export interface TicketSlaPolicyResponse {
  defaults: {
    qualityMinutes: number;
    clerioMinutes: number;
  };
  rules: TicketSlaRule[];
  catalogs: TicketSlaRuleCatalogs;
}

export interface SaveTicketSlaRuleRequest {
  name: string;
  clientId?: number | null;
  categoryId?: number | null;
  priority?: number | null;
  qualityMinutes: number;
  clerioMinutes: number;
  active: boolean;
  sortOrder: number;
}
