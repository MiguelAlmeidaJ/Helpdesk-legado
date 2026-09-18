import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { LogisticsExpenseApprovalItem } from '@helpdesk/contracts';

const LEGACY_RECIPIENTS = [
  'clerio.junior@gmail.com',
  'osvaldo.carvalho@nivel3ti.com.br',
  'cleristom.silva@nivel3ti.com.br',
];

function recipients(value: string | undefined): string[] {
  const entries = value?.trim() ? value.split(/[;,]/) : LEGACY_RECIPIENTS;
  return entries
    .map((entry) => entry.trim())
    .filter(
      (entry, index, all) =>
        entry.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry) &&
        all.indexOf(entry) === index,
    );
}

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

@Injectable()
export class ExpenseApprovalMailer {
  constructor(private readonly config: ConfigService) {}

  async sendApproved(items: LogisticsExpenseApprovalItem[]): Promise<void> {
    const enabled =
      this.config
        .get<string>('RD_APPROVAL_EMAIL_ENABLED')
        ?.trim()
        .toLowerCase() === 'true';
    if (!enabled || items.length === 0) return;

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!host || !from) {
      throw new Error('SMTP_HOST/SMTP_FROM não configurados.');
    }

    const to = recipients(
      this.config.get<string>('RD_APPROVAL_EMAIL_RECIPIENTS'),
    );
    if (to.length === 0) {
      throw new Error('RD_APPROVAL_EMAIL_RECIPIENTS não possui destinatários válidos.');
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secure =
      this.config.get<string>('SMTP_SECURE')?.trim().toLowerCase() === 'true';
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config.get<string>('SMTP_PASS');

    const transport = nodemailer.createTransport({
      host,
      port: Number.isInteger(port) && port > 0 ? port : 587,
      secure,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });

    const lines = items.flatMap((item) => [
      `RD #${item.id}`,
      `Prestador de Serviços: ${item.userName}`,
      `Valor: ${money(item.amount)}`,
      `Categoria: ${item.categoryName}`,
      `Chave PIX: ${item.pix || '-'}`,
      `Tipo de Chave PIX: ${item.pixTypeName || '-'}`,
      `Observação: ${item.remarks || '-'}`,
      '',
    ]);

    await transport.sendMail({
      from,
      to,
      subject: 'Gestão de RDs: Despesas Aprovadas - Aguardando Pagamento',
      text: lines.join('\n'),
    });
  }
}
