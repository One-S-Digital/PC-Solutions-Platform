import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { StaticTranslationService } from './static-translation.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Static Translations')
@Controller('static-translations')
export class StaticTranslationController {
  constructor(private readonly service: StaticTranslationService) {}

  /**
   * Get current translation version for cache-busting
   */
  @Get('system/version')
  @Public() // Public endpoint - no auth required
  @ApiOperation({ summary: 'Get current translation version' })
  async getVersion(): Promise<{ version: string }> {
    const version = await this.service.getCurrentVersion();
    return { version };
  }

  /**
   * Admin: List all translation keys
   */
  @Get('admin/keys')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all translation keys (admin)' })
  async listKeys(
    @Query('namespace') namespace?: string,
    @Query('lang') lang?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const result = await this.service.listKeys(namespace, lang, search, pageNum, limitNum);
    return {
      success: true,
      version: 1,
      message: 'Translation keys retrieved successfully',
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin: Get single translation
   */
  @Get('admin/:namespace/:key/:lang')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single translation (admin)' })
  async getTranslation(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
  ) {
    return this.service.getTranslation(namespace, key, lang);
  }

  /**
   * Admin: Create or update translation
   */
  @Put('admin/:namespace/:key/:lang')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update translation (admin)' })
  async updateTranslation(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
    @Body('value') value: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.service.upsertTranslation(namespace, key, lang, value, userId);
  }

  /**
   * Admin: Bulk update translations
   */
  @Post('admin/bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update translations (admin)' })
  async bulkUpdate(
    @Body()
    translations: Array<{ namespace: string; key: string; lang: string; value: string }>,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const count = await this.service.bulkUpsert(translations, userId);
    return { updated: count };
  }

  /**
   * Admin: Delete translation
   */
  @Delete('admin/:namespace/:key/:lang')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete translation (admin)' })
  async deleteTranslation(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
  ) {
    await this.service.deleteTranslation(namespace, key, lang);
    return { success: true };
  }

  /**
   * Admin: Mark as reviewed
   */
  @Post('admin/:namespace/:key/:lang/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark translation as reviewed (admin)' })
  async markReviewed(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    await this.service.markReviewed(namespace, key, lang, userId);
    return { success: true };
  }

  /**
   * Admin: Get all namespaces
   */
  @Get('admin/namespaces')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all namespaces (admin)' })
  async getNamespaces(@Query('lang') lang?: string) {
    let data: string[];
    if (lang) {
      data = await this.service.getAllNamespaces(lang);
    } else {
      // Return all unique namespaces
      const result = await this.service.listKeys();
      const namespaces = new Set(result.data.map((r: any) => r.namespace));
      data = Array.from(namespaces) as string[];
    }
    return {
      success: true,
      version: 1,
      message: 'Namespaces retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin: Create new translation release
   */
  @Post('admin/releases')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new translation release' })
  async createRelease(
    @Body() body: { version: string; description?: string },
    @Request() req: any,
  ): Promise<{ success: boolean; version: string }> {
    await this.service.createRelease(body.version, body.description || '', req.user.id);
    return { success: true, version: body.version };
  }

  /**
   * Admin: Translate missing translations using machine translation
   */
  @Post('admin/translate-missing')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate missing translations using machine translation' })
  async translateMissing(
    @Body()
    body: {
      sourceLang: string;
      targetLang: string;
      namespace?: string;
      keys?: string[];
      force?: boolean;
    },
  ): Promise<{ success: boolean; translated: number }> {
    const translated = await this.service.translateMissing(
      body.sourceLang,
      body.targetLang,
      body.namespace,
      body.keys,
      body.force || false,
    );
    return {
      success: true,
      translated,
    };
  }

  /**
   * Admin: Bulk approve translations
   */
  @Post('admin/bulk-approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk approve translations (admin)' })
  async bulkApprove(
    @Body() body: { keys: Array<{ namespace: string; key: string; lang: string }> },
    @Request() req: any,
  ): Promise<{ success: boolean; approved: number }> {
    const userId = req.user?.id;
    await this.service.bulkApprove(body.keys, userId);
    return { success: true, approved: body.keys.length };
  }

  /**
   * Admin: Export translations
   */
  @Get('admin/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export translations (admin)' })
  async exportTranslations(
    @Query('namespace') namespace?: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res({ passthrough: true }) res?: Response,
  ): Promise<any> {
    const translations = await this.service.exportTranslations(namespace);

    if (format === 'csv') {
      // Convert to CSV format
      const headers = ['namespace', 'key', 'lang', 'value'];
      const csvRows = [
        headers.join(','),
        ...translations.map((t) => {
          // Escape commas, quotes, and newlines in CSV
          const escapeCsv = (str: string) => {
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };
          return [escapeCsv(t.namespace), escapeCsv(t.key), escapeCsv(t.lang), escapeCsv(t.value)].join(',');
        }),
      ];
      const csv = csvRows.join('\n');
      
      // Set CSV headers and return directly if response object is provided
      if (res) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="translations${namespace ? `-${namespace}` : ''}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
        return;
      }
      return csv;
    }

    const jsonPayload = {
      success: true,
      version: 1,
      message: 'Translations exported successfully',
      data: translations,
      timestamp: new Date().toISOString(),
    };

    return jsonPayload;
  }

  /**
   * Admin: Import translations
   */
  @Post('admin/import')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import translations (admin)' })
  async importTranslations(
    @Body()
    translations: Array<{ namespace: string; key: string; lang: string; value: string }>,
    @Request() req: any,
  ): Promise<{ success: boolean; imported: number }> {
    const userId = req.user?.id;
    const count = await this.service.importTranslations(translations, userId);
    return { success: true, imported: count };
  }

  /**
   * Admin: Import translations from CSV
   * Body: { csv: string }
   */
  @Post('admin/import-csv')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import translations from CSV (admin)' })
  async importTranslationsCsv(
    @Body() body: { csv: string },
    @Request() req: any,
  ): Promise<{ success: boolean; imported: number }> {
    const userId = req.user?.id;
    const imported = await this.service.importTranslationsCsv(body.csv, userId);
    return { success: true, imported };
  }

  /**
   * Admin: Get audit logs
   */
  @Get('admin/audit-logs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get translation audit logs (admin)' })
  async getAuditLogs(
    @Query('type') type?: 'static' | 'dynamic',
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const logs = await this.service.getAuditLogs(type, limitNum);
    return {
      success: true,
      version: 1,
      message: 'Audit logs retrieved successfully',
      data: logs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin: List all releases
   */
  @Get('admin/releases')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all translation releases (admin)' })
  async listReleases() {
    const releases = await this.service.listReleases();
    return {
      success: true,
      version: 1,
      message: 'Releases retrieved successfully',
      data: releases,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin: Clean up translation prefixes ([FR], [DE], [EN])
   * Removes placeholder prefixes from existing translations
   */
  @Post('admin/cleanup-prefixes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clean up translation prefixes (admin)' })
  async cleanupPrefixes(): Promise<{ success: boolean; cleaned: number; affected: number }> {
    const result = await this.service.cleanupPrefixes();
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Public endpoint: Get translations for a namespace
   * Used by i18next-http-backend for runtime loading
   * Includes ETag and Cache-Control headers for efficient caching
   * NOTE: Must be defined LAST to avoid matching admin/system routes
   */
  @Get(':lang/:namespace')
  @Public() // Public endpoint - no auth required
  @Throttle({ long: { limit: 100, ttl: 60 } }) // Rate limit: 100 requests per minute
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=86400')
  @ApiOperation({ summary: 'Get static translations (public)' })
  @ApiResponse({ status: 200, description: 'Translations retrieved' })
  @ApiResponse({ status: 304, description: 'Not modified (ETag match)' })
  async getTranslations(
    @Param('lang') lang: string,
    @Param('namespace') namespace: string,
    @Res() res: Response,
    @Query('v') version?: string,
    @Headers('if-none-match') ifNoneMatch?: string,
  ): Promise<void> {
    const { data, etag } = await this.service.getByNamespace(lang, namespace);

    // Check if client has cached version
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    // Set ETag header
    res.setHeader('ETag', etag);
    res.json(data);
  }
}

