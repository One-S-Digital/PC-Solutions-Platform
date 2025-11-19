import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [PrismaModule, AuthModule, TranslationModule],
  controllers: [SettingsController],
})
export class SettingsModule {}