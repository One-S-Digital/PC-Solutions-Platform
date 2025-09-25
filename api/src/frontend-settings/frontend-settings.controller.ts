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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FrontendSettingsService } from './frontend-settings.service';
import { UpdateFrontendSettingsDto } from './dto/update-frontend-settings.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/frontend-settings')
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
  uploadLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadLogo(file, req.context.userId).then((result) => ({
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
    }));
  }

  @Post('favicon')
  @UseInterceptors(FileInterceptor('file'))
  uploadFavicon(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadFavicon(file, req.context.userId).then((result) => ({
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
    }));
  }

  @Post('og-image')
  @UseInterceptors(FileInterceptor('file'))
  uploadOgImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadOgImage(file, req.context.userId).then((result) => ({
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
    }));
  }

  @Post('admin-logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadAdminLogo(file, req.context.userId).then((result) => ({
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
    }));
  }

  @Post('admin-favicon')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminFavicon(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadAdminFavicon(file, req.context.userId).then((result) => ({
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
    }));
  }
}