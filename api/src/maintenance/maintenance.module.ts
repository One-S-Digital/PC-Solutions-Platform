import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [PlatformSettingsModule],
  controllers: [MaintenanceController],
})
export class MaintenanceModule {}

