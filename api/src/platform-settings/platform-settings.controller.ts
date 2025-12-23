import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Request,
} from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { CreatePlatformSettingsDto, UpdatePlatformSettingsDto } from './dto/platform-settings.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('platform-settings')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class PlatformSettingsController {
  constructor(private readonly platformSettingsService: PlatformSettingsService) {}

  @Get()
  async getPlatformSettings() {
    try {
      const settings = await this.platformSettingsService.getPlatformSettings();
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch platform settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async createPlatformSettings(@Body() createDto: CreatePlatformSettingsDto) {
    try {
      const settings = await this.platformSettingsService.createPlatformSettings(createDto);
      return {
        success: true,
        data: settings,
        message: 'Platform settings created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create platform settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async updatePlatformSettings(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlatformSettingsDto,
  ) {
    try {
      const settings = await this.platformSettingsService.updatePlatformSettings(id, updateDto);
      return {
        success: true,
        data: settings,
        message: 'Platform settings updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update platform settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async deletePlatformSettings(@Param('id') id: string) {
    try {
      await this.platformSettingsService.deletePlatformSettings(id);
      return {
        success: true,
        message: 'Platform settings deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete platform settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('maintenance-mode')
  async getMaintenanceMode() {
    try {
      const maintenanceMode = await this.platformSettingsService.getMaintenanceMode();
      return {
        success: true,
        data: maintenanceMode,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch maintenance mode status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('maintenance-mode')
  @Roles(UserRole.SUPER_ADMIN)
  async toggleMaintenanceMode(
    @Request() req: any,
    @Body() body: { enabled: boolean; message?: string },
  ) {
    try {
      // AuditLog.actorId references the `User` table, so prefer the profile user ID if available.
      const profileUserId: string | undefined = req?.context?.profileUserId || req?.user?.id || undefined;
      const clerkUserId: string | undefined = req?.context?.clerkUserId || req?.context?.userId || req?.clerk?.userId || undefined;
      const result = await this.platformSettingsService.toggleMaintenanceMode(
        body.enabled,
        body.message,
        { profileUserId, clerkUserId },
      );
      return {
        success: true,
        data: result,
        message: `Maintenance mode ${body.enabled ? 'enabled' : 'disabled'} successfully`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to toggle maintenance mode',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}