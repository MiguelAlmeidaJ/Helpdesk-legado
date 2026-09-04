export const TICKET_HOLD_CAUSES = [
  'Terceiro',
  'Nivel3',
  'Cliente',
  'Aguardando compra',
  'Orçamento',
  'Melhoria',
] as const;

export type TicketHoldCause = (typeof TICKET_HOLD_CAUSES)[number];

export interface PutTicketOnHoldRequest {
  forecastAt: string;
  cause: TicketHoldCause;
  description: string;
}

export interface TicketHoldInfo {
  id: number;
  startedAt: string | null;
  forecastAt: string;
  cause: string;
  description: string;
  user: {
    id: number;
    name: string | null;
  };
}
