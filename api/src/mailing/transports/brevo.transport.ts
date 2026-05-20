import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transport.interface';

export class BrevoTransport implements MailingTransportAdapter {
  private apiKey: string | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.apiKey = process.env.BREVO_API_KEY!;
    }
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Brevo transport not initialised', provider: 'brevo' };
    }

    const from = options.from || {
      email: process.env.BREVO_FROM_EMAIL || 'mail@mail.procrechesolutions.com',
      name: process.env.BREVO_FROM_NAME || 'Pro Crèche Solutions',
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SibApiV3Sdk = require('@getbrevo/brevo');
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, this.apiKey);

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.sender = { name: from.name, email: from.email };
      sendSmtpEmail.to = [{ email: options.to }];
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.html;
      sendSmtpEmail.textContent = options.text;

      if (options.replyTo) {
        sendSmtpEmail.replyTo = { email: options.replyTo };
      }
      if (options.tags?.length) {
        sendSmtpEmail.tags = options.tags;
      }

      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      const messageId: string | undefined =
        response?.body?.messageId ?? response?.messageId ?? undefined;

      return { success: true, messageId, provider: 'brevo' };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Brevo send failed',
        provider: 'brevo',
      };
    }
  }

  isConfigured(): boolean {
    return !!process.env.BREVO_API_KEY;
  }

  getProviderName(): string {
    return 'brevo';
  }
}
