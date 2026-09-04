import { Injectable } from '@nestjs/common';
import type {
  TicketClassificationCatalogsResponse,
  TicketCatalogOption,
} from '@helpdesk/contracts';
import { TicketClassificationRepository } from './ports/ticket-classification.repository';

export const TICKET_TYPES: TicketCatalogOption[] = [
  { id: 0, name: 'Não informado' },
  { id: 1, name: 'Falha' },
  { id: 2, name: 'Relacionamento' },
  { id: 3, name: 'Requisição de Serviços' },
  { id: 4, name: 'Requisição de informação' },
  { id: 5, name: 'Notificação de monitoramento' },
  { id: 6, name: 'Melhorias' },
  { id: 7, name: 'Tarefa' },
];

export const TICKET_LEVELS: TicketCatalogOption[] = [
  { id: 0, name: 'Não informado' },
  { id: 1, name: 'Nível 1' },
  { id: 2, name: 'Nível 2' },
  { id: 3, name: 'Nível 3' },
  { id: 4, name: 'Rotina' },
  { id: 5, name: 'Administrativo' },
  { id: 6, name: 'Tarefa' },
];

export const TICKET_PRIORITIES: TicketCatalogOption[] = [
  { id: 0, name: 'Não informado' },
  { id: 1, name: 'Baixa' },
  { id: 2, name: 'Média' },
  { id: 3, name: 'Alta' },
  { id: 4, name: 'Urgente' },
];

export const TICKET_FORMS: TicketCatalogOption[] = [
  { id: 1, name: 'Remoto' },
  { id: 2, name: 'Presencial' },
  { id: 3, name: 'Remoto - Plantão' },
  { id: 4, name: 'Presencial - Plantão' },
];

@Injectable()
export class GetTicketClassificationCatalogs {
  constructor(private readonly repository: TicketClassificationRepository) {}

  async execute(): Promise<TicketClassificationCatalogsResponse> {
    return {
      types: TICKET_TYPES,
      levels: TICKET_LEVELS,
      priorities: TICKET_PRIORITIES,
      forms: TICKET_FORMS,
      categories: await this.repository.listCategories(),
    };
  }

  listSubcategories(categoryId: number) {
    if (categoryId === 0) {
      return Promise.resolve([{ id: 0, name: 'Não informado' }]);
    }
    return this.repository.listSubcategories(categoryId);
  }

  listItems(subcategoryId: number) {
    if (subcategoryId === 0) {
      return Promise.resolve([{ id: 0, name: 'Não informado' }]);
    }
    return this.repository.listItems(subcategoryId);
  }
}
