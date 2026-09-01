import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { WebhookDiagnosticsController } from './diagnostics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { SignupProfileModule } from '../users/signup-profile.module';

@Module({
  imports: [PrismaModule, ConfigModule, EmailNotificationModule, SignupProfileModule],
  controllers: [ClerkWebhookController, WebhookDiagnosticsController],
})
export class WebhooksModule {}