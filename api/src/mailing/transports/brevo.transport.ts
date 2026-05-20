import {
  MailingTransportAdapter,
  MailingSendOptions,
  MailingSendResult,
} from './transport.interface';

/** Parse "Name <email>" or plain "email" into { name, email }. */
function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: '', email: raw.trim() };
}

export class BrevoTransport implements MailingTransportAdapter {
  private apiKey: string | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.apiKey = process.env.BREVO_API_KEY!.trim();
    }
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Brevo transport not initialised', provider: 'brevo' };
    }

    const fromRaw = process.env.BREVO_FROM_EMAIL ?? '';
    if (!options.from && !fromRaw.trim()) {
      return { success: false, error: 'BREVO_FROM_EMAIL is not set', provider: 'brevo' };
    }

    const sender = options.from ?? parseAddress(fromRaw);
    const replyToEmail = options.replyTo ?? process.env.BREVO_REPLY_TO;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SibApiV3Sdk = require('@getbrevo/brevo');
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, this.apiKey);

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.sender = { name: sender.name, email: sender.email };
      sendSmtpEmail.to = [{ email: options.to }];
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.html;
      sendSmtpEmail.textContent = options.text;

      if (replyToEmail) {
        sendSmtpEmail.replyTo = { email: replyToEmail };
      }
      if (options.tags?.length) {
        sendSmtpEmail.tags = options.tags;
      }

      // Forward campaign metadata as custom email headers for provider-side correlation
      if (options.metadata && Object.keys(options.metadata).length) {
        sendSmtpEmail.headers = Object.fromEntries(
          Object.entries(options.metadata).map(([k, v]) => [`X-${k}`, v]),
        );
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
    return !!process.env.BREVO_API_KEY?.trim();
  }

  getProviderName(): string {
    return 'brevo';
  }
}
