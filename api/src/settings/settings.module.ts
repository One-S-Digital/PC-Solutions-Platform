import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PrincipalModule } from '../principal/principal.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [PrismaModule, AuthModule, PrincipalModule, TranslationModule],
  controllers: [SettingsController],
})
export class SettingsModule {}