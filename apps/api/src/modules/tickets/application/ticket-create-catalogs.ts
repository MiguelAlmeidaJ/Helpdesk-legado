import type { TicketCatalogOption } from '@helpdesk/contracts';

export const CREATE_TICKET_TYPES: TicketCatalogOption[] = [
  { id: 2, name: 'Relacionamento' },
  { id: 3, name: 'Requisição de Serviços' },
  { id: 4, name: 'Requisição de informação' },
  { id: 6, name: 'Melhorias' },
];

export const CREATE_TICKET_LEVELS: TicketCatalogOption[] = [
  { id: 0, name: 'NA' },
  { id: 1, name: 'Nível 1' },
  { id: 2, name: 'Nível 2' },
  { id: 3, name: 'Nível 3' },
  { id: 4, name: 'Rotina' },
  { id: 5, name: 'Administrativo' },
  { id: 6, name: 'Tarefa' },
];

export const CREATE_TICKET_PRIORITIES: TicketCatalogOption[] = [
  { id: 1, name: 'Baixa' },
  { id: 2, name: 'Média' },
  { id: 3, name: 'Alta' },
  { id: 4, name: 'Urgente' },
];

export const CREATE_TICKET_FORMS: TicketCatalogOption[] = [
  { id: 1, name: 'Remoto' },
  { id: 2, name: 'Presencial' },
  { id: 3, name: 'Remoto - Plantão' },
  { id: 4, name: 'Presencial - Plantão' },
];

export const CREATE_TICKET_RECURRENCE_RULES: TicketCatalogOption[] = [
  { id: 1, name: 'Diária' },
  { id: 6, name: 'Semanal' },
  { id: 7, name: 'Dia da semana no mês' },
  { id: 2, name: 'Mensal' },
  { id: 3, name: 'Trimestral' },
  { id: 4, name: 'Semestral' },
  { id: 5, name: 'Anual' },
];
