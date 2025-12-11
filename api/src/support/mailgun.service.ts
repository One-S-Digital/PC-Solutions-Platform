import { Injectable, Logger } from '@nestjs/common';
import Mailgun from 'mailgun.js';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');

export interface MailgunEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: string[];
  variables?: Record<string, string>;
}

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);
  private mailgunClient: any = null;
  private mailgunDomain: string | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (mailgunApiKey && mailgunDomain) {
      try {
        const mailgun = new Mailgun(FormData);
        this.mailgunClient = mailgun.client({
          username: 'api',
          key: mailgunApiKey,
        });
        this.mailgunDomain = mailgunDomain;
        this.isInitialized = true;
        this.logger.log('Mailgun initialized successfully for support tickets');
      } catch (error) {
        this.logger.error(`Failed to initialize Mailgun: ${(error as Error).message}`, (error as Error).stack);
        this.isInitialized = false;
      }
    } else {
      this.logger.warn('MAILGUN_API_KEY or MAILGUN_DOMAIN not configured - support ticket emails will be disabled');
      this.isInitialized = false;
    }
  }

  /**
   * Send an email via Mailgun
   */
  async sendEmail(options: MailgunEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isInitialized || !this.mailgunClient || !this.mailgunDomain) {
      const error = 'Mailgun not configured - cannot send email';
      this.logger.error(error);
      return { success: false, error };
    }

    try {
      const fromEmail = process.env.FROM_EMAIL || 'noreply@procreche.ch';
      const fromName = process.env.FROM_NAME || 'Pro Crèche Solutions';
      const fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      const emailData: any = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      // Add tags if provided
      if (options.tags && options.tags.length > 0) {
        emailData['o:tag'] = options.tags;
      }

      // Add custom variables if provided
      if (options.variables) {
        Object.entries(options.variables).forEach(([key, value]) => {
          emailData[`v:${key}`] = value;
        });
      }

      const response = await this.mailgunClient.messages.create(this.mailgunDomain, emailData);

      const messageId = response.id || response.message || null;
      this.logger.log(`Email sent successfully via Mailgun to ${options.to} (Message ID: ${messageId})`);

      return { success: true, messageId };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorStatus = error?.status || error?.statusCode || 'N/A';
      const errorDetails = error?.details || error?.body || '';

      // Log detailed error information for troubleshooting
      this.logger.error(
        `Failed to send email via Mailgun: ${errorMessage} (Status: ${errorStatus})`,
        error?.stack
      );

      // Provide more helpful error messages for common issues
      let userFriendlyError = errorMessage;
      if (errorStatus === 401 || errorMessage.includes('Unauthorized')) {
        userFriendlyError = 'Invalid Mailgun API key. Please check MAILGUN_API_KEY in your environment variables.';
      } else if (errorStatus === 403 || errorMessage.includes('Forbidden')) {
        userFriendlyError = `Mailgun Forbidden error. Possible causes:
- Domain not verified in Mailgun dashboard
- API key doesn't have permission for this domain
- Using sandbox domain but recipient not authorized
- Check MAILGUN_DOMAIN matches your verified domain in Mailgun`;
      } else if (errorStatus === 404) {
        userFriendlyError = `Mailgun domain not found. Please verify MAILGUN_DOMAIN is correct and the domain exists in your Mailgun account.`;
      }

      if (errorDetails) {
        this.logger.debug(`Mailgun error details: ${JSON.stringify(errorDetails)}`);
      }

      return { success: false, error: userFriendlyError };
    }
  }

  /**
   * Check if Mailgun is properly configured
   */
  isConfigured(): boolean {
    return this.isInitialized && this.mailgunClient !== null && this.mailgunDomain !== null;
  }
}

