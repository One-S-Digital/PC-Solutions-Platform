import { Module } from '@nestjs/common';
import { EmailNotificationController } from './email-notification.controller';
import { EmailNotificationService } from './email-notification.service';
import { EmailTemplateService } from './email-template.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
import { AuthModule } from '../auth/auth.module';
  controllers: [EmailNotificationController],
  providers: [EmailNotificationService, EmailTemplateService],
  exports: [EmailNotificationService, EmailTemplateService],
})
export class EmailNotificationModule {}