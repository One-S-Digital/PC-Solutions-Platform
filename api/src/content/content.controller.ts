import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('content')
@UseGuards(RolesGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // E-learning Content Upload
  @Post('elearning/upload')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadElearningContent(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      if (!req.context?.appUserId) {
        throw new Error('User not authenticated');
      }

      const result = await this.contentService.uploadElearningContent(
        file,
        body,
        req.context.appUserId,
      );
      
      return {
        success: true,
        message: 'E-learning content uploaded successfully',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('E-learning upload error:', error);
      throw error;
    }
  }

  // HR Documents Upload
  @Post('hr-documents/upload')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadHrDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      if (!req.context?.appUserId) {
        throw new Error('User not authenticated');
      }

      const result = await this.contentService.uploadHrDocument(
        file,
        body,
        req.context.appUserId,
      );
      
      return {
        success: true,
        message: 'HR document uploaded successfully',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('HR document upload error:', error);
      throw error;
    }
  }

  // State Policies Upload
  @Post('state-policies/upload')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadStatePolicy(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      if (!req.context?.appUserId) {
        throw new Error('User not authenticated');
      }

      const result = await this.contentService.uploadStatePolicy(
        file,
        body,
        req.context.appUserId,
      );
      
      return {
        success: true,
        message: 'State policy uploaded successfully',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('State policy upload error:', error);
      throw error;
    }
  }

  // Get all content types
  @Get('elearning')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  async getElearningContent() {
    return this.contentService.getElearningContent();
  }

  @Get('hr-documents')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHrDocuments() {
    return this.contentService.getHrDocuments();
  }

  @Get('state-policies')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStatePolicies() {
    return this.contentService.getStatePolicies();
  }
}