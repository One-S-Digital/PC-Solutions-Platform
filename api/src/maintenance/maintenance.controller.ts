import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly platformSettingsService: PlatformSettingsService) {}

  /**
   * Public endpoint for clients to check maintenance status.
   * This remains available even when maintenance mode is enabled.
   */
  @Get()
  @Public()
  async getMaintenanceStatus() {
    const status = await this.platformSettingsService.getMaintenanceMode();
    return {
      success: true,
      data: {
        enabled: status.enabled,
        message: status.message,
      },
    };
  }
}

