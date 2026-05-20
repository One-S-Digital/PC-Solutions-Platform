import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface ResendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: string[];
  variables?: Record<string, string>;
}

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private client: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.client = new Resend(apiKey);
      this.logger.log('Resend initialised for support tickets');
    } else {
      this.logger.warn('RESEND_API_KEY not configured — support ticket emails disabled');
    }
  }

  async sendEmail(
    options: ResendEmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Resend not configured' };
    }

    const from = process.env.RESEND_FROM_EMAIL;
    if (!from) {
      return { success: false, error: 'RESEND_FROM_EMAIL is not set' };
    }

    const replyTo = process.env.RESEND_REPLY_TO;

    try {
      const headers: Record<string, string> = {};
      if (options.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
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
        this.logger.error(`Resend error for support email to ${options.to}: ${error.message}`);
        return { success: false, error: error.message };
      }

      this.logger.log(`Support email sent via Resend to ${options.to} (id: ${data?.id})`);
      return { success: true, messageId: data?.id ?? undefined };
    } catch (err: any) {
      this.logger.error(`Failed to send support email via Resend: ${err?.message}`, err?.stack);
      return { success: false, error: err?.message || 'Resend send failed' };
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }
}
