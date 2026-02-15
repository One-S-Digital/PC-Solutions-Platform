import * as nodemailer from 'nodemailer';
import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transport.interface';

export class SmtpTransport implements MailingTransportAdapter {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAILING_SMTP_HOST,
        port: parseInt(process.env.MAILING_SMTP_PORT || '587', 10),
        secure: process.env.MAILING_SMTP_SECURE === 'true',
        auth: {
          user: process.env.MAILING_SMTP_USER,
          pass: process.env.MAILING_SMTP_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      } as nodemailer.TransportOptions);
    }
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.transporter) {
      return { success: false, error: 'SMTP transport not initialised', provider: 'smtp' };
    }

    try {
      const from = options.from || {
        email: process.env.MAILING_FROM_EMAIL || process.env.MAILING_SMTP_USER || 'noreply@procreche.ch',
        name: process.env.MAILING_FROM_NAME || process.env.FROM_NAME || 'ProCreche Solutions',
      };

      const info = await this.transporter.sendMail({
        from: `"${from.name}" <${from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        headers: options.metadata
          ? { 'X-Campaign-Metadata': JSON.stringify(options.metadata) }
          : undefined,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'SMTP send failed',
        provider: 'smtp',
      };
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.MAILING_SMTP_HOST &&
      process.env.MAILING_SMTP_USER &&
      process.env.MAILING_SMTP_PASS
    );
  }

  getProviderName(): string {
    return 'smtp';
  }
}
