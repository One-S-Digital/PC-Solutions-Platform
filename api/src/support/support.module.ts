import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { MailgunService } from './mailgun.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailTemplateService } from '../email-notification/email-template.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SupportController],
  providers: [SupportService, MailgunService, EmailTemplateService],
  exports: [SupportService],
})
export class SupportModule {}
