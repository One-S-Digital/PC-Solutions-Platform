import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { WebhookDiagnosticsController } from './diagnostics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { MailingModule } from '../mailing/mailing.module';

@Module({
  imports: [PrismaModule, ConfigModule, EmailNotificationModule, MailingModule],
  controllers: [ClerkWebhookController, WebhookDiagnosticsController],
})
export class WebhooksModule {}