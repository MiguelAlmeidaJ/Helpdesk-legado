import {
  Sector,
  type TicketTypeCapabilities,
  type TicketTypeFieldKey,
  type TicketTypeKey,
} from '@helpdesk/contracts';

export interface TicketTypeStorageDefinition {
  entityTable: string;
  interactionTable: string;
  holdTable?: string;
  imageTable?: string;
  group?: {
    entityTable: string;
    interactionTable: string;
    holdTable?: string;
  };
}

export interface RegisteredTicketTypeDefinition {
  key: TicketTypeKey;
  label: string;
  description: string;
  serviceSectors: Sector[];
  restrictedToSectors: Sector[];
  capabilities: TicketTypeCapabilities;
  requiredFields: TicketTypeFieldKey[];
  optionalFields: TicketTypeFieldKey[];
  storage: TicketTypeStorageDefinition;
}

export const TICKET_TYPE_DEFINITIONS: readonly RegisteredTicketTypeDefinition[] = [
  {
    key: 'atendimento',
    label: 'Atendimento',
    description: 'Atendimento de TI ou DevOps com SLA.',
    serviceSectors: [Sector.IT, Sector.DevOps],
    restrictedToSectors: [],
    capabilities: {
      sla: true,
      scheduledOpening: true,
      recurrence: true,
      priority: true,
      projects: false,
      taskDependencies: false,
      progress: false,
      taskImages: false,
    },
    requiredFields: [
      'clientId',
      'typeId',
      'categoryId',
      'levelId',
      'priorityId',
      'formId',
      'openingDescription',
      'openingAt',
    ],
    optionalFields: [
      'requesterId',
      'locationId',
      'subcategoryId',
      'itemId',
      'technicianId',
      'recurrence',
    ],
    storage: {
      entityTable: 'atendimentos',
      interactionTable: 'interatividade',
      holdTable: 'espera',
    },
  },
  {
    key: 'devops',
    label: 'DevOps',
    description: 'Ticket operacional de DevOps, opcionalmente agrupado em projeto.',
    serviceSectors: [Sector.DevOps],
    restrictedToSectors: [Sector.DevOps],
    capabilities: {
      sla: false,
      scheduledOpening: true,
      recurrence: false,
      priority: false,
      projects: true,
      taskDependencies: true,
      progress: true,
      taskImages: true,
    },
    requiredFields: [
      'name',
      'clientId',
      'typeId',
      'categoryId',
      'levelId',
      'formId',
      'openingDescription',
      'openingAt',
    ],
    optionalFields: [
      'requesterId',
      'locationId',
      'subcategoryId',
      'itemId',
      'technicianId',
      'projectId',
      'days',
      'dependencyTaskId',
    ],
    storage: {
      entityTable: 'tarefas',
      interactionTable: 'inter_tarefa',
      holdTable: 'espera_tarefas',
      imageTable: 'imagens_tarefa',
      group: {
        entityTable: 'projetos',
        interactionTable: 'inter_projeto',
        holdTable: 'espera_projeto',
      },
    },
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Ticket de Marketing com os campos e catálogos do terceiro andar.',
    serviceSectors: [Sector.Marketing],
    restrictedToSectors: [Sector.Marketing],
    capabilities: {
      sla: false,
      scheduledOpening: true,
      recurrence: false,
      priority: false,
      projects: false,
      taskDependencies: false,
      progress: false,
      taskImages: false,
    },
    requiredFields: [
      'name',
      'clientId',
      'typeId',
      'categoryId',
      'levelId',
      'formId',
      'openingDescription',
      'openingAt',
    ],
    optionalFields: [
      'requesterId',
      'locationId',
      'subcategoryId',
      'itemId',
      'technicianId',
    ],
    storage: {
      entityTable: 'tarefas_terc_andar',
      interactionTable: 'inter_terc_andar',
      holdTable: 'espera_terc_andar',
    },
  },
];
