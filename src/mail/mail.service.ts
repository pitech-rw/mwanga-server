import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';

type MailTransport = 'smtp' | 'resend' | 'none';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: MailTransport;
  private readonly resend: Resend | null;
  private readonly smtp: Transporter | null;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');

    this.fromEmail =
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('RESEND_FROM_EMAIL') ??
      (smtpUser ? `Mwanga <${smtpUser}>` : 'Mwanga <onboarding@resend.dev>');

    if (smtpHost && smtpUser && smtpPass) {
      const port = Number(this.config.get<string>('SMTP_PORT') ?? '465');
      const secure = this.config.get<string>('SMTP_SECURE') !== 'false';

      this.smtp = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.resend = null;
      this.transport = 'smtp';
    } else if (resendApiKey) {
      this.smtp = null;
      this.resend = new Resend(resendApiKey);
      this.transport = 'resend';
    } else {
      this.smtp = null;
      this.resend = null;
      this.transport = 'none';
    }
  }

  async sendPasswordResetEmail(params: {
    to: string;
    firstName: string;
    resetUrl: string;
  }): Promise<void> {
    if (this.transport === 'none') {
      this.logger.warn('No mail transport configured; password reset email was not sent');
      if (process.env.NODE_ENV === 'development') {
        this.logger.log(`Password reset link for ${params.to}: ${params.resetUrl}`);
      }
      return;
    }

    const greeting = params.firstName.trim() || 'there';
    const subject = 'Reset your Mwanga password';
    const html = `
      <p>Hi ${escapeHtml(greeting)},</p>
      <p>We received a request to reset the password for your Mwanga account.</p>
      <p><a href="${escapeHtml(params.resetUrl)}">Choose a new password</a></p>
      <p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>
    `;

    if (this.transport === 'smtp' && this.smtp) {
      try {
        await this.smtp.sendMail({
          from: this.fromEmail,
          to: params.to,
          subject,
          html,
        });
      } catch (err) {
        this.logger.error(
          `SMTP send failed for ${params.to}`,
          err instanceof Error ? err.stack : String(err),
        );
        throw err;
      }
      return;
    }

    const { error } = await this.resend!.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Resend failed for ${params.to}: ${error.message}`);
      throw error;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}