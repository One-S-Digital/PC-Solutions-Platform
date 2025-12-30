import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailingAdminController } from './mailing-admin.controller';
import { MailingPublicController } from './mailing-public.controller';
import { MailingService } from './mailing.service';
import { MailTransportService } from './mail-transport.service';

@Module({
  imports: [PrismaModule],
  controllers: [MailingAdminController, MailingPublicController],
  providers: [MailingService, MailTransportService],
  exports: [MailingService, MailTransportService],
})
export class MailingModule {}

