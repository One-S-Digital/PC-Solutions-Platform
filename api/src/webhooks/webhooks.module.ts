import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { WebhookDiagnosticsController } from './diagnostics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [PrismaModule, ConfigModule, EmailNotificationModule],
  controllers: [ClerkWebhookController, WebhookDiagnosticsController],
})
export class WebhooksModule {}