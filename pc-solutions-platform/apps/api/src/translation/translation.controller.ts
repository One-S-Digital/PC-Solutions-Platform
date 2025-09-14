import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TranslationService } from './translation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Translation')
@Controller('translation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TranslationController {
  constructor(private translationService: TranslationService) {}

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get translated entity fields' })
  @ApiResponse({ status: 200, description: 'Translated fields retrieved successfully' })
  @ApiQuery({ name: 'lang', required: false, description: 'Target language (en, fr, de)' })
  @ApiQuery({ name: 'fields', required: false, description: 'Comma-separated list of fields to translate' })
  @ApiQuery({ name: 'includeMeta', required: false, description: 'Include translation metadata' })
  async getTranslatedEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('lang') lang: string = 'en',
    @Query('fields') fields?: string,
    @Query('includeMeta') includeMeta?: boolean,
  ) {
    const fieldList = fields ? fields.split(',') : ['name', 'description', 'bio', 'title', 'about'];
    
    const resolvedFields = await this.translationService.resolveEntity(
      entityType,
      entityId,
      fieldList,
      lang,
    );

    if (includeMeta) {
      // For admin/debug purposes, include metadata
      const metadata = await this.getTranslationMetadata(entityType, entityId, fieldList, lang);
      return {
        id: entityId,
        lang,
        fields: resolvedFields,
        metadata,
      };
    }

    return {
      id: entityId,
      lang,
      fields: resolvedFields,
    };
  }

  @Get('field/:entityType/:entityId/:field')
  @ApiOperation({ summary: 'Get translated field value' })
  @ApiResponse({ status: 200, description: 'Translated field retrieved successfully' })
  @ApiQuery({ name: 'lang', required: false, description: 'Target language (en, fr, de)' })
  async getTranslatedField(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('field') field: string,
    @Query('lang') lang: string = 'en',
  ) {
    const text = await this.translationService.resolveField(
      entityType,
      entityId,
      field,
      lang,
    );

    return {
      id: entityId,
      field,
      lang,
      text,
    };
  }

  @Get('admin/entity/:entityType/:entityId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get entity with translation metadata (Admin only)' })
  @ApiResponse({ status: 200, description: 'Entity with metadata retrieved successfully' })
  @ApiQuery({ name: 'lang', required: false, description: 'Target language (en, fr, de)' })
  @ApiQuery({ name: 'fields', required: false, description: 'Comma-separated list of fields' })
  async getEntityWithMetadata(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('lang') lang: string = 'en',
    @Query('fields') fields?: string,
  ) {
    const fieldList = fields ? fields.split(',') : ['name', 'description', 'bio', 'title', 'about'];
    
    const resolvedFields = await this.translationService.resolveEntity(
      entityType,
      entityId,
      fieldList,
      lang,
    );

    const metadata = await this.getTranslationMetadata(entityType, entityId, fieldList, lang);

    return {
      id: entityId,
      lang,
      fields: resolvedFields,
      metadata,
    };
  }

  private async getTranslationMetadata(
    entityType: string,
    entityId: string,
    fields: string[],
    lang: string,
  ) {
    // This would return detailed metadata about translations
    // For now, return a simplified version
    return {
      sourceLang: 'en', // Would be fetched from entity_sources
      coverage: fields.map(field => ({
        field,
        hasTranslation: true,
        origin: 'machine',
        verified: false,
      })),
    };
  }
}