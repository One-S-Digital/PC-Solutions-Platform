import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { DeepLService } from '../translation/deepl.service';
import { TranslationMemoryService } from '../translation/translation-memory.service';
import { CostTrackingService } from '../translation/cost-tracking.service';

export interface StaticTranslationDto {
  namespace: string;
  key: string;
  lang: string;
  value: string;
}

@Injectable()
export class StaticTranslationService {
  private readonly logger = new Logger(StaticTranslationService.name);
  private readonly CACHE_TTL = 15 * 60; // 15 minutes

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private deepLService: DeepLService,
    private translationMemory: TranslationMemoryService,
    private costTracking: CostTrackingService,
  ) {}

  /**
   * Get all translations for a namespace and language
   * Used by frontend for runtime loading
   * Returns data and ETag for cache validation
   */
  async getByNamespace(
    lang: string,
    namespace: string,
  ): Promise<{ data: Record<string, any>; etag: string }> {
    const cacheKey = `static:${lang}:${namespace}`;

    // Try cache first
    const cached = await this.cacheManager.get<{ data: Record<string, any>; etag: string }>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    // Fetch from database
    const translations = await this.prisma.staticTranslation.findMany({
      where: {
        lang,
        namespace,
      },
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform flat keys to nested object structure
    const result = this.nestKeys(translations);

    // Generate ETag from content hash
    const latestUpdate = translations[0]?.updatedAt || new Date();
    const etag = this.generateETag(result, latestUpdate);

    const response = { data: result, etag };

    // Cache result with ETag
    await this.cacheManager.set(cacheKey, response, this.CACHE_TTL * 1000);

    return response;
  }

  /**
   * Generate ETag from translation data
   */
  private generateETag(data: Record<string, any>, updatedAt: Date): string {
    const content = JSON.stringify(data);
    const hash = crypto.createHash('md5').update(content).digest('hex');
    const timestamp = updatedAt.getTime();
    return `"${hash}-${timestamp}"`;
  }

  /**
   * Get all namespaces for a language
   */
  async getAllNamespaces(lang: string): Promise<string[]> {
    const result = await this.prisma.staticTranslation.findMany({
      where: { lang },
      select: { namespace: true },
      distinct: ['namespace'],
    });
    return result.map((r) => r.namespace);
  }

  /**
   * List all translation keys (for admin UI)
   * Supports pagination, filtering by namespace/lang, and search
   */
  async listKeys(
    namespace?: string,
    lang?: string,
    search?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: any = {};

    if (namespace) where.namespace = namespace;
    if (lang) where.lang = lang;

    // Build where clause for groupBy (avoid OR conditions which cause circular reference issues)
    const groupByWhere: any = {};
    if (namespace) {
      groupByWhere.namespace = namespace;
    }
    // Note: groupBy doesn't support OR conditions well, so we'll filter search results after
    // if search is provided, we'll apply it after getting the keys

    // Get all unique keys matching namespace filter
    const allKeys = await this.prisma.staticTranslation.groupBy({
      by: ['namespace', 'key'],
      where: groupByWhere,
    });

    // Apply search filter manually if provided (since groupBy doesn't support OR well)
    let filteredKeys = allKeys;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredKeys = allKeys.filter(
        (k) =>
          k.key.toLowerCase().includes(searchLower) ||
          k.namespace.toLowerCase().includes(searchLower),
      );
      
      // Also check value matches by fetching translations with matching values
      const valueMatchesRaw = await this.prisma.staticTranslation.findMany({
        where: {
          value: { contains: search, mode: 'insensitive' },
          ...(namespace && { namespace }),
        },
        select: { namespace: true, key: true },
      });
      
      // Deduplicate value matches manually
      const valueMatchesMap = new Map<string, { namespace: string; key: string }>();
      for (const match of valueMatchesRaw) {
        const matchKey = `${match.namespace}:${match.key}`;
        if (!valueMatchesMap.has(matchKey)) {
          valueMatchesMap.set(matchKey, match);
        }
      }
      const valueMatches = Array.from(valueMatchesMap.values());
      
      // Merge with existing filtered keys
      const existingSet = new Set(filteredKeys.map((k) => `${k.namespace}:${k.key}`));
      
      // Add value matches that aren't already in filteredKeys
      for (const match of valueMatches) {
        const matchKey = `${match.namespace}:${match.key}`;
        if (!existingSet.has(matchKey)) {
          filteredKeys.push(match);
        }
      }
    }

    // Sort and paginate
    const sortedKeys = filteredKeys.sort((a, b) => {
      if (a.namespace !== b.namespace) {
        return a.namespace.localeCompare(b.namespace);
      }
      return a.key.localeCompare(b.key);
    });

    const totalKeys = sortedKeys.length;
    const skip = (page - 1) * limit;
    const pageKeys = sortedKeys.slice(skip, skip + limit);

    // If no keys in this page, return empty
    if (pageKeys.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: totalKeys,
          totalPages: Math.ceil(totalKeys / limit),
          hasMore: skip + limit < totalKeys,
        },
      };
    }

    // Build where clause to fetch translations for this page's keys
    // We need to combine: (namespace AND key) OR (namespace AND key) for each key
    // And also apply lang filter if provided
    const keyOrConditions = pageKeys.map((k) => ({
      namespace: k.namespace,
      key: k.key,
    }));

    const keyWhere = {
      OR: keyOrConditions,
      ...(lang && { lang }),
    };

    // Get all translations for these keys
    const translations = await this.prisma.staticTranslation.findMany({
      where: keyWhere,
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }, { lang: 'asc' }],
    });

    // Group by namespace and key
    const grouped = translations.reduce(
      (acc, t) => {
        const groupKey = `${t.namespace}:${t.key}`;
        if (!acc[groupKey]) {
          acc[groupKey] = {
            namespace: t.namespace,
            key: t.key,
            translations: {},
          };
        }
        acc[groupKey].translations[t.lang] = {
          value: t.value,
          updatedAt: t.updatedAt,
          updatedBy: t.updatedBy,
          needsReview: t.needsReview,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    // Return in the same order as pageKeys
    const data = pageKeys.map((k) => grouped[`${k.namespace}:${k.key}`]).filter(Boolean);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalKeys,
        totalPages: Math.ceil(totalKeys / limit),
        hasMore: skip + limit < totalKeys,
      },
    };
  }

  /**
   * Get single translation
   */
  async getTranslation(
    namespace: string,
    key: string,
    lang: string,
  ): Promise<StaticTranslationDto | null> {
    return this.prisma.staticTranslation.findUnique({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
    });
  }

  /**
   * Create or update translation
   */
  async upsertTranslation(
    namespace: string,
    key: string,
    lang: string,
    value: string,
    updatedBy?: string,
  ): Promise<StaticTranslationDto> {
    // Get old value for audit log
    const oldTranslation = await this.prisma.staticTranslation.findUnique({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
    });

    const translation = await this.prisma.staticTranslation.upsert({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
      update: {
        value,
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        namespace,
        key,
        lang,
        value,
        updatedBy,
      },
    });

    // Log audit trail
    await this.logAudit({
      type: 'static',
      namespace,
      key,
      lang,
      action: oldTranslation ? 'update' : 'create',
      oldValue: oldTranslation?.value,
      newValue: value,
      userId: updatedBy || 'system',
    });

    // Invalidate cache
    await this.invalidateCache(lang, namespace);

    this.logger.log(`Updated static translation: ${namespace}:${key} (${lang})`);
    return translation;
  }

  /**
   * Log translation changes to audit log
   */
  private async logAudit(log: {
    type: 'static' | 'dynamic';
    namespace?: string;
    entityType?: string;
    entityId?: string;
    key?: string;
    field?: string;
    lang: string;
    action: string;
    oldValue?: string;
    newValue?: string;
    userId: string;
  }): Promise<void> {
    try {
      await this.prisma.translationAuditLog.create({
        data: log,
      });
    } catch (error) {
      this.logger.error('Failed to log audit trail', error);
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }

  /**
   * Bulk upsert translations
   */
  async bulkUpsert(
    translations: Array<{ namespace: string; key: string; lang: string; value: string }>,
    updatedBy?: string,
  ): Promise<number> {
    const operations = translations.map((t) =>
      this.prisma.staticTranslation.upsert({
        where: {
          namespace_key_lang: {
            namespace: t.namespace,
            key: t.key,
            lang: t.lang,
          },
        },
        update: {
          value: t.value,
          updatedBy,
          updatedAt: new Date(),
        },
        create: {
          namespace: t.namespace,
          key: t.key,
          lang: t.lang,
          value: t.value,
          updatedBy,
        },
      }),
    );

    await Promise.all(operations);

    // Invalidate all affected caches
    const affectedNamespaces = new Set(translations.map((t) => `${t.lang}:${t.namespace}`));
    await Promise.all(
      Array.from(affectedNamespaces).map((key) => {
        const [lang, namespace] = key.split(':');
        return this.invalidateCache(lang, namespace);
      }),
    );

    return translations.length;
  }

  /**
   * Delete translation
   */
  async deleteTranslation(namespace: string, key: string, lang: string): Promise<void> {
    await this.prisma.staticTranslation.delete({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
    });

    await this.invalidateCache(lang, namespace);
  }

  /**
   * Mark translation as reviewed
   */
  async markReviewed(namespace: string, key: string, lang: string, reviewedBy: string): Promise<void> {
    await this.prisma.staticTranslation.update({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
      data: {
        needsReview: false,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });

    await this.invalidateCache(lang, namespace);
  }

  /**
   * Strip [FR], [DE], [EN] prefixes from text (case-insensitive)
   * This is critical to ensure we're translating actual content, not placeholders
   */
  private stripPrefixes(text: string): string {
    if (!text) return text;
    // Remove [FR], [DE], [EN] prefixes (case-insensitive) with optional space after
    return text.replace(/^\[(FR|DE|EN)\]\s*/i, '').trim();
  }

  /**
   * Helper: Transform flat keys to nested object
   */
  private nestKeys(translations: Array<{ key: string; value: string }>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const { key, value } of translations) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      current[parts[parts.length - 1]] = value;
    }

    return result;
  }

  /**
   * Get current translation version for cache-busting
   */
  async getCurrentVersion(): Promise<string> {
    const activeRelease = await this.prisma.translationRelease.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeRelease) {
      return activeRelease.version;
    }

    // Fallback to timestamp-based version if no release exists
    return `v${Date.now()}`;
  }

  /**
   * Create a new translation release
   */
  async createRelease(version: string, description: string, createdBy: string): Promise<void> {
    // Deactivate all existing releases
    await this.prisma.translationRelease.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new release
    await this.prisma.translationRelease.create({
      data: {
        version,
        description,
        createdBy,
        isActive: true,
      },
    });

    this.logger.log(`Created translation release: ${version}`);
  }

  /**
   * Translate missing translations using machine translation
   * @param sourceLang Source language (e.g., 'en')
   * @param targetLang Target language (e.g., 'fr')
   * @param namespace Optional namespace filter
   * @param keys Optional specific keys to translate
   * @returns Number of translations created
   */
  async translateMissing(
    sourceLang: string,
    targetLang: string,
    namespace?: string,
    keys?: string[],
    force: boolean = false,
  ): Promise<number> {
    this.logger.log(`=== STARTING TRANSLATION: ${sourceLang} -> ${targetLang} (namespace: ${namespace || 'all'}, force: ${force}) ===`);
    // Wait for DeepL initialization and check availability
    this.logger.log(`Checking DeepL availability for translation ${sourceLang} -> ${targetLang}`);
    const isAvailable = await this.deepLService.waitForInitialization();
    this.logger.log(`DeepL available: ${isAvailable}`);
    
    if (!isAvailable) {
      const errorMsg = 'DeepL service is not available. Please configure DEEPL_API_KEY in your environment variables and ensure the deepl-node package is installed.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Find all source translations
    const where: any = { lang: sourceLang };
    if (namespace) where.namespace = namespace;
    if (keys && keys.length > 0) {
      where.key = { in: keys };
    }

    const sourceTranslations = await this.prisma.staticTranslation.findMany({
      where,
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });

    this.logger.log(`Found ${sourceTranslations.length} source translations to process (namespace: ${namespace || 'all'}, sourceLang: ${sourceLang}, targetLang: ${targetLang})`);
    
    // Check if admin.designSystem entries are in sourceTranslations
    const adminDesignSystemSources = sourceTranslations.filter(s => s.namespace === 'admin' && s.key.startsWith('designSystem.'));
    this.logger.log(`=== SOURCE CHECK: Found ${adminDesignSystemSources.length} admin.designSystem entries in sourceTranslations array ===`);
    if (adminDesignSystemSources.length === 0) {
      this.logger.warn(`⚠️ WARNING: NO admin.designSystem entries found in sourceTranslations! They won't be translated.`);
      this.logger.warn(`   This means the English entries for admin.designSystem are not in the database or not being queried.`);
    } else {
      const examples = adminDesignSystemSources.slice(0, 5).map(s => s.key);
      this.logger.log(`=== EXAMPLES OF ADMIN.DESIGNSYSTEM IN SOURCE: ${examples.join(', ')} ===`);
    }

    // Also find target translations with prefixes that need to be re-translated
    // This ensures we catch all entries with [FR], [DE], or [EN] prefixes (case-insensitive)
    this.logger.log(`Searching for target translations with prefixes for language: ${targetLang}`);
    const prefixVariations = targetLang === 'fr' 
      ? ['[FR]', '[fr]', '[Fr]', '[fR]'] 
      : targetLang === 'de' 
      ? ['[DE]', '[de]', '[De]', '[dE]'] 
      : ['[EN]', '[en]', '[En]', '[eN]'];
    
    this.logger.log(`Using prefix variations: ${prefixVariations.join(', ')}`);
    
    const targetWithPrefixes = await this.prisma.staticTranslation.findMany({
      where: {
        lang: targetLang,
        OR: prefixVariations.map(prefix => ({
          value: { startsWith: prefix },
        })),
        ...(namespace ? { namespace } : {}),
      },
    });

    this.logger.log(`=== PREFIX QUERY RESULT: Found ${targetWithPrefixes.length} target translations with ${prefixVariations[0]} prefix (case variations) that need translation ===`);
    
    // Log some examples of entries with prefixes found
    if (targetWithPrefixes.length > 0) {
      const examples = targetWithPrefixes.slice(0, 10).map(t => `${t.namespace}:${t.key} = "${t.value.substring(0, 50)}"`);
      this.logger.log(`=== EXAMPLES OF ENTRIES WITH PREFIXES: ${examples.join(', ')} ===`);
    } else {
      this.logger.log(`=== NO ENTRIES WITH PREFIXES FOUND - This might mean admin.designSystem entries don't have [FR] prefixes in the database ===`);
    }

    // Create a set of source translation keys for quick lookup
    const sourceKeys = new Set(sourceTranslations.map(s => `${s.namespace}:${s.key}`));
    
    // Log how many entries with prefixes we found vs how many are in source translations
    const prefixKeys = new Set(targetWithPrefixes.map(t => `${t.namespace}:${t.key}`));
    const prefixKeysInSource = Array.from(prefixKeys).filter(k => sourceKeys.has(k));
    const prefixKeysNotInSource = Array.from(prefixKeys).filter(k => !sourceKeys.has(k));
    this.logger.log(`=== PREFIX ANALYSIS: Found ${targetWithPrefixes.length} entries with prefixes. ${prefixKeysInSource.length} have English sources, ${prefixKeysNotInSource.length} don't have English sources ===`);
    if (prefixKeysNotInSource.length > 0) {
      this.logger.log(`=== ENTRIES WITH PREFIXES BUT NO ENGLISH SOURCES (first 10): ${prefixKeysNotInSource.slice(0, 10).join(', ')} ===`);
    }
    
    // For entries with prefixes, ensure they have English sources in sourceTranslations
    // Even if they already have English sources, we need to make sure they're in the array
    for (const targetWithPrefix of targetWithPrefixes) {
      const key = `${targetWithPrefix.namespace}:${targetWithPrefix.key}`;
      if (!sourceKeys.has(key)) {
        // Try to find a source translation in any language
        const anySource = await this.prisma.staticTranslation.findFirst({
          where: {
            namespace: targetWithPrefix.namespace,
            key: targetWithPrefix.key,
            lang: { in: ['en', 'fr', 'de'] },
          },
          orderBy: [
            { lang: 'asc' }, // Prefer English first
          ],
        });
        
        if (anySource) {
          if (anySource.lang === sourceLang) {
            // Found a source in the correct language, add it to sourceTranslations
            sourceTranslations.push(anySource);
            sourceKeys.add(key);
            this.logger.log(`Found missing source for ${key} in ${sourceLang}`);
          } else {
            // Found a source in a different language - try to find English source
            const enSource = await this.prisma.staticTranslation.findUnique({
              where: {
                namespace_key_lang: {
                  namespace: targetWithPrefix.namespace,
                  key: targetWithPrefix.key,
                  lang: 'en',
                },
              },
            });
            if (enSource) {
              sourceTranslations.push(enSource);
              sourceKeys.add(key);
              this.logger.log(`Found English source for ${key} (was missing from initial query)`);
            } else {
              this.logger.log(`Found source for ${key} in ${anySource.lang} but need ${sourceLang} - will check if English source exists`);
            }
          }
        } else {
          // No source found at all - this entry has a prefix but no source translation
          // We can't translate it without a source, so log a warning
          this.logger.warn(`Entry ${key} has ${prefixVariations[0]} prefix but no source translation found - cannot translate`);
        }
      } else {
        // Entry already has a source in sourceTranslations - this is good, it will be processed
        // But let's verify it's actually there
        const inArray = sourceTranslations.some(s => s.namespace === targetWithPrefix.namespace && s.key === targetWithPrefix.key && s.lang === sourceLang);
        if (!inArray) {
          // Key is in sourceKeys but not in sourceTranslations - this shouldn't happen, but let's fix it
          const enSource = await this.prisma.staticTranslation.findUnique({
            where: {
              namespace_key_lang: {
                namespace: targetWithPrefix.namespace,
                key: targetWithPrefix.key,
                lang: 'en',
              },
            },
          });
          if (enSource) {
            sourceTranslations.push(enSource);
            this.logger.log(`Added missing ${key} to sourceTranslations array (was in sourceKeys but not in array)`);
          }
        }
      }
    }
    
    // Log final count after adding missing sources
    const finalAdminDesignSystemSources = sourceTranslations.filter(s => s.namespace === 'admin' && s.key.startsWith('designSystem.'));
    this.logger.log(`=== AFTER ADDING MISSING SOURCES: ${finalAdminDesignSystemSources.length} admin.designSystem entries in sourceTranslations array ===`);

    let translatedCount = 0;

    // For each source translation, check if target translation exists
    let adminDesignSystemProcessed = 0;
    let adminDesignSystemSkipped = 0;
    let adminDesignSystemTranslated = 0;
    
    for (const source of sourceTranslations) {
      const isAdminDesignSystem = source.namespace === 'admin' && source.key.startsWith('designSystem.');
      
      const existing = await this.prisma.staticTranslation.findUnique({
        where: {
          namespace_key_lang: {
            namespace: source.namespace,
            key: source.key,
            lang: targetLang,
          },
        },
      });

      // Helper function to check if a translation is a placeholder
      const isPlaceholder = (value: string, sourceValue: string): boolean => {
        if (!value) return true;
        
        // Check if it matches source exactly (case-insensitive)
        if (value.trim().toLowerCase() === sourceValue.trim().toLowerCase()) return true;
        
        // Check if it has a prefix like [FR], [DE], [EN] - ANY value with these prefixes is a placeholder
        const prefixPattern = /^\[(FR|DE|EN)\]\s*/i;
        if (prefixPattern.test(value)) {
          return true; // Any value with [FR], [DE], or [EN] prefix is considered a placeholder
        }
        
        return false;
      };

      // If force is true, re-translate everything
      if (force) {
        if (existing) {
          this.logger.log(
            `Force re-translating ${source.namespace}:${source.key} (${targetLang}) - overwriting existing translation`,
          );
        }
      } else {
        // Skip if target translation already exists AND is NOT a placeholder
        // (If it's a placeholder, we should re-translate it)
        if (existing && !isPlaceholder(existing.value, source.value)) {
          if (isAdminDesignSystem) {
            adminDesignSystemSkipped++;
            this.logger.log(
              `⚠️ ADMIN.DESIGNSYSTEM SKIPPED: ${source.key} (${targetLang}) - translation exists and is NOT a placeholder: "${existing.value.substring(0, 50)}..." (isPlaceholder returned false)`,
            );
          }
          this.logger.log(
            `Skipping ${source.namespace}:${source.key} (${targetLang}) - translation already exists and is not a placeholder: "${existing.value.substring(0, 50)}..."`,
          );
          continue;
        }

        // If existing translation is a placeholder, we'll re-translate it
        if (existing && isPlaceholder(existing.value, source.value)) {
          if (isAdminDesignSystem) {
            adminDesignSystemProcessed++;
            this.logger.log(
              `✅ ADMIN.DESIGNSYSTEM FOUND PLACEHOLDER: ${source.key} (${targetLang}) - will re-translate: "${existing.value.substring(0, 50)}..."`,
            );
          }
          this.logger.log(
            `Re-translating ${source.namespace}:${source.key} (${targetLang}) - existing translation is a placeholder: "${existing.value.substring(0, 50)}..."`,
          );
        }
        
        if (isAdminDesignSystem && !existing) {
          adminDesignSystemProcessed++;
          this.logger.log(
            `✅ ADMIN.DESIGNSYSTEM NO EXISTING: ${source.key} (${targetLang}) - will create new translation`,
          );
        }
      }

      try {
        // CRITICAL: Strip any prefixes from source value before translating
        // This ensures we're translating the actual text, not a placeholder
        const cleanSourceValue = this.stripPrefixes(source.value);
        
        if (isAdminDesignSystem) {
          this.logger.log(
            `🔍 ADMIN.DESIGNSYSTEM: Source value "${source.value}" -> Cleaned: "${cleanSourceValue}"`,
          );
        }

        // Check Translation Memory first (using cleaned source)
        let translatedText = await this.translationMemory.getFromMemory(
          cleanSourceValue,
          sourceLang,
          targetLang,
        );

        let charactersTranslated = 0;
        let translationSource = 'memory';

        // CRITICAL: If Translation Memory returns the same value as source, ignore it and use DeepL
        // This prevents using contaminated Translation Memory entries that have English text stored as "translations"
        if (translatedText) {
          translatedText = this.stripPrefixes(translatedText);
          
          // If Translation Memory returns the source value, it's contaminated - ignore it
          if (translatedText === cleanSourceValue) {
            if (isAdminDesignSystem) {
              this.logger.warn(
                `⚠️ ADMIN.DESIGNSYSTEM: Translation Memory returned source value for ${source.key} - ignoring and using DeepL instead (Translation Memory is contaminated)`,
              );
            }
            this.logger.warn(
              `Translation Memory returned source value for ${source.namespace}:${source.key} - ignoring and using DeepL instead`,
            );
            translatedText = null; // Force DeepL translation
          }
        }

        if (!translatedText) {
          // Not in memory or memory returned source value, call DeepL
          translationSource = 'deepl';
          this.logger.log(`Calling DeepL to translate: ${source.namespace}:${source.key} (${sourceLang} -> ${targetLang})`);
          translatedText = await this.deepLService.translate(
            cleanSourceValue,
            sourceLang,
            targetLang,
          );
          
          // CRITICAL: Validate translation doesn't have prefixes
          translatedText = this.stripPrefixes(translatedText);
          
          // CRITICAL: If DeepL returns the same value, log a warning but still save it
          // Some words are legitimately the same (e.g., "Canton", "Parent", proper nouns)
          // But for longer phrases, this might indicate an issue
          if (translatedText === cleanSourceValue) {
            // Check if this is likely a valid same-word translation
            const isLikelySameWord = 
              cleanSourceValue.length < 20 || 
              cleanSourceValue.match(/^\+?\d/) || // Phone numbers
              cleanSourceValue.match(/^[A-Z][a-z]+$/) || // Proper nouns like "Canton", "Parent"
              !cleanSourceValue.includes(' '); // Single words
            
            if (isLikelySameWord) {
              this.logger.log(
                `DeepL returned original text for ${source.namespace}:${source.key} - likely a word that's the same in both languages (e.g., "Canton", "Parent", phone numbers). Saving as valid translation.`,
              );
            } else {
              this.logger.warn(
                `⚠️ DeepL returned original text for ${source.namespace}:${source.key}. This might indicate DeepL is not working properly, but saving anyway as it may be valid.`,
              );
              if (isAdminDesignSystem) {
                this.logger.warn(
                  `⚠️ ADMIN.DESIGNSYSTEM: DeepL returned source value for ${source.key} - this is unusual for longer phrases`,
                );
              }
            }
            // Continue to save the translation even if it matches source - it's valid
          }

          // Track cost (only for new translations)
          charactersTranslated = cleanSourceValue.length;
          await this.costTracking.trackUsage(
            'deepl',
            sourceLang,
            targetLang,
            charactersTranslated,
          );

          // Save to memory for future use (using cleaned values)
          // CRITICAL: Only save to memory if it's different from source
          if (translatedText !== cleanSourceValue) {
            await this.translationMemory.saveToMemory(
              cleanSourceValue,
              sourceLang,
              targetLang,
              translatedText,
              'deepl',
            );
          } else {
            this.logger.warn(
              `Not saving to Translation Memory: translation is identical to source for ${source.namespace}:${source.key}`,
            );
          }

          if (isAdminDesignSystem) {
            this.logger.log(
              `🎯 ADMIN.DESIGNSYSTEM TRANSLATING: ${source.key} (${sourceLang} -> ${targetLang}) via DeepL: "${cleanSourceValue.substring(0, 50)}..." -> "${translatedText.substring(0, 50)}..." (${charactersTranslated} chars)`,
            );
          }
          this.logger.log(
            `Translated ${source.namespace}:${source.key} (${sourceLang} -> ${targetLang}) via DeepL: "${cleanSourceValue.substring(0, 50)}..." -> "${translatedText.substring(0, 50)}..." (${charactersTranslated} chars)`,
          );
        } else {
          // Translation Memory returned a valid (different) translation
          translationSource = 'memory';
          
          if (isAdminDesignSystem) {
            this.logger.log(
              `🎯 ADMIN.DESIGNSYSTEM: Got from Translation Memory: "${translatedText.substring(0, 50)}..." (different from source)`,
            );
          }
          this.logger.log(
            `Translated ${source.namespace}:${source.key} (${sourceLang} -> ${targetLang}) via Translation Memory (saved ${cleanSourceValue.length} chars)`,
          );
        }

        // CRITICAL: Final validation - ensure translated text doesn't have prefixes
        const prefixPattern = /^\[(FR|DE|EN)\]\s*/i;
        if (prefixPattern.test(translatedText)) {
          const errorMsg = `CRITICAL ERROR: Translated text still has prefix! "${translatedText.substring(0, 50)}..." - This should never happen. Stripping prefix.`;
          this.logger.error(errorMsg);
          translatedText = this.stripPrefixes(translatedText);
          if (isAdminDesignSystem) {
            this.logger.error(`❌ ADMIN.DESIGNSYSTEM: ${errorMsg}`);
          }
        }

        // CRITICAL: Ensure translated text is not empty
        if (!translatedText || translatedText.trim().length === 0) {
          const errorMsg = `CRITICAL ERROR: Translated text is empty for ${source.namespace}:${source.key} (${targetLang})`;
          this.logger.error(errorMsg);
          if (isAdminDesignSystem) {
            this.logger.error(`❌ ADMIN.DESIGNSYSTEM: ${errorMsg}`);
          }
          throw new Error(errorMsg);
        }

        // Create or update target translation
        if (isAdminDesignSystem) {
          this.logger.log(
            `💾 ADMIN.DESIGNSYSTEM SAVING: ${source.key} (${targetLang}) = "${translatedText.substring(0, 50)}..." (source: ${translationSource})`,
          );
        }
        
        const upsertResult = await this.prisma.staticTranslation.upsert({
          where: {
            namespace_key_lang: {
              namespace: source.namespace,
              key: source.key,
              lang: targetLang,
            },
          },
          create: {
            namespace: source.namespace,
            key: source.key,
            lang: targetLang,
            value: translatedText,
            needsReview: true, // Mark as needing review
          },
          update: {
            value: translatedText,
            needsReview: true, // Mark as needing review
            updatedAt: new Date(),
          },
        });

        // CRITICAL: Verify the save actually worked
        const verifyResult = await this.prisma.staticTranslation.findUnique({
          where: {
            namespace_key_lang: {
              namespace: source.namespace,
              key: source.key,
              lang: targetLang,
            },
          },
        });

        if (!verifyResult) {
          const errorMsg = `CRITICAL ERROR: Translation was not saved! ${source.namespace}:${source.key} (${targetLang})`;
          this.logger.error(errorMsg);
          if (isAdminDesignSystem) {
            this.logger.error(`❌ ADMIN.DESIGNSYSTEM: ${errorMsg}`);
          }
          throw new Error(errorMsg);
        }

        // CRITICAL: Verify the saved value doesn't have prefixes
        if (prefixPattern.test(verifyResult.value)) {
          const errorMsg = `CRITICAL ERROR: Saved translation still has prefix! ${source.namespace}:${source.key} (${targetLang}) = "${verifyResult.value.substring(0, 50)}..."`;
          this.logger.error(errorMsg);
          if (isAdminDesignSystem) {
            this.logger.error(`❌ ADMIN.DESIGNSYSTEM: ${errorMsg}`);
          }
          // Try to fix it by updating again
          await this.prisma.staticTranslation.update({
            where: {
              namespace_key_lang: {
                namespace: source.namespace,
                key: source.key,
                lang: targetLang,
              },
            },
            data: {
              value: this.stripPrefixes(verifyResult.value),
              updatedAt: new Date(),
            },
          });
          this.logger.warn(`Fixed translation by stripping prefix: ${source.namespace}:${source.key} (${targetLang})`);
        }

        translatedCount++;
        if (isAdminDesignSystem) {
          adminDesignSystemTranslated++;
          this.logger.log(
            `✅ ADMIN.DESIGNSYSTEM SAVED & VERIFIED: ${source.key} (${targetLang}) = "${verifyResult.value.substring(0, 50)}..." - translation saved and verified successfully`,
          );
        }

        // Invalidate cache
        await this.invalidateCache(targetLang, source.namespace);
      } catch (error) {
        if (isAdminDesignSystem) {
          this.logger.error(
            `❌ ADMIN.DESIGNSYSTEM ERROR: Failed to translate ${source.key} from ${sourceLang} to ${targetLang}: ${error.message}`,
            error.stack,
          );
        }
        this.logger.error(
          `Failed to translate ${source.namespace}:${source.key} from ${sourceLang} to ${targetLang}: ${error.message}`,
          error.stack,
        );
        // Continue with next translation, but log the error
        // If this is the first error and it's a DeepL availability issue, we might want to stop
        if (error.message?.includes('not available') && translatedCount === 0) {
          // If we haven't translated anything and DeepL is not available, throw the error
          throw error;
        }
        // Continue with next translation for other errors
      }
    }

    // Log a summary of what was found and processed
    const adminEntries = targetWithPrefixes.filter(t => t.namespace === 'admin');
    const adminDesignSystemEntries = adminEntries.filter(t => t.key.startsWith('designSystem.'));
    this.logger.log(
      `=== FINAL SUMMARY: Found ${targetWithPrefixes.length} total entries with prefixes, ${adminEntries.length} are from 'admin' namespace, ${adminDesignSystemEntries.length} are admin.designSystem entries ===`,
    );
    this.logger.log(
      `=== ADMIN.DESIGNSYSTEM PROCESSING: Processed ${adminDesignSystemProcessed}, Skipped ${adminDesignSystemSkipped}, Translated ${adminDesignSystemTranslated} ===`,
    );
    if (adminEntries.length > 0 && adminDesignSystemEntries.length === 0) {
      // Log some examples of admin entries that were found (to see what keys they have)
      const examples = adminEntries.slice(0, 10).map(t => `${t.key} = "${t.value.substring(0, 40)}"`);
      this.logger.log(`=== ADMIN ENTRIES WITH PREFIXES (first 10): ${examples.join(', ')} ===`);
      this.logger.log(`=== NOTE: None of these admin entries start with 'designSystem.' - checking if keys might be different ===`);
    }
    if (adminDesignSystemEntries.length > 0) {
      const examples = adminDesignSystemEntries.slice(0, 5).map(t => `${t.key} = "${t.value.substring(0, 40)}"`);
      this.logger.log(`=== ADMIN.DESIGNSYSTEM ENTRIES WITH PREFIXES: ${examples.join(', ')} ===`);
    } else {
      this.logger.log(`=== NO ADMIN.DESIGNSYSTEM ENTRIES WITH PREFIXES FOUND IN DATABASE ===`);
    }
    
    // Final verification: Check if any admin.designSystem entries still have prefixes
    const finalCheck = await this.prisma.staticTranslation.findMany({
      where: {
        namespace: 'admin',
        key: { startsWith: 'designSystem.' },
        lang: targetLang,
        value: {
          startsWith: targetLang === 'fr' ? '[FR]' : targetLang === 'de' ? '[DE]' : '[EN]',
        },
      },
    });

    this.logger.log(
      `=== TRANSLATION SUMMARY: Translated ${translatedCount} missing translations from ${sourceLang} to ${targetLang} ===`,
    );
    this.logger.log(
      `=== ADMIN.DESIGNSYSTEM FINAL STATUS: Processed ${adminDesignSystemProcessed}, Skipped ${adminDesignSystemSkipped}, Actually Translated ${adminDesignSystemTranslated} ===`,
    );
    
    if (finalCheck.length > 0) {
      this.logger.error(
        `❌ CRITICAL: ${finalCheck.length} admin.designSystem entries STILL have prefixes after translation! This indicates a serious issue.`,
      );
      this.logger.error(
        `   Examples: ${finalCheck.slice(0, 5).map(t => `${t.key} = "${t.value.substring(0, 30)}..."`).join(', ')}`,
      );
    } else if (adminDesignSystemProcessed > 0) {
      this.logger.log(
        `✅ SUCCESS: All ${adminDesignSystemTranslated} admin.designSystem entries were translated and verified (no prefixes remaining)`,
      );
    }
    
    if (adminDesignSystemProcessed > 0 && adminDesignSystemTranslated === 0) {
      this.logger.warn(
        `⚠️ WARNING: ${adminDesignSystemProcessed} admin.designSystem entries were processed but NONE were translated! This suggests they were skipped or translation failed.`,
      );
    }
    
    this.logger.log(
      `=== NOTE: Check logs above for "ADMIN.DESIGNSYSTEM" messages to see detailed processing information ===`,
    );
    return translatedCount;
  }

  /**
   * Bulk approve translations
   */
  async bulkApprove(
    keys: Array<{ namespace: string; key: string; lang: string }>,
    approvedBy: string,
  ): Promise<void> {
    await Promise.all(
      keys.map(({ namespace, key, lang }) =>
        this.prisma.staticTranslation.update({
          where: {
            namespace_key_lang: {
              namespace,
              key,
              lang,
            },
          },
          data: {
            needsReview: false,
            reviewedBy: approvedBy,
            reviewedAt: new Date(),
          },
        }),
      ),
    );

    // Invalidate affected caches
    const affectedNamespaces = new Set(keys.map((k) => `${k.lang}:${k.namespace}`));
    await Promise.all(
      Array.from(affectedNamespaces).map((key) => {
        const [lang, namespace] = key.split(':');
        return this.invalidateCache(lang, namespace);
      }),
    );

    this.logger.log(`Bulk approved ${keys.length} translations`);
  }

  /**
   * Export translations to JSON format
   */
  async exportTranslations(namespace?: string): Promise<
    Array<{
      namespace: string;
      key: string;
      lang: string;
      value: string;
    }>
  > {
    const where: any = {};
    if (namespace) where.namespace = namespace;

    const translations = await this.prisma.staticTranslation.findMany({
      where,
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }, { lang: 'asc' }],
    });

    return translations.map((t) => ({
      namespace: t.namespace,
      key: t.key,
      lang: t.lang,
      value: t.value,
    }));
  }

  /**
   * Import translations from JSON array
   */
  async importTranslations(
    translations: Array<{
      namespace: string;
      key: string;
      lang: string;
      value: string;
    }>,
    updatedBy?: string,
  ): Promise<number> {
    return this.bulkUpsert(translations, updatedBy);
  }

  /**
   * Get audit logs for translations
   */
  async getAuditLogs(
    type?: 'static' | 'dynamic',
    limit: number = 100,
  ): Promise<Array<{
    id: string;
    type: string;
    namespace?: string;
    entityType?: string;
    entityId?: string;
    key?: string;
    field?: string;
    lang: string;
    action: string;
    oldValue?: string;
    newValue?: string;
    userId: string;
    createdAt: Date;
  }>> {
    const where: any = {};
    if (type) where.type = type;

    const logs = await this.prisma.translationAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }

  /**
   * List all releases
   */
  async listReleases(): Promise<
    Array<{
      id: string;
      version: string;
      description?: string;
      createdBy?: string;
      createdAt: Date;
      isActive: boolean;
    }>
  > {
    const releases = await this.prisma.translationRelease.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return releases;
  }

  /**
   * Invalidate cache for a namespace
   */
  private async invalidateCache(lang: string, namespace: string): Promise<void> {
    const cacheKey = `static:${lang}:${namespace}`;
    await this.cacheManager.del(cacheKey);
  }

  /**
   * Clean up existing translations by removing [FR], [DE], [EN] prefixes
   * This is a one-time cleanup function to fix translations that were created with placeholder prefixes
   */
  async cleanupPrefixes(): Promise<{ cleaned: number; affected: number }> {
    // Match prefixes with or without space, at the start of the string
    const prefixPatterns = [
      /^\[FR\]\s*/i,  // [FR] or [FR] with space
      /^\[DE\]\s*/i,  // [DE] or [DE] with space
      /^\[EN\]\s*/i,  // [EN] or [EN] with space
    ];
    let cleaned = 0;
    let affected = 0;

    // Get all translations
    const translations = await this.prisma.staticTranslation.findMany({
      select: {
        namespace: true,
        key: true,
        lang: true,
        value: true,
      },
    });

    for (const translation of translations) {
      let cleanedValue = translation.value;
      let wasModified = false;

      // Remove any prefix pattern
      for (const pattern of prefixPatterns) {
        if (pattern.test(cleanedValue)) {
          cleanedValue = cleanedValue.replace(pattern, '');
          wasModified = true;
          // Only remove one prefix, so break after first match
          break;
        }
      }

      if (wasModified) {
        // Use composite primary key (namespace, key, lang)
        await this.prisma.staticTranslation.update({
          where: {
            namespace_key_lang: {
              namespace: translation.namespace,
              key: translation.key,
              lang: translation.lang,
            },
          },
          data: { value: cleanedValue },
        });
        cleaned++;
        
        this.logger.log(
          `Cleaned prefix from ${translation.namespace}:${translation.key} (${translation.lang}): "${translation.value.substring(0, 50)}..." -> "${cleanedValue.substring(0, 50)}..."`,
        );
        
        // Invalidate cache for this namespace/lang
        await this.invalidateCache(translation.lang, translation.namespace);
      }
      
      affected++;
    }

    this.logger.log(`Cleaned up ${cleaned} translations with prefixes out of ${affected} total translations`);
    return { cleaned, affected };
  }

  /**
   * Import translations from CSV string.
   * Expected headers: namespace,key,lang,value
   */
  async importTranslationsCsv(csv: string, updatedBy?: string): Promise<number> {
    if (!csv || typeof csv !== 'string') {
      throw new Error('CSV content is required');
    }

    const rows = this.parseCsv(csv);
    if (rows.length === 0) {
      return 0;
    }

    // Validate header
    const [header, ...dataRows] = rows;
    const expected = ['namespace', 'key', 'lang', 'value'];
    const normalizedHeader = header.map((h) => h.trim().toLowerCase());
    const validHeader =
      normalizedHeader.length === 4 &&
      expected.every((col, i) => normalizedHeader[i] === col);

    if (!validHeader) {
      throw new Error('Invalid CSV header. Expected: namespace,key,lang,value');
    }

    const translations: Array<{ namespace: string; key: string; lang: string; value: string }> = [];

    for (const row of dataRows) {
      // Allow short/empty trailing columns to be treated as empty strings
      const [namespace = '', key = '', lang = '', value = ''] = row;
      const ns = (namespace ?? '').trim();
      const k = (key ?? '').trim();
      const l = (lang ?? '').trim();
      const v = (value ?? '').toString();

      if (!ns || !k || !l) {
        // Skip invalid lines but continue processing
        this.logger.warn(`Skipping CSV row due to missing required columns: ${JSON.stringify(row)}`);
        continue;
      }

      translations.push({ namespace: ns, key: k, lang: l, value: v });
    }

    if (translations.length === 0) {
      return 0;
    }

    return this.bulkUpsert(translations, updatedBy);
  }

  /**
   * Minimal CSV parser that supports:
   * - Comma-separated values
   * - Double-quoted fields with escaped quotes ("")
   * - Newlines within quoted fields
   * Returns an array of rows, where each row is string[]
   */
  private parseCsv(input: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const next = i + 1 < input.length ? input[i + 1] : '';

      if (inQuotes) {
        if (char === '"' && next === '"') {
          // Escaped quote
          field += '"';
          i++; // Skip next
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false;
        } else {
          field += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(field);
          field = '';
        } else if (char === '\r') {
          // ignore CR, handle on LF
        } else if (char === '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
        } else {
          field += char;
        }
      }
    }

    // Push last field/row if any
    if (field.length > 0 || inQuotes || row.length > 0) {
      row.push(field);
    }
    if (row.length > 0) {
      rows.push(row);
    }

    return rows;
  }

  /**
   * Auto-fix hardcoded strings in frontend code
   * Runs the automated script to find and fix hardcoded strings
   */
  async autoFixHardcodedStrings(): Promise<{
    success: boolean;
    fixed: number;
    skipped: number;
    errors: number;
    details?: any;
    message: string;
  }> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const path = await import('path');
      const fs = await import('fs');
      
      // Allow configuration via environment variable
      const configuredScriptPath = process.env.AUTO_FIX_SCRIPT_PATH;
      if (configuredScriptPath && fs.existsSync(configuredScriptPath)) {
        const scriptDir = path.dirname(configuredScriptPath);
        const projectRoot = path.dirname(scriptDir);
        return this.runScript(configuredScriptPath, projectRoot);
      }
      
      // Find project root by looking for package.json and scripts directory
      // Start from __dirname (api/src/static-translation) and go up to find root
      let projectRoot = __dirname;
      let found = false;
      const maxDepth = 10; // Prevent infinite loop
      let depth = 0;
      
      while (depth < maxDepth && projectRoot !== path.dirname(projectRoot)) {
        const scriptsDir = path.join(projectRoot, 'scripts');
        const packageJson = path.join(projectRoot, 'package.json');
        if (fs.existsSync(scriptsDir) && fs.existsSync(packageJson)) {
          found = true;
          break;
        }
        projectRoot = path.dirname(projectRoot);
        depth++;
      }
      
      if (!found) {
        // Fallback: try process.cwd() or use a relative path from __dirname
        projectRoot = process.cwd();
        // If still in api directory, go up one level
        if (path.basename(projectRoot) === 'api') {
          projectRoot = path.dirname(projectRoot);
        }
      }
      
      const scriptPath = path.join(projectRoot, 'scripts', 'auto-fix-hardcoded-strings.mjs');
      
      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        // Try alternative paths
        const altPath1 = path.resolve(process.cwd(), '..', 'scripts', 'auto-fix-hardcoded-strings.mjs');
        const altPath2 = path.resolve(__dirname, '../../../scripts/auto-fix-hardcoded-strings.mjs');
        
        if (fs.existsSync(altPath1)) {
          this.logger.log(`Using alternative path 1: ${altPath1}`);
          const altCwd1 = path.dirname(path.dirname(altPath1)); // Go up from scripts to project root
          return this.runScript(altPath1, altCwd1);
        } else if (fs.existsSync(altPath2)) {
          this.logger.log(`Using alternative path 2: ${altPath2}`);
          const altCwd2 = path.dirname(path.dirname(altPath2)); // Go up from scripts to project root
          return this.runScript(altPath2, altCwd2);
        }
        
        throw new Error(`Script not found at ${scriptPath}. Also tried: ${altPath1}, ${altPath2}`);
      }
      
      return this.runScript(scriptPath, projectRoot);
    } catch (error: any) {
      this.logger.error('Auto-fix script failed:', error);
      return {
        success: false,
        fixed: 0,
        skipped: 0,
        errors: 1,
        message: `Auto-fix failed: ${error.message}`,
      };
    }
  }

  /**
   * Helper method to run the auto-fix script
   */
  private async runScript(scriptPath: string, cwd: string): Promise<{
    success: boolean;
    fixed: number;
    skipped: number;
    errors: number;
    details?: any;
    message: string;
  }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const path = await import('path');
    const fs = await import('fs');
    
    this.logger.log(`Running auto-fix script from: ${cwd}`);
    this.logger.log(`Script path: ${scriptPath}`);
    
    // Run the script - it outputs JSON to stdout and human-readable to stderr
    let stdout: string;
    let stderr: string;
    try {
      const result = await execAsync(`node "${scriptPath}"`, {
        cwd: cwd, // Run from project root
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        encoding: 'utf8',
        timeout: 5 * 60 * 1000, // 5 minute timeout
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: any) {
      this.logger.error('Script execution failed:', execError);
      return {
        success: false,
        fixed: 0,
        skipped: 0,
        errors: 1,
        message: `Script execution failed: ${execError.message}`,
      };
    }
    
    // Log stderr (human-readable output) for debugging
    if (stderr) {
      this.logger.log('Script output:', stderr);
    }
    
    // Parse JSON from stdout
    try {
      // Extract JSON from stdout (may have other text)
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        this.logger.log(`Auto-fix completed: ${result.fixed} fixed, ${result.skipped} skipped, ${result.errors} errors`);
        
        // If strings were fixed, automatically sync to database
        if (result.fixed > 0) {
          this.logger.log('🔄 Auto-syncing translations to database...');
          try {
            const syncScriptPath = path.join(cwd, 'scripts', 'sync-json-to-database.mjs');
            if (fs.existsSync(syncScriptPath)) {
              await execAsync(`node "${syncScriptPath}"`, {
                cwd: cwd,
                maxBuffer: 10 * 1024 * 1024,
                timeout: 60 * 1000, // 1 minute
              });
              this.logger.log('✅ Translations synced to database automatically!');
              result.message = result.message + '\n\n✅ Translations automatically synced to database and ready to use!';
            }
          } catch (syncError: any) {
            this.logger.warn('Database sync failed (non-fatal):', syncError.message);
            result.message = result.message + '\n\n⚠️ Auto-sync to database failed. Please run manually: node scripts/sync-json-to-database.mjs';
          }
        }
        
        return result;
      } else {
        // Try parsing entire stdout
        const result = JSON.parse(stdout.trim());
        return result;
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract info from stdout/stderr
      const output = stdout + stderr;
      const fixedMatch = output.match(/Fixed:\s*(\d+)/);
      const skippedMatch = output.match(/Skipped:\s*(\d+)/);
      const errorMatch = output.match(/Errors:\s*(\d+)/);
      
      const foundAnyMatch = fixedMatch || skippedMatch || errorMatch;
      return {
        success: foundAnyMatch ? true : false,
        fixed: fixedMatch ? parseInt(fixedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        errors: errorMatch ? parseInt(errorMatch[1]) : 0,
        message: foundAnyMatch 
          ? (output || 'Auto-fix completed successfully')
          : `Failed to parse script output: ${output.substring(0, 500)}`,
      };
    }
  }
}

