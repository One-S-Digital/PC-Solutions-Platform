import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PrincipalModule } from '../principal/principal.module';
import { TranslationModule } from '../translation/translation.module';
import { UploadModule } from '../upload/upload.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [PrismaModule, AuthModule, PrincipalModule, TranslationModule, UploadModule, EmailNotificationModule],
  controllers: [SettingsController],
})
export class SettingsModule {}