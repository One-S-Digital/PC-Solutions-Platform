import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
import { AuthModule } from '../auth/auth.module';
  controllers: [BillingController, WebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}