import { Injectable, Logger } from '@nestjs/common';
import { ResendTransport } from '../mailing/transports/resend.transport';
import {
  MailingSendOptions,
  MailingSendResult,
} from '../mailing/transports/transport.interface';

/**
 * Dedicated transport for transactional emails (Resend / notify.procrechesolutions.com).
 * Used by EmailNotificationService and SupportService.
 */
@Injectable()
export class ResendTransportService {
  private readonly logger = new Logger(ResendTransportService.name);
  private readonly transport = new ResendTransport();

  constructor() {
    if (this.transport.isConfigured()) {
      this.logger.log('Transactional email transport initialised: resend');
    } else {
      this.logger.warn(
        'Resend not configured — transactional emails disabled. Set RESEND_API_KEY.',
      );
    }
  }

  getFromAddress(): { email: string; name: string } {
    return {
      email:
        process.env.RESEND_FROM_EMAIL || 'notifications@notify.procrechesolutions.com',
      name:
        process.env.RESEND_FROM_NAME || 'Pro Crèche Solutions',
    };
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.transport.isConfigured()) {
      return { success: false, error: 'Resend not configured', provider: 'resend' };
    }
    if (!options.from) {
      options.from = this.getFromAddress();
    }
    return this.transport.sendEmail(options);
  }

  isConfigured(): boolean {
    return this.transport.isConfigured();
  }

  getProviderName(): string {
    return 'resend';
  }
}
