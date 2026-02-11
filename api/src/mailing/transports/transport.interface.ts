export interface MailingSendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: { email: string; name: string };
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface MailingSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface MailingTransportAdapter {
  sendEmail(options: MailingSendOptions): Promise<MailingSendResult>;
  isConfigured(): boolean;
  getProviderName(): string;
}
