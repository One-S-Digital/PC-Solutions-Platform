import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { ResendService } from './resend.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailTemplateService } from '../email-notification/email-template.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SupportController],
  providers: [SupportService, SupportGateway, ResendService, EmailTemplateService],
  exports: [SupportService, SupportGateway],
})
export class SupportModule {}
