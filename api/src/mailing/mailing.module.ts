import { Module } from '@nestjs/common';
import { MailingController } from './mailing.controller';
import { MailingService } from './mailing.service';
import { MailingTransportService } from './mailing-transport.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MailingController],
  providers: [MailingService, MailingTransportService],
  exports: [MailingService, MailingTransportService],
})
export class MailingModule {}
