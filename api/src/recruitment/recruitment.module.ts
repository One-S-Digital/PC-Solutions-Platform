import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { TranslationModule } from '../translation/translation.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [PrismaModule, AuthModule, TranslationModule, EmailNotificationModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}