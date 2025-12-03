import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { DeepLService } from './deepl.service';
import { TranslationMemoryService } from './translation-memory.service';
import { CostTrackingService } from './cost-tracking.service';
import { PrismaService } from '../prisma/prisma.service';

interface TranslationJobData {
  entityType: string;
  entityId: string;
  sourceLang: string;
}

@Processor('translation')
export class TranslationQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(TranslationQueueProcessor.name);
  private readonly supportedLangs = ['en', 'fr', 'de'];

  constructor(
    private deepLService: DeepLService,
    private translationMemory: TranslationMemoryService,
    private costTracking: CostTrackingService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('TranslationQueueProcessor initialized and ready to process jobs');
    this.logger.log(`DeepL available: ${this.deepLService.isAvailable()}`);
    this.logger.log(`Supported languages: ${this.supportedLangs.join(', ')}`);
    
    // Test Redis connection by checking if we can access the queue
    try {
      // This will be available through BullModule injection if needed
      this.logger.log('TranslationQueueProcessor ready to process jobs from Redis queue');
    } catch (error) {
      this.logger.error(`Failed to initialize TranslationQueueProcessor: ${error.message}`, error.stack);
    }
  }

  @Process('translate-entity')
  async handleTranslation(job: Job<TranslationJobData>) {
    const { entityType, entityId, sourceLang: jobSourceLang } = job.data;

    // Get source language from EntitySource if not provided in job data
    let sourceLang = jobSourceLang;
    if (!sourceLang) {
      const sourceRecord = await this.prisma.entitySource.findUnique({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
      });
      
      if (!sourceRecord) {
        this.logger.warn(`No source record found for ${entityType}:${entityId}, cannot translate`);
        return;
      }
      
      sourceLang = sourceRecord.sourceLang;
    }

    this.logger.log(
      `Processing translation job for ${entityType}:${entityId} (source: ${sourceLang})`,
    );

    try {
      // Get source translations
      const sourceTranslations = await this.prisma.entityTranslation.findMany({
        where: {
          entityType,
          entityId,
          lang: sourceLang,
        },
      });

      if (sourceTranslations.length === 0) {
        this.logger.warn(`No source translations found for ${entityType}:${entityId} in ${sourceLang}`);
        return;
      }

      // Get target languages
      const targetLangs = this.supportedLangs.filter((lang) => lang !== sourceLang);

      // Process each field for each target language
      for (const sourceTranslation of sourceTranslations) {
        const newHash = sourceTranslation.sourceHash;

        for (const targetLang of targetLangs) {
          // Check if translation already exists and is up to date
          const existing = await this.prisma.entityTranslation.findUnique({
            where: {
              entityType_entityId_lang_field: {
                entityType,
                entityId,
                lang: targetLang,
                field: sourceTranslation.field,
              },
            },
          });

          if (existing && existing.sourceHash === newHash) {
            // Check if translation text matches source text (which means it's incorrect)
            if (existing.text !== sourceTranslation.text) {
              // Translation is up to date and correct, skip
              continue;
            } else {
              // Translation text matches source text - this is incorrect, force re-translation
              this.logger.warn(
                `Incorrect translation detected for ${entityType}:${entityId} ${sourceTranslation.field} ${targetLang}: translation text matches source text, forcing re-translation`,
              );
            }
          }

          try {
            // Check Translation Memory first
            let translatedText = await this.translationMemory.getFromMemory(
              sourceTranslation.text,
              sourceLang,
              targetLang,
            );

            let usedMemory = false;
            
            // If memory returned a result, validate it (should not equal source text)
            if (translatedText && translatedText === sourceTranslation.text && sourceLang !== targetLang) {
              // Bad translation in memory - delete it and get fresh translation
              this.logger.warn(
                `Bad translation found in memory for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}): translation matches source. Deleting from memory and getting fresh translation.`,
              );
              await this.translationMemory.deleteFromMemory(
                sourceTranslation.text,
                sourceLang,
                targetLang,
              );
              translatedText = null; // Force fresh translation from DeepL
            }

            if (!translatedText) {
              // Not in memory or bad translation, call DeepL
              if (!this.deepLService.isAvailable()) {
                this.logger.warn(
                  `DeepL not available, skipping translation for ${entityType}:${entityId} ${sourceTranslation.field}`,
                );
                continue;
              }

              // Pre-check if text appears untranslatable before calling DeepL
              const isUntranslatable = this.isLikelyUntranslatable(sourceTranslation.text);
              if (isUntranslatable) {
                this.logger.debug(
                  `Skipping DeepL call for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}): text appears untranslatable. Text: "${sourceTranslation.text.substring(0, 50)}${sourceTranslation.text.length > 50 ? '...' : ''}"`,
                );
                // Use source text directly - don't waste API calls
                translatedText = sourceTranslation.text;
              } else {
                // Call DeepL
                this.logger.debug(
                  `Calling DeepL for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}). Text: "${sourceTranslation.text.substring(0, 50)}${sourceTranslation.text.length > 50 ? '...' : ''}"`,
                );
                
                translatedText = await this.deepLService.translate(
                  sourceTranslation.text,
                  sourceLang,
                  targetLang,
                );

                // Track cost
                await this.costTracking.trackUsage(
                  'deepl',
                  sourceLang,
                  targetLang,
                  sourceTranslation.text.length,
                );

                // Log if DeepL returned source text (unexpected for translatable content)
                if (translatedText === sourceTranslation.text && sourceLang !== targetLang && !isUntranslatable) {
                  this.logger.warn(
                    `DeepL returned source text for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}). Original text: "${sourceTranslation.text}". This may indicate: 1) Text is an identifier/proper noun, 2) Text is already in target language, 3) Text is too short/ambiguous.`,
                  );
                }
              }

              // Only save to memory if translation is valid (different from source)
              if (translatedText !== sourceTranslation.text || sourceLang === targetLang) {
                await this.translationMemory.saveToMemory(
                  sourceTranslation.text,
                  sourceLang,
                  targetLang,
                  translatedText,
                  'deepl',
                );
              } else {
                this.logger.debug(
                  `Not saving to memory: DeepL returned source text for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang})`,
                );
              }
            } else {
              usedMemory = true;
              this.logger.log(
                `Used translation memory for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang})`,
              );
            }

            // If translation equals source text, it means the text is likely untranslatable
            // Save it anyway with source text so we have a record that we tried, preventing infinite retry loops
            if (translatedText === sourceTranslation.text && sourceLang !== targetLang) {
              const reason = this.isLikelyUntranslatable(sourceTranslation.text) 
                ? 'Text appears untranslatable (identifier/proper noun/technical term)'
                : 'DeepL returned source text (may be already in target language or ambiguous)';
              
              this.logger.debug(
                `Saving untranslatable text for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}). Reason: ${reason}. Text: "${sourceTranslation.text.substring(0, 50)}${sourceTranslation.text.length > 50 ? '...' : ''}"`,
              );
              // Save with source text - this marks it as "attempted but untranslatable"
              // The resolveEntity method will check for this and not queue new jobs
            }

            // Save translation with status
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
                status: 'MT_DONE',
                updatedAt: new Date(),
                translatedAt: new Date(),
                origin: 'machine',
                mtProvider: 'deepl',
              },
              create: {
                entityType,
                entityId,
                lang: targetLang,
                field: sourceTranslation.field,
                text: translatedText,
                sourceHash: newHash,
                status: 'MT_DONE',
                origin: 'machine',
                verified: false,
                mtProvider: 'deepl',
                translatedAt: new Date(),
              },
            });

            this.logger.log(
              `Translated ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}) ${usedMemory ? '[from memory]' : '[via DeepL]'}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to translate ${entityType}:${entityId} ${sourceTranslation.field} to ${targetLang}: ${error.message}`,
            );
            // Continue with other translations
          }
        }
      }

      this.logger.log(`Completed translation job for ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error(
        `Translation job failed for ${entityType}:${entityId}: ${error.message}`,
        error.stack,
      );
      throw error; // Will trigger retry
    }
  }

  /**
   * Check if text is likely untranslatable (identifiers, proper nouns, technical terms)
   * This helps avoid unnecessary DeepL API calls
   */
  private isLikelyUntranslatable(text: string): boolean {
    if (!text || text.trim().length === 0) return true;

    const trimmed = text.trim();
    const length = trimmed.length;

    // Very short text (single character identifiers)
    if (length <= 1) return true;

    // Only numbers or alphanumeric codes (e.g., "Test30", "HR-DOC-001", "ABC123")
    if (/^[A-Za-z0-9\-_]+$/.test(trimmed)) {
      // Must have numbers, underscores, or multiple caps to be considered an identifier
      if (/\d/.test(trimmed) || /_/.test(trimmed) || (/[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase())) {
        return true;
      }
    }

    // Single word that's all caps (likely a short acronym or constant)
    if (trimmed.split(/\s+/).length === 1 && trimmed === trimmed.toUpperCase() && length < 5) {
      return true;
    }

    // Contains only numbers, dashes, and single letters (e.g., "A-1", "B-2")
    if (/^[A-Z]?[\d\-]+[A-Z]?$/i.test(trimmed)) {
      return true;
    }

    // File extensions or technical identifiers
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|svg|zip|rar)$/i.test(trimmed)) {
      return true;
    }

    return false;
  }
}

