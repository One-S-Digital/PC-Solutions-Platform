import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Request,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  UploadElearningDto,
  UpdateElearningDto,
  GetElearningQueryDto,
} from './dto/elearning.dto';
import {
  UploadHrDocumentDto,
  UpdateHrDocumentDto,
  GetHrDocumentsQueryDto,
} from './dto/hr-document.dto';
import {
  UploadStatePolicyDto,
  UpdateStatePolicyDto,
  GetStatePoliciesQueryDto,
} from './dto/state-policy.dto';

@Controller('content')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * ========================================
   * E-LEARNING CONTENT ENDPOINTS
   * ========================================
   */

  @Get('elearning')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR, UserRole.FOUNDATION)
  async getElearningContent(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetElearningQueryDto,
  ) {
    return this.contentService.getElearningContent(query);
  }

  @Post('elearning')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    exceptionFactory: (errors) => {
      console.error('🔴 E-Learning Upload Validation Errors:', JSON.stringify(errors, null, 2));
      return new BadRequestException(errors.map(e => ({
        field: e.property,
        constraints: e.constraints,
        value: e.value
      })));
    }
  }))
  async uploadElearning(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadElearningDto,
    @Request() req,
  ) {
    console.log('📥 E-Learning Upload Request:', {
      file: file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : null,
      body: req.body,
      dto: dto,
    });
    
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.uploadElearning(file, dto, req.context.appUserId);
  }

  @Patch('elearning/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateElearning(
    @Param('id') id: string,
    @Body() dto: UpdateElearningDto,
    @Request() req,
  ) {
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.updateElearning(id, dto, req.context.appUserId);
  }

  @Delete('elearning/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteElearning(@Param('id') id: string, @Request() req) {
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.deleteElearning(id, req.context.appUserId);
  }

  /**
   * ========================================
   * HR DOCUMENTS ENDPOINTS
   * ========================================
   */

  @Get('hr-documents')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHrDocuments(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetHrDocumentsQueryDto,
  ) {
    return this.contentService.getHrDocuments(query);
  }

  @Post('hr-documents/upload')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => {
      const detailedErrors = errors.map(e => ({
        field: e.property,
        value: e.value,
        constraints: e.constraints,
        children: e.children
      }));
      console.error('🔴🔴🔴 HR DOCUMENT VALIDATION FAILED 🔴🔴🔴');
      console.error(JSON.stringify(detailedErrors, null, 2));
      return new BadRequestException({
        message: 'Validation failed',
        errors: detailedErrors
      });
    }
  }))
  async uploadHrDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadHrDocumentDto,
    @Request() req,
  ) {
    console.log('📥 HR Document Upload Request (AFTER VALIDATION):', {
      file: file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : null,
      dto: dto,
      dtoTagsType: typeof dto.tags,
      dtoTags: dto.tags,
    });
    
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.uploadHrDocument(file, dto, req.context.appUserId);
  }

  @Patch('hr-documents/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateHrDocument(
    @Param('id') id: string,
    @Body() dto: UpdateHrDocumentDto,
    @Request() req,
  ) {
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.updateHrDocument(id, dto, req.context.appUserId);
  }

  @Delete('hr-documents/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteHrDocument(@Param('id') id: string, @Request() req) {
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.deleteHrDocument(id, req.context.appUserId);
  }

  /**
   * ========================================
   * STATE POLICIES ENDPOINTS
   * ========================================
   */

  @Get('state-policies')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStatePolicies(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetStatePoliciesQueryDto,
  ) {
    return this.contentService.getStatePolicies(query);
  }

  @Post('state-policies/upload')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    exceptionFactory: (errors) => {
      console.error('🔴 State Policy Upload Validation Errors:', JSON.stringify(errors, null, 2));
      return new BadRequestException(errors.map(e => ({
        field: e.property,
        constraints: e.constraints,
        value: e.value
      })));
    }
  }))
  async uploadStatePolicy(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadStatePolicyDto,
    @Request() req,
  ) {
    console.log('📥 State Policy Upload Request:', {
      file: file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : null,
      body: req.body,
      dto: dto,
    });
    
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.uploadStatePolicy(file, dto, req.context.appUserId);
  }

  @Patch('state-policies/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateStatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdateStatePolicyDto,
    @Request() req,
  ) {
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.updateStatePolicy(id, dto, req.context.appUserId);
  }

  @Delete('state-policies/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteStatePolicy(@Param('id') id: string, @Request() req) {
    if (!req.context?.appUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.contentService.deleteStatePolicy(id, req.context.appUserId);
  }
}

