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
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { StaticTranslationService } from './static-translation.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Static Translations')
@Controller('static-translations')
@SkipThrottle() // Skip rate limiting for all translation endpoints - they're needed for page load
export class StaticTranslationController {
  constructor(private readonly service: StaticTranslationService) {}

  /**
   * Get current translation version for cache-busting
   * This endpoint is called frequently for cache validation, so skip rate limiting
   */
  @Get('system/version')
  @Public() // Public endpoint - no auth required
  @SkipThrottle() // Explicitly skip throttling for this endpoint
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
    const data = await this.service.getAllNamespacesAcrossAllLangs();
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
      includePlaceholders?: boolean;
    },
  ): Promise<{ success: boolean; translated: number }> {
    const translated = await this.service.translateMissing(
      body.sourceLang,
      body.targetLang,
      body.namespace,
      body.keys,
      body.force || false,
      body.includePlaceholders ?? true,
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
   * Admin: Import translations from JSON files in packages/translations/locales
   * This reads the JSON files from the server's file system and imports them into the database
   */
  @Post('admin/import-from-files')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import translations from JSON files (admin)' })
  async importFromFiles(
    @Request() req: any,
  ): Promise<{ success: boolean; imported: number; details: any }> {
    const userId = req.user?.id;
    const result = await this.service.importFromJsonFiles(userId);
    return {
      success: true,
      imported: result.imported,
      details: result.details,
    };
  }

  /**
   * Admin: Export translations from database to JSON files
   * This writes translations from the database back to packages/translations/locales
   */
  @Post('admin/export-to-files')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export translations from database to JSON files (admin)' })
  async exportToFiles(): Promise<{ success: boolean; exported: number; details: any }> {
    const result = await this.service.exportToJsonFiles();
    return {
      success: true,
      exported: result.exported,
      details: result.details,
    };
  }

  /**
   * Admin: Full sync - Import, Translate, and Export in one step
   * This is the simplified workflow that does everything at once
   * 
   * NOTE: This is a long-running operation (5-10 mins). The frontend should
   * handle timeouts gracefully - the sync will continue on the server even
   * if the HTTP connection times out.
   */
  @Post('admin/full-sync')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SkipThrottle({ default: false }) // Re-enable throttling for this endpoint
  @Throttle({ default: { limit: 1, ttl: 300000 } }) // Only allow 1 request per 5 minutes
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Full sync: Import EN, Translate FR/DE, Export to files (admin)' })
  async fullSync(
    @Request() req: any,
  ): Promise<{
    success: boolean;
    imported: number;
    translatedFr: number;
    translatedDe: number;
    exported: number;
    message: string;
  }> {
    console.log('[FullSync] Admin full-sync endpoint called', {
      method: req.method,
      url: req.url,
      path: req.path,
      userId: req.user?.id,
    });
    const userId = req.user?.id;
    const result = await this.service.fullSync(userId);
    return {
      success: true,
      ...result,
      message: `Imported ${result.imported} EN keys, translated ${result.translatedFr} FR + ${result.translatedDe} DE, exported ${result.exported} to files`,
    };
  }

  /**
   * Admin: Get translation budget status
   */
  @Get('admin/budget-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MT budget status (admin)' })
  async getBudgetStatus() {
    const status = await this.service.getBudgetStatus();
    return {
      success: true,
      version: 1,
      message: 'Budget status retrieved successfully',
      data: status,
      timestamp: new Date().toISOString(),
    };
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
   * Admin: Clean up English values that look like raw keys
   * Example: "supportPage.ticketForm.subjectLabel" -> "Subject"
   */
  @Post('admin/fix-english-placeholders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clean up English key-like placeholders (admin)' })
  async fixEnglishPlaceholders(): Promise<{
    success: boolean;
    cleaned: number;
    affected: number;
  }> {
    const result = await this.service.cleanupEnglishKeyPlaceholders();
    return {
      success: true,
      cleaned: result.cleaned,
      affected: result.affected,
    };
  }

  /**
   * Admin: Auto-fix hardcoded strings
   * Automatically finds and fixes hardcoded strings in frontend code
   */
  @Post('admin/auto-fix-hardcoded-strings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Auto-fix hardcoded strings in frontend code (admin)' })
  async autoFixHardcodedStrings(
    @Request() req: any,
  ): Promise<{
    success: boolean;
    fixed: number;
    skipped: number;
    errors: number;
    /** Number of completely new translation keys created by the script */
    missingKeysCreated?: number;
    /** Detailed info about what was fixed/created so the frontend can drive follow‑up actions */
    details?: any;
    message: string;
  }> {
    // TODO: Add audit logging with userId for tracking who initiated the auto-fix
    // const userId = req.user?.id;
    const result = await this.service.autoFixHardcodedStrings();
    return {
      success: result.success,
      fixed: result.fixed,
      skipped: result.skipped,
      errors: result.errors,
      // Pass through new metadata so the frontend can know what changed,
      // even after a dev-server reload.
      missingKeysCreated: result.missingKeysCreated ?? 0,
      details: result.details ?? undefined,
      message: result.message,
    };
  }

  /**
   * Public endpoint: Get translations for a namespace
   * Used by i18next-http-backend for runtime loading
   * Includes ETag and Cache-Control headers for efficient caching
   * NOTE: Must be defined LAST to avoid matching admin/system routes
   * Regex constraint ensures only valid languages can match (prevents "admin" from matching)
   */
  @Get(':lang(en|fr|de)/:namespace')
  @Public() // Public endpoint - no auth required
  @SkipThrottle() // Explicitly skip throttling for this endpoint
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=86400')
  @ApiOperation({ summary: 'Get static translations (public)' })
  @ApiResponse({ status: 200, description: 'Translations retrieved' })
  @ApiResponse({ status: 304, description: 'Not modified (ETag match)' })
  @ApiResponse({ status: 400, description: 'Invalid language or namespace' })
  async getTranslations(
    @Param('lang') lang: string,
    @Param('namespace') namespace: string,
    @Res() res: Response,
    @Request() req: any,
    @Query('v') version?: string,
    @Headers('if-none-match') ifNoneMatch?: string,
  ): Promise<void> {
    // Debug logging to help diagnose issues
    console.log(`[Translation] Request received: lang="${lang}", namespace="${namespace}"`);
    
    // Input validation - prevent injection and invalid requests
    // Note: The regex constraint in the route already ensures lang is en|fr|de, but we validate again for safety
    const supportedLangs = ['en', 'fr', 'de'];
    if (!supportedLangs.includes(lang)) {
      console.warn(`[Translation] Invalid language: "${lang}"`);
      res.status(400).json({ 
        error: 'Invalid language', 
        message: `Language must be one of: ${supportedLangs.join(', ')}`,
        received: lang 
      });
      return;
    }
    
    // Validate namespace format - alphanumeric, underscore, hyphen, camelCase allowed
    // Allow camelCase (e.g., parentLeadForm) and standard formats
    const namespaceRegex = /^[a-zA-Z0-9_-]+$/;
    const namespaceTest = namespaceRegex.test(namespace);
    
    if (!namespaceTest) {
      // Log for debugging
      console.warn(`[Translation] Invalid namespace format: "${namespace}" (length: ${namespace.length}, test: ${namespaceTest})`);
      res.status(400).json({ 
        error: 'Invalid namespace', 
        message: 'Namespace must contain only letters, numbers, underscores, and hyphens',
        received: namespace,
        regexTest: namespaceTest,
        regexPattern: '/^[a-zA-Z0-9_-]+$/'
      });
      return;
    }
    
    console.log(`[Translation] Validation passed for: ${lang}/${namespace}`);
    
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

