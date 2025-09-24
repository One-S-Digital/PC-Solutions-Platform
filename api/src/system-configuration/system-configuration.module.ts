import { Module } from '@nestjs/common';
import { SystemConfigurationController } from './system-configuration.controller';
import { SystemConfigurationService } from './system-configuration.service';
import { IntegrationManagementService } from './integration-management.service';
import { MaintenanceModeService } from './maintenance-mode.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [PrismaModule, EmailNotificationModule, AuthModule],
  controllers: [SystemConfigurationController],
  providers: [
    SystemConfigurationService,
    IntegrationManagementService,
    MaintenanceModeService,
  ],
  exports: [
    SystemConfigurationService,
    IntegrationManagementService,
    MaintenanceModeService,
  ],
})
export class SystemConfigurationModule {}