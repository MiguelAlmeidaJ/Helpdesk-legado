export enum TicketStatus {
  Scheduled = 0,
  WaitingExecution = 1,
  InProgress = 2,
  OnHold = 3,
  Finished = 4,
  Completed = 5,
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.Scheduled]: 'Agendado',
  [TicketStatus.WaitingExecution]: 'Aguardando execução',
  [TicketStatus.InProgress]: 'Em execução',
  [TicketStatus.OnHold]: 'Em espera',
  [TicketStatus.Finished]: 'Finalizado',
  [TicketStatus.Completed]: 'Concluído',
};
