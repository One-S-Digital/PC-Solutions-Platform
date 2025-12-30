import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

export type MailProvider = 'sendgrid' | 'smtp';

export interface MailSendInput {
  to: string;
  from: { email: string; name?: string };
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

@Injectable()
export class MailTransportService {
  private readonly logger = new Logger(MailTransportService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getActiveEmailIntegration(): Promise<
    | { provider: MailProvider; configuration: any; credentials: any }
    | null
  > {
    const integration = await this.prisma.integrationConfig.findFirst({
      where: { type: 'email', isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!integration) return null;
    return {
      provider: (integration.provider as MailProvider) || 'sendgrid',
      configuration: integration.configuration ?? {},
      credentials: integration.credentials ?? {},
    };
  }

  async sendMail(input: MailSendInput): Promise<{ provider: MailProvider; messageId?: string }> {
    const integration = await this.getActiveEmailIntegration();
    const provider: MailProvider = (integration?.provider ||
      (process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp')) as MailProvider;

    if (provider === 'sendgrid') {
      const apiKey = integration?.credentials?.apiKey || process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        throw new Error('SendGrid is not configured (missing apiKey)');
      }
      sgMail.setApiKey(apiKey);

      const res = await sgMail.send({
        to: input.to,
        from: { email: input.from.email, name: input.from.name },
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo ? { email: input.replyTo } : undefined,
        headers: input.headers,
      });

      const messageId = (res?.[0]?.headers as any)?.['x-message-id'] as string | undefined;
      return { provider, messageId };
    }

    // SMTP
    const host = integration?.credentials?.host || process.env.SMTP_HOST;
    const portRaw = integration?.credentials?.port || process.env.SMTP_PORT;
    const port = typeof portRaw === 'number' ? portRaw : Number(portRaw || 587);
    const user = integration?.credentials?.user || process.env.SMTP_USER;
    const pass = integration?.credentials?.pass || process.env.SMTP_PASS;
    const secure = Boolean(integration?.credentials?.secure ?? (port === 465));

    if (!host || !port || !user || !pass) {
      throw new Error('SMTP is not configured (missing host/port/user/pass)');
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const info = await transport.sendMail({
      to: input.to,
      from: input.from.name ? `${input.from.name} <${input.from.email}>` : input.from.email,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: input.headers,
    });

    return { provider, messageId: info?.messageId };
  }

  async testEmailConnection(): Promise<{ success: boolean; provider?: MailProvider; message: string }> {
    try {
      const integration = await this.getActiveEmailIntegration();
      const provider: MailProvider = (integration?.provider ||
        (process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp')) as MailProvider;

      if (provider === 'sendgrid') {
        const apiKey = integration?.credentials?.apiKey || process.env.SENDGRID_API_KEY;
        if (!apiKey) return { success: false, provider, message: 'Missing SendGrid apiKey' };
        // Lightweight check
        const resp = await fetch('https://api.sendgrid.com/v3/user/profile', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return resp.ok
          ? { success: true, provider, message: 'SendGrid connection successful' }
          : { success: false, provider, message: `SendGrid connection failed (${resp.status})` };
      }

      const host = integration?.credentials?.host || process.env.SMTP_HOST;
      const portRaw = integration?.credentials?.port || process.env.SMTP_PORT;
      const port = typeof portRaw === 'number' ? portRaw : Number(portRaw || 587);
      const user = integration?.credentials?.user || process.env.SMTP_USER;
      const pass = integration?.credentials?.pass || process.env.SMTP_PASS;
      const secure = Boolean(integration?.credentials?.secure ?? (port === 465));

      if (!host || !port || !user || !pass) {
        return { success: false, provider, message: 'Missing SMTP host/port/user/pass' };
      }

      const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });

      await transport.verify();
      return { success: true, provider, message: 'SMTP connection successful' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Email connection test failed: ${message}`);
      return { success: false, message };
    }
  }
}

