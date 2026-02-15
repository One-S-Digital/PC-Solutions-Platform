import { Injectable, Logger } from '@nestjs/common';
import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transports/transport.interface';
import { SmtpTransport } from './transports/smtp.transport';
import { MailgunTransport } from './transports/mailgun.transport';
import { SendGridTransport } from './transports/sendgrid.transport';

@Injectable()
export class MailingTransportService {
  private readonly logger = new Logger(MailingTransportService.name);
  private adapter: MailingTransportAdapter | null = null;

  constructor() {
    try {
      const smtp = new SmtpTransport();
      const mailgun = new MailgunTransport();
      const sendgrid = new SendGridTransport();

      if (smtp.isConfigured()) {
        this.adapter = smtp;
      } else if (mailgun.isConfigured()) {
        this.adapter = mailgun;
      } else if (sendgrid.isConfigured()) {
        this.adapter = sendgrid;
      }

      if (this.adapter) {
        this.logger.log(`Mailing transport initialised: ${this.adapter.getProviderName()}`);
      } else {
        this.logger.warn(
          'No mailing transport configured. Set MAILING_SMTP_HOST, MAILGUN_API_KEY, or SENDGRID_API_KEY.',
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to initialise mailing transports: ${error?.message || error}`,
      );
      // Don't crash — preview/export/segment features still work without a send transport
    }
  }

  /** Default from address for all campaign emails. */
  getFromAddress(): { email: string; name: string } {
    return {
      email:
        process.env.MAILING_FROM_EMAIL ||
        process.env.MAILING_SMTP_USER ||
        process.env.FROM_EMAIL ||
        'noreply@procreche.ch',
      name:
        process.env.MAILING_FROM_NAME ||
        process.env.FROM_NAME ||
        'ProCreche Solutions',
    };
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.adapter) {
      return { success: false, error: 'No mailing transport configured', provider: 'none' };
    }
    if (!options.from) {
      options.from = this.getFromAddress();
    }
    return this.adapter.sendEmail(options);
  }

  isConfigured(): boolean {
    return this.adapter !== null;
  }

  getProviderName(): string {
    return this.adapter?.getProviderName() || 'none';
  }
}
