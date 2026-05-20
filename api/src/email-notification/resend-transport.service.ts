import { Injectable, Logger } from '@nestjs/common';
import { ResendTransport } from '../mailing/transports/resend.transport';
import {
  MailingSendOptions,
  MailingSendResult,
} from '../mailing/transports/transport.interface';

/**
 * Dedicated transport for transactional emails (Resend / notify.procrechesolutions.com).
 * From address and reply-to are driven entirely by RESEND_FROM_EMAIL and RESEND_REPLY_TO env vars.
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

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.transport.isConfigured()) {
      return { success: false, error: 'Resend not configured', provider: 'resend' };
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
