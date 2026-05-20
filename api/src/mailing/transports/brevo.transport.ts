import { BrevoClient } from '@getbrevo/brevo';
import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transport.interface';

/** Parse "Name <email>" or plain "email" into { name, email }. */
function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: '', email: raw.trim() };
}

export class BrevoTransport implements MailingTransportAdapter {
  private client: BrevoClient | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY!.trim() });
    }
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.client) {
      return { success: false, error: 'Brevo transport not initialised', provider: 'brevo' };
    }

    const fromRaw = process.env.BREVO_FROM_EMAIL ?? '';
    if (!options.from && !fromRaw.trim()) {
      return { success: false, error: 'BREVO_FROM_EMAIL is not set', provider: 'brevo' };
    }

    const sender = options.from ?? parseAddress(fromRaw);
    const replyToEmail = options.replyTo ?? process.env.BREVO_REPLY_TO;

    try {
      const body: Record<string, any> = {
        sender: { name: sender.name, email: sender.email },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
      };

      if (replyToEmail) {
        body.replyTo = { email: replyToEmail };
      }
      if (options.tags?.length) {
        body.tags = options.tags;
      }
      if (options.metadata && Object.keys(options.metadata).length) {
        body.headers = Object.fromEntries(
          Object.entries(options.metadata).map(([k, v]) => [`X-${k}`, v]),
        );
      }

      const response = await this.client.transactionalEmails.sendTransacEmail(body);
      const messageId: string | undefined = (response as any)?.messageId ?? undefined;

      return { success: true, messageId, provider: 'brevo' };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Brevo send failed',
        provider: 'brevo',
      };
    }
  }

  isConfigured(): boolean {
    return !!process.env.BREVO_API_KEY?.trim();
  }

  getProviderName(): string {
    return 'brevo';
  }
}
