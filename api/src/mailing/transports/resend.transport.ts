import { Resend } from 'resend';
import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transport.interface';

export class ResendTransport implements MailingTransportAdapter {
  private client: Resend | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.client = new Resend(process.env.RESEND_API_KEY!);
    }
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.client) {
      return { success: false, error: 'Resend transport not initialised', provider: 'resend' };
    }

    // RESEND_FROM_EMAIL accepts "Name <email>" or plain "email" format
    const from = options.from
      ? `${options.from.name} <${options.from.email}>`
      : (process.env.RESEND_FROM_EMAIL ?? '');

    if (!from) {
      return { success: false, error: 'RESEND_FROM_EMAIL is not set', provider: 'resend' };
    }

    const replyTo = options.replyTo ?? process.env.RESEND_REPLY_TO;

    try {
      const headers: Record<string, string> = {};
      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          headers[`X-${key}`] = value;
        }
      }

      const { data, error } = await this.client.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo,
        tags: options.tags?.map((t) => ({ name: t, value: t })),
        headers: Object.keys(headers).length ? headers : undefined,
      });

      if (error) {
        return { success: false, error: error.message, provider: 'resend' };
      }

      return { success: true, messageId: data?.id ?? undefined, provider: 'resend' };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Resend send failed',
        provider: 'resend',
      };
    }
  }

  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY;
  }

  getProviderName(): string {
    return 'resend';
  }
}
