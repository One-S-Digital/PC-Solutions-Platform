import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transport.interface';

export class SendGridTransport implements MailingTransportAdapter {
  private sgMail: any = null;

  constructor() {
    if (this.isConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sg = require('@sendgrid/mail');
        sg.setApiKey(process.env.SENDGRID_API_KEY!);
        this.sgMail = sg;
      } catch {
        // @sendgrid/mail not available – adapter stays disabled
      }
    }
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.sgMail) {
      return { success: false, error: 'SendGrid transport not initialised', provider: 'sendgrid' };
    }

    try {
      const from = options.from || {
        email: process.env.MAILING_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@procreche.ch',
        name: process.env.MAILING_FROM_NAME || process.env.FROM_NAME || 'ProCreche Solutions',
      };

      const msg: Record<string, any> = {
        to: options.to,
        from: { email: from.email, name: from.name },
        subject: options.subject,
        html: options.html,
        text: options.text,
        categories: options.tags || [],
      };

      if (options.replyTo) {
        msg.replyTo = options.replyTo;
      }
      if (options.metadata) {
        msg.customArgs = options.metadata;
      }

      const response = await this.sgMail.send(msg);
      const messageId = response?.[0]?.headers?.['x-message-id'] as string | undefined;

      return {
        success: true,
        messageId,
        provider: 'sendgrid',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'SendGrid send failed',
        provider: 'sendgrid',
      };
    }
  }

  isConfigured(): boolean {
    return !!process.env.SENDGRID_API_KEY;
  }

  getProviderName(): string {
    return 'sendgrid';
  }
}
