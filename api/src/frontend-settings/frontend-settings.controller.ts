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
    return this.frontendSettingsService.uploadLogo(file, req.context.userId);
  }

  @Post('favicon')
  @UseInterceptors(FileInterceptor('file'))
  uploadFavicon(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadFavicon(file, req.context.userId);
  }

  @Post('og-image')
  @UseInterceptors(FileInterceptor('file'))
  uploadOgImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadOgImage(file, req.context.userId);
  }

  @Post('admin-logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadAdminLogo(file, req.context.userId);
  }

  @Post('admin-favicon')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminFavicon(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.frontendSettingsService.uploadAdminFavicon(file, req.context.userId);
  }
}