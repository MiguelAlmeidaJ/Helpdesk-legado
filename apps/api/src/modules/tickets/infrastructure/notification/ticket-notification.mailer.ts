import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type {
  TicketNotificationContext,
  TicketNotificationOutboxEvent,
} from '../../domain/ticket-notification';
import { legacyLocalDateTimeDisplay } from '../../domain/legacy-local-date-time';

function addresses(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry));
}

function uniqueRecipients(context: TicketNotificationContext): string[] {
  const clientAddresses = [...addresses(context.clientEmail), ...addresses(context.requesterEmail)];
  const allowed = context.clientReceivesEmails === true;
  const excluded = new Set(allowed ? [] : clientAddresses.map(value => value.toLowerCase()));
  const recipients = [...(allowed ? clientAddresses : []), ...addresses(context.technicianEmail)]
    .filter(value => !excluded.has(value.toLowerCase()));
  return [...new Map(recipients.map(value => [value.toLowerCase(), value])).values()];
}

function eventLabel(event: TicketNotificationOutboxEvent): string {
  switch (event.eventType) {
    case 'ticket.opened':
      return event.payload.status === 0 ? 'Atendimento agendado' : 'Atendimento aberto';
    case 'ticket.on_hold':
      return 'Atendimento em espera';
    case 'ticket.resumed':
      return event.payload.automatic ? 'Atendimento retomado automaticamente' : 'Atendimento retomado';
    case 'ticket.concluded':
      return 'Atendimento concluído';
    case 'ticket.finalized':
      return 'Atendimento finalizado';
  }
}

function eventDetails(event: TicketNotificationOutboxEvent): string[] {
  const details: string[] = [];
  if (event.payload.openingAt) {
    details.push(`Abertura: ${legacyLocalDateTimeDisplay(event.payload.openingAt)}`);
  }
  if (event.payload.forecastAt) {
    const date = new Date(event.payload.forecastAt);
    details.push(
      `Previsão de retorno: ${
        Number.isNaN(date.getTime())
          ? event.payload.forecastAt
          : date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      }`,
    );
  }
  if (event.payload.cause) details.push(`Causa: ${event.payload.cause}`);
  if (event.payload.description) details.push(`Descrição: ${event.payload.description}`);
  return details;
}

@Injectable()
export class TicketNotificationMailer {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('SMTP_HOST')?.trim() &&
      this.config.get<string>('SMTP_FROM')?.trim(),
    );
  }

  recipients(context: TicketNotificationContext): string[] {
    return uniqueRecipients(context);
  }

  async send(
    event: TicketNotificationOutboxEvent,
    context: TicketNotificationContext,
    recipients: string[],
  ): Promise<void> {
    // Reapply the preference even if a caller passes a stale or manually constructed recipient list.
    const permitted = new Set(uniqueRecipients(context).map(value => value.toLowerCase()));
    recipients = recipients.filter(value => permitted.has(value.toLowerCase()));
    if (!recipients.length) return;
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!host || !from) throw new Error('SMTP_HOST/SMTP_FROM não configurados.');

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secure = this.config.get<string>('SMTP_SECURE')?.trim().toLowerCase() === 'true';
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config.get<string>('SMTP_PASS');
    const webUrl = (
      this.config.get<string>('WEB_PUBLIC_URL')?.trim() ||
      this.config.get<string>('WEB_ORIGIN')?.trim() ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const label = eventLabel(event);

    const transport = nodemailer.createTransport({
      host,
      port: Number.isInteger(port) && port > 0 ? port : 587,
      secure,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });

    await transport.sendMail({
      from,
      to: recipients,
      subject: `[Helpdesk] #${context.ticketId} · ${label}`,
      text: [
        label,
        '',
        `Atendimento #${context.ticketId}`,
        `Cliente: ${context.clientName ?? 'Não informado'}`,
        `Solicitante: ${context.requesterName ?? 'Não informado'}`,
        `Técnico: ${context.technicianName ?? 'Não atribuído'}`,
        ...eventDetails(event),
        '',
        `${webUrl}/tickets/${context.ticketId}`,
      ].join('\n'),
      messageId: `<ticket-outbox-${event.id}@helpdesk.local>`,
    });
  }
}
