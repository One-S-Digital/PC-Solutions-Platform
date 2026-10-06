import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { MailingController } from './mailing.controller';
import { MailingUnsubscribeController } from './mailing-unsubscribe.controller';
import { MailingUnsubscribeService } from './mailing-unsubscribe.service';
import { MailingService } from './mailing.service';
import { MailingTransportService } from './mailing-transport.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MailingController, MailingUnsubscribeController],
  providers: [MailingService, MailingTransportService, MailingUnsubscribeService],
  exports: [MailingService, MailingTransportService],
})
export class MailingModule implements OnModuleInit {
  private readonly logger = new Logger(MailingModule.name);

  onModuleInit() {
    this.logger.log('MailingModule initialised — controller routes registered');
  }
}
