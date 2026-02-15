import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transport.interface';

export class MailgunTransport implements MailingTransportAdapter {
  private client: any = null;
  private domain: string | null = null;

  constructor() {
    if (this.isConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Mailgun = require('mailgun.js');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const FormData = require('form-data');
        const mailgun = new Mailgun(FormData);
        this.client = mailgun.client({
          username: 'api',
          key: process.env.MAILGUN_API_KEY!,
        });
        this.domain = process.env.MAILGUN_DOMAIN!;
      } catch {
        // mailgun.js not available – adapter stays disabled
      }
    }
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.client || !this.domain) {
      return { success: false, error: 'Mailgun transport not initialised', provider: 'mailgun' };
    }

    try {
      const from = options.from || {
        email: process.env.MAILING_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@procreche.ch',
        name: process.env.MAILING_FROM_NAME || process.env.FROM_NAME || 'ProCreche Solutions',
      };

      const emailData: Record<string, any> = {
        from: `${from.name} <${from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.replyTo) {
        emailData['h:Reply-To'] = options.replyTo;
      }
      if (options.tags?.length) {
        emailData['o:tag'] = options.tags;
      }
      if (options.metadata) {
        Object.entries(options.metadata).forEach(([key, value]) => {
          emailData[`v:${key}`] = value;
        });
      }

      const response = await this.client.messages.create(this.domain, emailData);

      return {
        success: true,
        messageId: response.id || response.message || undefined,
        provider: 'mailgun',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Mailgun send failed',
        provider: 'mailgun',
      };
    }
  }

  isConfigured(): boolean {
    return !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
  }

  getProviderName(): string {
    return 'mailgun';
  }
}
