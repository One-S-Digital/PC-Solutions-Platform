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
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@repo/types';
import { Public } from '../auth/public.decorator';

@Controller('admin/frontend-settings')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class FrontendSettingsController {
  constructor(private readonly frontendSettingsService: FrontendSettingsService) {}

  @Get('public')
  @Public()
  getPublicSettings() {
    return this.frontendSettingsService.getPublicSettings();
  }

  @Get()
  getSettings() {
    return this.frontendSettingsService.getSettings();
  }

  @Put()
  updateSettings(@Body() updateData: UpdateFrontendSettingsDto) {
    return this.frontendSettingsService.updateSettings(updateData);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadLogo(file, req.user.id);
  }

  @Post('favicon')
  @UseInterceptors(FileInterceptor('file'))
  uploadFavicon(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadFavicon(file, req.user.id);
  }

  @Post('og-image')
  @UseInterceptors(FileInterceptor('file'))
  uploadOgImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadOgImage(file, req.user.id);
  }

  @Post('admin-logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadAdminLogo(file, req.user.id);
  }
}