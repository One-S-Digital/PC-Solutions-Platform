import { Injectable, Logger } from '@nestjs/common';
import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transports/transport.interface';
import { BrevoTransport } from './transports/brevo.transport';

@Injectable()
export class MailingTransportService {
  private readonly logger = new Logger(MailingTransportService.name);
  private adapter: MailingTransportAdapter | null = null;

  constructor() {
    try {
      const brevo = new BrevoTransport();

      if (brevo.isConfigured()) {
        this.adapter = brevo;
      }

      if (this.adapter) {
        this.logger.log(`Campaign mailing transport initialised: ${this.adapter.getProviderName()}`);
      } else {
        this.logger.warn(
          'No campaign mailing transport configured. Set BREVO_API_KEY.',
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to initialise mailing transport: ${error?.message || error}`,
      );
    }
  }

  /** Default from address for campaign emails (Brevo / mail.procrechesolutions.com). */
  getFromAddress(): { email: string; name: string } {
    return {
      email:
        process.env.BREVO_FROM_EMAIL ||
        process.env.MAILING_FROM_EMAIL ||
        'mail@mail.procrechesolutions.com',
      name:
        process.env.BREVO_FROM_NAME ||
        process.env.MAILING_FROM_NAME ||
        'Pro Crèche Solutions',
    };
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.adapter) {
      return { success: false, error: 'No campaign mailing transport configured', provider: 'none' };
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
