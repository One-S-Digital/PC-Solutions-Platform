import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ClerkWebhookController],
  // Removed WebhooksController to avoid route conflicts
})
export class WebhooksModule {}