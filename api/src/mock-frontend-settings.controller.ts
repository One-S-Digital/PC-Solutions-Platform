import { Controller, Get, Put, Post, Body, UseInterceptors, UploadedFile, Request, Param, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MockFrontendSettingsService } from './mock-frontend-settings.service';

@Controller('mock/admin/frontend-settings')
export class MockFrontendSettingsController {
  constructor(private readonly frontendSettingsService: MockFrontendSettingsService) {}

  @Get('public')
  async getPublicSettings() {
    return await this.frontendSettingsService.getPublicSettings();
  }

  @Get()
  async getSettings() {
    return await this.frontendSettingsService.getSettings();
  }

  @Put()
  async updateSettings(@Body() updates: any) {
    return await this.frontendSettingsService.updateSettings(updates);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      const userId = req.context?.appUserId || req.context?.userId || 'mock-user-id';
      const result = await this.frontendSettingsService.uploadLogo(file, userId);
      
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
      
      const userId = req.context?.appUserId || req.context?.userId || 'mock-user-id';
      const result = await this.frontendSettingsService.uploadFavicon(file, userId);
      
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
      
      const userId = req.context?.appUserId || req.context?.userId || 'mock-user-id';
      const result = await this.frontendSettingsService.uploadOgImage(file, userId);
      
      return {
        success: true,
        message: 'OG image uploaded',
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
      
      const userId = req.context?.appUserId || req.context?.userId || 'mock-user-id';
      const result = await this.frontendSettingsService.uploadAdminLogo(file, userId);
      
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
      
      const userId = req.context?.appUserId || req.context?.userId || 'mock-user-id';
      const result = await this.frontendSettingsService.uploadAdminFavicon(file, userId);
      
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

  @Get('assets/:id')
  async getAsset(@Param('id') id: string) {
    return await this.frontendSettingsService.getAssetById(id);
  }

  @Get('assets/kind/:kind')
  async getAssetsByKind(@Param('kind') kind: string) {
    return await this.frontendSettingsService.getAssetsByKind(kind);
  }

  @Delete('assets/:id')
  async deleteAsset(@Param('id') id: string) {
    const success = await this.frontendSettingsService.deleteAsset(id);
    return { success, message: success ? 'Asset deleted' : 'Asset not found' };
  }
}