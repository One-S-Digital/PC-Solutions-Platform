import { Module } from '@nestjs/common';
import { FrontendSettingsController } from './frontend-settings.controller';
import { FrontendSettingsService } from './frontend-settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [FrontendSettingsController],
  providers: [FrontendSettingsService],
  exports: [FrontendSettingsService],
})
export class FrontendSettingsModule {}