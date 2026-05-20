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

    const from = options.from || {
      email: process.env.RESEND_FROM_EMAIL || 'notify@notify.procrechesolutions.com',
      name: process.env.RESEND_FROM_NAME || 'Pro Crèche Solutions',
    };

    try {
      const headers: Record<string, string> = {};
      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          headers[`X-${key}`] = value;
        }
      }

      const { data, error } = await this.client.emails.send({
        from: `${from.name} <${from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
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
