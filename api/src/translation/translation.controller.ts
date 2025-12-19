import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TranslationService } from './translation.service';
import { DeepLService } from './deepl.service';
import { ConfigService } from '@nestjs/config';
import { FIELDS_BY_ENTITY, DEFAULT_LANGUAGE } from './translation.config';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Translation')
@Controller('translation')
@UseGuards(RolesGuard)
export class TranslationController {
  constructor(
    private translationService: TranslationService,
    private deepLService: DeepLService,
    private configService: ConfigService,
  ) {}

  private resolveFields(entityType: string, fields?: string): string[] {
    const allowed = FIELDS_BY_ENTITY[entityType] || [];
    const requested = fields ? fields.split(',').map(f => f.trim()).filter(Boolean) : allowed;
    const selected = requested.filter((f) => allowed.includes(f));

    if (selected.length === 0) {
      throw new BadRequestException(`No valid translatable fields for entityType=${entityType}`);
    }
    return selected;
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get translated entity fields' })
  @ApiResponse({ status: 200, description: 'Translated fields retrieved successfully' })
  @ApiQuery({ name: 'lang', required: false, description: 'Target language (en, fr, de)' })
  @ApiQuery({ name: 'fields', required: false, description: 'Comma-separated list of fields to translate' })
  @ApiQuery({ name: 'includeMeta', required: false, description: 'Include translation metadata' })
  async getTranslatedEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('lang') lang: string = DEFAULT_LANGUAGE,
    @Query('fields') fields?: string,
    @Query('includeMeta') includeMeta?: boolean,
  ) {
    const fieldList = this.resolveFields(entityType, fields);
    
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
    @Query('lang') lang: string = DEFAULT_LANGUAGE,
  ) {
    if (!FIELDS_BY_ENTITY[entityType]?.includes(field)) {
      throw new BadRequestException(`Field "${field}" is not translatable for entityType=${entityType}`);
    }

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
    @Query('lang') lang: string = DEFAULT_LANGUAGE,
    @Query('fields') fields?: string,
  ) {
    const fieldList = this.resolveFields(entityType, fields);
    
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

  @Get('diagnostics/deepl')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check DeepL service status and configuration (Admin only)' })
  @ApiResponse({ status: 200, description: 'DeepL diagnostics retrieved successfully' })
  async getDeepLDiagnostics() {
    const apiKey = this.configService.get<string>('DEEPL_API_KEY');
    const hasApiKey = !!apiKey;
    const isAvailable = this.deepLService.isAvailable();
    
    let testResult = null;
    if (isAvailable) {
      try {
        // Test translation
        const testTranslation = await this.deepLService.translate('Hello', 'en', 'fr');
        testResult = {
          success: true,
          testText: 'Hello',
          translatedText: testTranslation,
          sourceLang: 'en',
          targetLang: 'fr',
        };
      } catch (error) {
        testResult = {
          success: false,
          error: error.message,
        };
      }
    }

    return {
      configured: hasApiKey,
      apiKeyPresent: hasApiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      available: isAvailable,
      testResult,
      timestamp: new Date().toISOString(),
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