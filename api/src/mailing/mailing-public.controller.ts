import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MailingService } from './mailing.service';
import { verifyUnsubscribeToken } from './unsubscribe-token.util';

@Controller('mailing')
export class MailingPublicController {
  constructor(private readonly mailing: MailingService) {}

  @Get('unsubscribe')
  async unsubscribe(@Query('token') token: string | undefined, @Res() res: Response) {
    const secret = process.env.MAILING_UNSUBSCRIBE_SECRET || process.env.CLERK_WEBHOOK_SECRET || 'dev-secret';
    const payload = token ? verifyUnsubscribeToken(token, secret) : null;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!payload) {
      res.status(400).send(this.renderHtml({
        title: 'Unsubscribe failed',
        body: `<p>Invalid or expired unsubscribe link.</p>`,
      }));
      return;
    }

    await this.mailing.applyPublicUnsubscribe({
      email: payload.email,
      scope: payload.scope,
      listId: payload.listId,
    });

    const scopeLabel =
      payload.scope === 'GLOBAL'
        ? 'You are unsubscribed from all admin mailings.'
        : 'You are unsubscribed from this mailing list.';

    res.status(200).send(this.renderHtml({
      title: 'Unsubscribed',
      body: `<p>${scopeLabel}</p><p>You can close this page.</p>`,
    }));
  }

  private renderHtml(params: { title: string; body: string }) {
    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${params.title}</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; background: #f9fafb; }
            .wrap { max-width: 640px; margin: 40px auto; padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
            h1 { font-size: 20px; margin: 0 0 12px 0; }
            p { color: #374151; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>${params.title}</h1>
            ${params.body}
          </div>
        </body>
      </html>
    `.trim();
  }
}

