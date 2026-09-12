import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class PasswordResetMailer {
  private readonly logger = new Logger(PasswordResetMailer.name);

  constructor(private readonly config: ConfigService) {}

  async send(email: string, token: string): Promise<boolean> {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !password) {
      this.logger.error('SMTP não configurado; recuperação de senha não enviada.');
      return false;
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secure =
      this.config.get<string>('SMTP_SECURE')?.trim().toLowerCase() === 'true';
    const webUrl = (
      this.config.get<string>('WEB_PUBLIC_URL')?.trim() ||
      this.config.get<string>('WEB_ORIGIN')?.trim() ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const resetUrl = `${webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      `Helpdesk <${user}>`;

    try {
      const transport = nodemailer.createTransport({
        host,
        port: Number.isInteger(port) && port > 0 ? port : 587,
        secure,
        auth: { user, pass: password },
      });

      await transport.sendMail({
        from,
        to: email,
        subject: 'Recuperação de senha do Helpdesk',
        text: `Use o link abaixo para definir uma nova senha. Ele expira em 30 minutos.\n\n${resetUrl}`,
        html: `<p>Use o link abaixo para definir uma nova senha. Ele expira em 30 minutos.</p><p><a href="${resetUrl}">Redefinir minha senha</a></p>`,
      });
      return true;
    } catch (error) {
      this.logger.error(
        'Falha ao enviar recuperação de senha.',
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }
}
