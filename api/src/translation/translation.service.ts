import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { DeepLService } from './deepl.service';

export interface MTProvider {
  translate(params: { text: string; from: string; to: string }): Promise<string>;
  detect?(text: string): Promise<{ lang: string; confidence: number }>;
}

export interface TranslationResult {
  text: string;
  lang: string;
  confidence?: number;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly supportedLangs = ['en', 'fr', 'de'];
  private readonly defaultLang = 'en';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @InjectQueue('translation') private translationQueue?: Queue,
    @Optional() private deepLService?: DeepLService,
  ) {
    if (this.deepLService) {
      this.logger.log('DeepLService injected successfully');
      if (this.deepLService.isAvailable()) {
        this.logger.log('DeepL service is available and ready');
      } else {
        this.logger.warn('DeepL service injected but not available (check API key)');
      }
    } else {
      this.logger.warn('DeepLService not injected - translations may not work properly');
    }
  }

  /**
   * Detect language from text using simple heuristics
   * In production, this would use a proper language detection library
   */
  async detectLanguage(text: string): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      return { text, lang: this.defaultLang };
    }

    // Simple heuristic detection based on common words
    const lowerText = text.toLowerCase();
    
    // French indicators
    const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'à', 'avec', 'pour', 'dans', 'sur', 'par'];
    const frenchCount = frenchWords.filter(word => lowerText.includes(word)).length;
    
    // German indicators
    const germanWords = ['der', 'die', 'das', 'und', 'mit', 'für', 'von', 'zu', 'auf', 'in', 'ist', 'sind', 'haben', 'werden'];
    const germanCount = germanWords.filter(word => lowerText.includes(word)).length;
    
    // English indicators
    const englishWords = ['the', 'and', 'with', 'for', 'from', 'to', 'in', 'on', 'at', 'is', 'are', 'have', 'will', 'be'];
    const englishCount = englishWords.filter(word => lowerText.includes(word)).length;

    if (frenchCount > germanCount && frenchCount > englishCount) {
      return { text, lang: 'fr', confidence: Math.min(frenchCount / 10, 0.9) };
    } else if (germanCount > frenchCount && germanCount > englishCount) {
      return { text, lang: 'de', confidence: Math.min(germanCount / 10, 0.9) };
    } else {
      return { text, lang: 'en', confidence: Math.min(englishCount / 10, 0.9) };
    }
  }

  /**
   * Save entity with translation support
   */
  async saveEntityWithTranslations(
    entityType: string,
    entityId: string,
    payload: Record<string, any>,
    translatableFields: string[],
  ): Promise<void> {
    const texts = translatableFields
      .map(field => payload[field])
      .filter(text => text && typeof text === 'string' && text.trim().length > 0)
      .join(' ');

    const detection = await this.detectLanguage(texts);
    const sourceLang = detection.lang;

    // Save source language
    await this.prisma.entitySource.upsert({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
      update: {
        sourceLang,
        updatedAt: new Date(),
      },
      create: {
        entityType,
        entityId,
        sourceLang,
      },
    });

    // Save source translations
    for (const field of translatableFields) {
      const text = payload[field];
      if (text && typeof text === 'string' && text.trim().length > 0) {
        const sourceHash = crypto.createHash('sha256').update(text).digest('hex');
        
        await this.prisma.entityTranslation.upsert({
          where: {
            entityType_entityId_lang_field: {
              entityType,
              entityId,
              lang: sourceLang,
              field,
            },
          },
          update: {
            text,
            sourceHash,
            updatedAt: new Date(),
          },
          create: {
            entityType,
            entityId,
            lang: sourceLang,
            field,
            text,
            sourceHash,
            origin: 'machine',
            verified: false,
          },
        });
      }
    }

    // Try to enqueue async translation job, but fall back to DeepL if queue fails
    // This ensures translations happen even if queue isn't working
    let queueSucceeded = false;
    if (this.translationQueue) {
      try {
        await this.translationQueue.add(
          'translate-entity',
          {
            entityType,
            entityId,
            sourceLang: detection.lang,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        this.logger.log(`Enqueued translation job for ${entityType}:${entityId}`);
        queueSucceeded = true;
      } catch (error) {
        this.logger.warn(`Failed to enqueue translation job: ${error.message}, falling back to DeepL`);
        queueSucceeded = false;
      }
    }

    // If queue failed or DeepL is available, process synchronously in background
    // This ensures translations happen even if queue isn't working
    if (!queueSucceeded && this.deepLService && this.deepLService.isAvailable()) {
      this.logger.log(`Processing translations synchronously with DeepL for ${entityType}:${entityId}`);
      // Don't await - let it run in background to not block the response
      this.translateEntity(entityType, entityId).catch((error) => {
        this.logger.error(`Synchronous translation failed for ${entityType}:${entityId}: ${error.message}`);
      });
    } else if (this.deepLService && this.deepLService.isAvailable()) {
      // Queue succeeded, but also process with DeepL as a safety net
      this.logger.log(`DeepL available, processing translations synchronously as safety net for ${entityType}:${entityId}`);
      this.translateEntity(entityType, entityId).catch((error) => {
        this.logger.error(`Synchronous translation failed for ${entityType}:${entityId}: ${error.message}`);
      });
    } else {
      if (!this.deepLService) {
        this.logger.warn(`DeepL service not injected for ${entityType}:${entityId}`);
      } else if (!this.deepLService.isAvailable()) {
        this.logger.warn(`DeepL service not available for ${entityType}:${entityId}`);
      }
      if (!this.translationQueue && !queueSucceeded) {
        // Only use placeholder fallback if queue not available AND DeepL not available
        this.logger.warn('Translation queue not available and DeepL not available, processing with placeholder');
        this.translateEntity(entityType, entityId).catch((error) => {
          this.logger.error(`Placeholder translation failed for ${entityType}:${entityId}: ${error.message}`);
        });
      }
    }
  }

  /**
   * Translate entity to all supported languages
   */
  async translateEntity(entityType: string, entityId: string): Promise<void> {
    const sourceRecord = await this.prisma.entitySource.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (!sourceRecord) {
      this.logger.warn(`No source record found for ${entityType}:${entityId}`);
      return;
    }

    const sourceLang = sourceRecord.sourceLang;
    const targetLangs = this.supportedLangs.filter(lang => lang !== sourceLang);

    // Get all source translations
    const sourceTranslations = await this.prisma.entityTranslation.findMany({
      where: {
        entityType,
        entityId,
        lang: sourceLang,
      },
    });

    for (const sourceTranslation of sourceTranslations) {
      const newHash = sourceTranslation.sourceHash;

      for (const targetLang of targetLangs) {
        // Check if translation already exists and is up to date
        const existingTranslation = await this.prisma.entityTranslation.findUnique({
          where: {
            entityType_entityId_lang_field: {
              entityType,
              entityId,
              lang: targetLang,
              field: sourceTranslation.field,
            },
          },
        });

        if (existingTranslation && existingTranslation.sourceHash === newHash) {
          // Translation is up to date, skip
          continue;
        }

        // Translate the text
        const translatedText = await this.translateText(
          sourceTranslation.text,
          sourceLang,
          targetLang,
        );

        // Save the translation
        await this.prisma.entityTranslation.upsert({
          where: {
            entityType_entityId_lang_field: {
              entityType,
              entityId,
              lang: targetLang,
              field: sourceTranslation.field,
            },
          },
          update: {
            text: translatedText,
            sourceHash: newHash,
            updatedAt: new Date(),
          },
          create: {
            entityType,
            entityId,
            lang: targetLang,
            field: sourceTranslation.field,
            text: translatedText,
            sourceHash: newHash,
            origin: 'machine',
            verified: false,
          },
        });

        this.logger.log(`Translated ${entityType}:${entityId} ${sourceTranslation.field} to ${targetLang}`);
      }
    }
  }

  /**
   * Resolve best available text for a field in a specific language
   */
  async resolveField(
    entityType: string,
    entityId: string,
    field: string,
    lang: string,
  ): Promise<string> {
    // Try target language first
    let translation = await this.prisma.entityTranslation.findUnique({
      where: {
        entityType_entityId_lang_field: {
          entityType,
          entityId,
          lang,
          field,
        },
      },
    });

    if (translation) {
      this.logger.debug(`Found translation for ${entityType}:${entityId} field:${field} lang:${lang}`);
      return translation.text;
    }
    
    this.logger.debug(`No translation found for ${entityType}:${entityId} field:${field} lang:${lang}, trying fallback`);

    // Fallback to source language
    const sourceRecord = await this.prisma.entitySource.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (sourceRecord) {
      translation = await this.prisma.entityTranslation.findUnique({
        where: {
          entityType_entityId_lang_field: {
            entityType,
            entityId,
            lang: sourceRecord.sourceLang,
            field,
          },
        },
      });

      if (translation) {
        return translation.text;
      }
    }

    // Fallback to default language
    if (lang !== this.defaultLang) {
      translation = await this.prisma.entityTranslation.findUnique({
        where: {
          entityType_entityId_lang_field: {
            entityType,
            entityId,
            lang: this.defaultLang,
            field,
          },
        },
      });

      if (translation) {
        return translation.text;
      }
    }

    return '';
  }

  /**
   * Resolve all fields for an entity in a specific language
   * If translations don't exist and DeepL is available, create them on-demand
   */
  async resolveEntity(
    entityType: string,
    entityId: string,
    fields: string[],
    lang: string,
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    let hasMissingTranslations = false;

    // First pass: try to resolve existing translations
    for (const field of fields) {
      const text = await this.resolveField(entityType, entityId, field, lang);
      result[field] = text;
      if (!text && lang !== 'en') {
        hasMissingTranslations = true;
      }
    }

    // If we have missing translations, create them immediately for instant display
    // This ensures translations appear right away when language is changed
    if (hasMissingTranslations && lang !== 'en') {
      this.logger.log(`Missing translations detected for ${entityType}:${entityId} in ${lang}, creating immediately`);
      
      // First, check if source translations exist for all fields - if not, backfill them
      const sourceRecord = await this.prisma.entitySource.findUnique({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
      });

      if (sourceRecord) {
        // Check which source translations are missing
        const existingSourceTranslations = await this.prisma.entityTranslation.findMany({
          where: {
            entityType,
            entityId,
            lang: sourceRecord.sourceLang,
          },
        });
        
        const existingFields = new Set(existingSourceTranslations.map(t => t.field));
        const missingSourceFields = fields.filter(field => !existingFields.has(field));
        
        // If source translations are missing, we need to backfill them from the actual content
        // This happens for older content that was created before content_preview was added
        if (missingSourceFields.length > 0) {
          this.logger.log(`Missing source translations for ${entityType}:${entityId} fields: ${missingSourceFields.join(', ')}, attempting to backfill`);
          
          // Try to fetch the actual content to backfill source translations
          // This is a best-effort attempt - if we can't fetch it, we'll skip those fields
          try {
            let contentData: any = null;
            
            // Map entity types to database queries
            if (entityType === 'elearning' || entityType === 'hr_document' || entityType === 'state_policy') {
              const asset = await this.prisma.asset.findUnique({
                where: { id: entityId },
                select: {
                  title: true,
                  description: true,
                  contentPreview: true,
                },
              });
              
              if (asset) {
                contentData = {
                  title: asset.title || '',
                  description: asset.description || '',
                  content_preview: asset.contentPreview || '',
                };
              }
            }
            
            // Save missing source translations if we have the data
            if (contentData) {
              for (const field of missingSourceFields) {
                // Map translation field names to database field names
                const dbFieldMap: Record<string, string> = {
                  'content_preview': 'content_preview', // Already mapped in contentData
                  'title': 'title',
                  'description': 'description',
                };
                const dbField = dbFieldMap[field] || field;
                const fieldValue = contentData[dbField] || '';
                if (fieldValue && typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
                  const sourceHash = crypto.createHash('sha256').update(fieldValue).digest('hex');
                  await this.prisma.entityTranslation.upsert({
                    where: {
                      entityType_entityId_lang_field: {
                        entityType,
                        entityId,
                        lang: sourceRecord.sourceLang,
                        field,
                      },
                    },
                    update: {
                      text: fieldValue,
                      sourceHash,
                      updatedAt: new Date(),
                    },
                    create: {
                      entityType,
                      entityId,
                      lang: sourceRecord.sourceLang,
                      field,
                      text: fieldValue,
                      sourceHash,
                      origin: 'machine',
                      verified: false,
                    },
                  });
                  this.logger.log(`Backfilled source translation for ${entityType}:${entityId} field:${field}`);
                }
              }
            }
          } catch (backfillError) {
            this.logger.warn(`Failed to backfill source translations for ${entityType}:${entityId}: ${backfillError.message}`);
          }
        }
      }
      
      // Use DeepL directly for instant translations (don't wait for queue)
      if (this.deepLService && this.deepLService.isAvailable()) {
        try {
          // Create translations synchronously so they're available immediately
          await this.translateEntity(entityType, entityId);
          this.logger.log(`Created translations immediately for ${entityType}:${entityId} in ${lang}`);
          
          // Re-resolve translations now that they're created
          for (const field of fields) {
            if (!result[field] || result[field].trim() === '') {
              const translatedText = await this.resolveField(entityType, entityId, field, lang);
              if (translatedText) {
                result[field] = translatedText;
              }
            }
          }
        } catch (error) {
          this.logger.error(`Failed to create translations immediately for ${entityType}:${entityId}: ${error.message}`);
          // Fall back to background processing
          this.translateEntity(entityType, entityId).catch((err) => {
            this.logger.error(`Background translation also failed for ${entityType}:${entityId}: ${err.message}`);
          });
        }
      } else {
        // DeepL not available, try queue as fallback
        if (this.translationQueue) {
          this.translationQueue.add(
            'translate-entity',
            {
              entityType,
              entityId,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            },
          ).catch((error) => {
            this.logger.warn(`Failed to enqueue translation job for ${entityType}:${entityId}: ${error.message}`);
          });
        }
      }
    }

    return result;
  }

  /**
   * Translate text using DeepL if available, otherwise return placeholder
   */
  private async translateText(
    text: string,
    from: string,
    to: string,
  ): Promise<string> {
    // Try to use DeepL if available
    if (this.deepLService && this.deepLService.isAvailable()) {
      try {
        const translated = await this.deepLService.translate(text, from, to);
        this.logger.log(`Translated via DeepL (fallback): ${from} -> ${to}`);
        return translated;
      } catch (error) {
        this.logger.warn(`DeepL translation failed in fallback: ${error.message}`);
        // Fall through to placeholder
      }
    }

    // Fallback placeholder translation
    this.logger.warn(`Using placeholder translation for ${from} -> ${to}. DeepL not available.`);
    const translations: Record<string, Record<string, string>> = {
      'en': {
        'fr': `[FR] ${text}`,
        'de': `[DE] ${text}`,
      },
      'fr': {
        'en': `[EN] ${text}`,
        'de': `[DE] ${text}`,
      },
      'de': {
        'en': `[EN] ${text}`,
        'fr': `[FR] ${text}`,
      },
    };

    return translations[from]?.[to] || text;
  }
}