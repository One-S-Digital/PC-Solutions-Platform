import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FrontendSettingsService } from './frontend-settings.service';
import { UpdateFrontendSettingsDto } from './dto/update-frontend-settings.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/frontend-settings')
// Note: ClerkAuthGuard is applied globally, so @Public() on individual routes will work
// RolesGuard only checks roles when ClerkAuthGuard passes (or route is @Public())
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class FrontendSettingsController {
  constructor(private readonly frontendSettingsService: FrontendSettingsService) {}

  @Get('public')
  @Public()
  getPublicSettings() {
    return this.frontendSettingsService.getPublicSettings().then((data) => ({
      success: true,
      message: 'Public frontend settings fetched',
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  @Get()
  @Public() // Allow unauthenticated access to read settings (needed for login page branding)
  getSettings() {
    return this.frontendSettingsService.getSettings().then((data) => ({
      success: true,
      message: 'Frontend settings fetched',
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  @Put()
  updateSettings(@Body() updateData: UpdateFrontendSettingsDto) {
    return this.frontendSettingsService.updateSettings(updateData).then((data) => ({
      success: true,
      message: 'Frontend settings updated',
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Development mode bypass
      const isDevelopment = process.env.NODE_ENV !== 'production';
      let appUserId = req.context?.appUserId;
      
      if (!appUserId && isDevelopment) {
        // Create a mock user ID for development
        appUserId = 'dev-user-123';
        console.log('🔧 Development mode: Using mock user ID for logo upload');
      } else if (!appUserId) {
        throw new BadRequestException('Missing authenticated user');
      }
      
      const result = await this.frontendSettingsService.uploadLogo(file, appUserId);
      
      return {
        success: true,
        message: 'Logo uploaded',
        data: {
          id: result.asset.id,
          url: result.publicUrl,
          filename: result.asset.filename,
          size: result.asset.size,
          mimeType: result.asset.mimeType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Logo upload error:', error);
      throw error;
    }
  }

  @Post('favicon')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFavicon(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Development mode bypass
      const isDevelopment = process.env.NODE_ENV !== 'production';
      let appUserId = req.context?.appUserId;
      
      if (!appUserId && isDevelopment) {
        appUserId = 'dev-user-123';
        console.log('🔧 Development mode: Using mock user ID for favicon upload');
      } else if (!appUserId) {
        throw new BadRequestException('Missing authenticated user');
      }
      
      const result = await this.frontendSettingsService.uploadFavicon(file, appUserId);
      
      return {
        success: true,
        message: 'Favicon uploaded',
        data: {
          id: result.asset.id,
          url: result.publicUrl,
          filename: result.asset.filename,
          size: result.asset.size,
          mimeType: result.asset.mimeType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Favicon upload error:', error);
      throw error;
    }
  }

  @Post('og-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadOgImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Development mode bypass
      const isDevelopment = process.env.NODE_ENV !== 'production';
      let appUserId = req.context?.appUserId;
      
      if (!appUserId && isDevelopment) {
        appUserId = 'dev-user-123';
        console.log('🔧 Development mode: Using mock user ID for OG image upload');
      } else if (!appUserId) {
        throw new BadRequestException('Missing authenticated user');
      }
      
      const result = await this.frontendSettingsService.uploadOgImage(file, appUserId);
      
      return {
        success: true,
        message: 'OpenGraph image uploaded',
        data: {
          id: result.asset.id,
          url: result.publicUrl,
          filename: result.asset.filename,
          size: result.asset.size,
          mimeType: result.asset.mimeType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('OG image upload error:', error);
      throw error;
    }
  }

  @Post('admin-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAdminLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Development mode bypass
      const isDevelopment = process.env.NODE_ENV !== 'production';
      let appUserId = req.context?.appUserId;
      
      if (!appUserId && isDevelopment) {
        appUserId = 'dev-user-123';
        console.log('🔧 Development mode: Using mock user ID for admin logo upload');
      } else if (!appUserId) {
        throw new BadRequestException('Missing authenticated user');
      }
      
      const result = await this.frontendSettingsService.uploadAdminLogo(file, appUserId);
      
      return {
        success: true,
        message: 'Admin logo uploaded',
        data: {
          id: result.asset.id,
          url: result.publicUrl,
          filename: result.asset.filename,
          size: result.asset.size,
          mimeType: result.asset.mimeType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Admin logo upload error:', error);
      throw error;
    }
  }

  @Post('admin-favicon')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAdminFavicon(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Development mode bypass
      const isDevelopment = process.env.NODE_ENV !== 'production';
      let appUserId = req.context?.appUserId;
      
      if (!appUserId && isDevelopment) {
        appUserId = 'dev-user-123';
        console.log('🔧 Development mode: Using mock user ID for admin favicon upload');
      } else if (!appUserId) {
        throw new BadRequestException('Missing authenticated user');
      }
      
      const result = await this.frontendSettingsService.uploadAdminFavicon(file, appUserId);
      
      return {
        success: true,
        message: 'Admin favicon uploaded',
        data: {
          id: result.asset.id,
          url: result.publicUrl,
          filename: result.asset.filename,
          size: result.asset.size,
          mimeType: result.asset.mimeType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Admin favicon upload error:', error);
      throw error;
    }
  }

  @Post('sidebar-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSidebarLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Development mode bypass
      const isDevelopment = process.env.NODE_ENV !== 'production';
      let appUserId = req.context?.appUserId;
      
      if (!appUserId && isDevelopment) {
        appUserId = 'dev-user-123';
        console.log('🔧 Development mode: Using mock user ID for sidebar logo upload');
      } else if (!appUserId) {
        throw new BadRequestException('Missing authenticated user');
      }
      
      const result = await this.frontendSettingsService.uploadSidebarLogo(file, appUserId);
      
      return {
        success: true,
        message: 'Sidebar logo uploaded',
        data: {
          id: result.asset.id,
          url: result.publicUrl,
          filename: result.asset.filename,
          size: result.asset.size,
          mimeType: result.asset.mimeType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Sidebar logo upload error:', error);
      throw error;
    }
  }
}