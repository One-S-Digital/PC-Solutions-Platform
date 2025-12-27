import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadsSchedulerService } from './leads-scheduler.service';

@Module({
  imports: [PrismaModule, AuthModule, EmailNotificationModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsSchedulerService],
  exports: [LeadsService, LeadsSchedulerService],
})
export class LeadsModule {}