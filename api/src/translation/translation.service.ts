import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { DeepLService } from './deepl.service';
import { DEFAULT_LANGUAGE } from './translation.config';

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
  private readonly defaultLang = DEFAULT_LANGUAGE;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @InjectQueue('translation') private translationQueue?: Queue,
    @Optional() private deepLService?: DeepLService,
  ) {
    if (this.translationQueue) {
      this.logger.log('Translation queue injected successfully');
    } else {
      this.logger.error('Translation queue NOT injected - translations will NOT be processed! Check Redis connection and queue module setup.');
    }
    
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
      return { text, lang: this.defaultLang, confidence: 0 };
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

    const counts = { fr: frenchCount, de: germanCount, en: englishCount };
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [winnerLang, winnerCount] = sorted[0];

    if (winnerCount === 0) {
      this.logger.warn('Language detection low confidence, defaulting to en');
      return { text, lang: this.defaultLang, confidence: 0 };
    }

    return { text, lang: winnerLang, confidence: Math.min(winnerCount / 10, 0.9) };
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
            origin: 'human',
            verified: false,
          },
        });
      }
    }

    // Try to enqueue async translation job, but fall back to synchronous translation if queue fails/missing
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

    if (!queueSucceeded) {
      this.logger.error(`Failed to enqueue translation for ${entityType}:${entityId} - attempting inline translation fallback`);
      if (this.deepLService?.isAvailable()) {
        try {
          await this.translateEntity(entityType, entityId);
        } catch (inlineError) {
          this.logger.error(`Inline translation fallback failed for ${entityType}:${entityId}: ${inlineError.message}`);
        }
      } else {
        this.logger.error(`DeepL unavailable; translations for ${entityType}:${entityId} will remain pending until queue is restored`);
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

    this.logger.debug(`translateEntity: Found ${sourceTranslations.length} source translations for ${entityType}:${entityId} in ${sourceLang}`);
    if (sourceTranslations.length === 0) {
      this.logger.warn(`translateEntity: No source translations found for ${entityType}:${entityId} in ${sourceLang}, cannot translate`);
      return;
    }

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
          // Check if the translation text is actually different from the source text
          // If they're the same, it means the translation was saved incorrectly and needs to be fixed
          if (existingTranslation.text !== sourceTranslation.text) {
            // Translation is up to date and correct, skip
          continue;
          } else {
            // Translation text matches source text - this is wrong, force re-translation
            this.logger.warn(`Translation text matches source text for ${entityType}:${entityId} ${sourceTranslation.field} ${targetLang}, forcing re-translation`);
          }
        }

        // Translate the text
        const translatedText = await this.translateText(
          sourceTranslation.text,
          sourceLang,
          targetLang,
        );

        this.logger.debug(`Translation result for ${entityType}:${entityId} ${sourceTranslation.field} ${sourceLang}->${targetLang}: "${sourceTranslation.text.substring(0, 50)}..." -> "${translatedText.substring(0, 50)}..."`);

        // Don't save if translation is the same as source (indicates translation failed)
        if (translatedText === sourceTranslation.text && sourceLang !== targetLang) {
          this.logger.warn(`Translation result matches source text for ${entityType}:${entityId} ${sourceTranslation.field} ${sourceLang}->${targetLang}. This indicates translation failed. Skipping save.`);
          continue; // Skip saving this translation
        }

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
      this.logger.debug(`Found translation for ${entityType}:${entityId} field:${field} lang:${lang}: "${translation.text.substring(0, 50)}${translation.text.length > 50 ? '...' : ''}"`);
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
    // Also check if translations are incorrect (text matches source)
    let hasIncorrectTranslations = false;
    const sourceRecord = await this.prisma.entitySource.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    for (const field of fields) {
      const text = await this.resolveField(entityType, entityId, field, lang);
      result[field] = text;
      
      // Detect missing translations for ALL languages, including English
      // This ensures English translations are created for German/French sources, etc.
      if (!text) {
          // Provide best-effort fallback to avoid blank UI
          if (sourceRecord) {
            const sourceTranslation = await this.prisma.entityTranslation.findUnique({
              where: {
                entityType_entityId_lang_field: {
                  entityType,
                  entityId,
                  lang: sourceRecord.sourceLang,
                  field,
                },
              },
            });
            if (sourceTranslation) {
              result[field] = sourceTranslation.text;
            } else if (this.defaultLang !== lang) {
              const defaultTranslation = await this.prisma.entityTranslation.findUnique({
                where: {
                  entityType_entityId_lang_field: {
                    entityType,
                    entityId,
                    lang: this.defaultLang,
                    field,
                  },
                },
              });
              if (defaultTranslation) {
                result[field] = defaultTranslation.text;
              }
            }
          }
          hasMissingTranslations = true;
      } else if (text && sourceRecord) {
        // Check if translation text matches source text (which means it's wrong)
        const sourceTranslation = await this.prisma.entityTranslation.findUnique({
          where: {
            entityType_entityId_lang_field: {
              entityType,
              entityId,
              lang: sourceRecord.sourceLang,
              field,
            },
          },
        });
        
        if (sourceTranslation && text === sourceTranslation.text) {
          // Translation text matches source text - this could mean:
          // 1. DeepL already tried and returned source text (untranslatable, e.g., "Test30")
          // 2. Translation was saved incorrectly
          // Check if we've already attempted translation by checking if translation record exists
          const existingTranslation = await this.prisma.entityTranslation.findUnique({
            where: {
              entityType_entityId_lang_field: {
                entityType,
                entityId,
                lang,
                field,
              },
            },
          });
          
          // If translation record exists with source text, it means DeepL already tried and failed
          // Don't queue again - treat as "untranslatable" and let frontend use source text
          if (existingTranslation && existingTranslation.text === sourceTranslation.text) {
            this.logger.debug(`Translation for ${entityType}:${entityId} ${field} ${lang} appears untranslatable (DeepL returned source text). Not queuing for retry.`);
            // Use source text so UI is not blank while avoiding re-queue
            result[field] = sourceTranslation.text;
            // Don't set hasMissingTranslations or hasIncorrectTranslations - we've already tried
          } else {
            // Translation doesn't exist yet or is different - queue for translation
            this.logger.warn(`Incorrect translation detected for ${entityType}:${entityId} ${field} ${lang}: translation text matches source text, clearing and queuing for background fix`);
            hasIncorrectTranslations = true;
            result[field] = sourceTranslation.text;
            hasMissingTranslations = true;
          }
        }
      }
    }
    
    // Queue incorrect translations for background fix (non-blocking)
    if (hasIncorrectTranslations) {
      if (!this.translationQueue) {
        this.logger.error(`Translation queue not available for fixing ${entityType}:${entityId} - incorrect translations will NOT be fixed!`);
      } else {
        try {
          const jobPromise = this.translationQueue.add(
            'translate-entity',
            { entityType, entityId },
            { removeOnComplete: true, removeOnFail: false }
          );
          
          jobPromise.then((job) => {
            this.logger.log(`✅ Successfully queued translation fix job ${job.id} for ${entityType}:${entityId}`);
          }).catch((error) => {
            this.logger.error(`❌ Failed to queue translation fix for ${entityType}:${entityId}: ${error.message}`, error.stack);
          });
        } catch (error) {
          this.logger.error(`❌ Exception while queuing translation fix for ${entityType}:${entityId}: ${error.message}`, error.stack);
        }
      }
    }

    // According to plan: resolveEntity should ONLY return existing translations
    // Missing translations should be queued for background processing (non-blocking)
    // This ensures API responses are fast and translations happen async via queue
    // Always queue translations for missing languages, regardless of target language
    // This ensures English translations are created for German/French sources, etc.
    if (hasMissingTranslations) {
      this.logger.log(`Missing translations detected for ${entityType}:${entityId} in ${lang}, queuing for background processing`);
      
      // Queue translation job for background processing (non-blocking)
      if (!this.translationQueue) {
        this.logger.error(`Translation queue not available for ${entityType}:${entityId} - attempting inline translation fallback`);
        if (this.deepLService?.isAvailable()) {
          try {
            await this.translateEntity(entityType, entityId);
          } catch (inlineError) {
            this.logger.error(`Inline translation fallback failed for ${entityType}:${entityId}: ${inlineError.message}`);
          }
        }
        return result;
      }
      
      // Log that we're attempting to queue
      this.logger.debug(`Attempting to queue translation job for ${entityType}:${entityId}`);
      
      try {
        const jobPromise = this.translationQueue.add(
          'translate-entity',
          { entityType, entityId },
          { 
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          }
        );
        
        // Handle both promise resolution and errors
        jobPromise
          .then((job) => {
            this.logger.log(`✅ Successfully queued translation job ${job?.id || 'unknown'} for ${entityType}:${entityId}`);
          })
          .catch((error) => {
            this.logger.error(`❌ Failed to queue translation for ${entityType}:${entityId}: ${error?.message || String(error)}`, error?.stack);
          });
          
        // Also check if it's already rejected synchronously
        if (jobPromise && typeof (jobPromise as any).catch === 'function') {
          // Promise exists, will be handled by .then/.catch above
        }
      } catch (error) {
        this.logger.error(`❌ Exception while queuing translation for ${entityType}:${entityId}: ${error?.message || String(error)}`, error?.stack);
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
    this.logger.warn(`Using placeholder translation (returning source text) for ${from} -> ${to}. DeepL not available.`);
    return text;
  }
}