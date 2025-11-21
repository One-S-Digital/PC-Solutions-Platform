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
                this.logger.warn(
                  `DeepL returned source text for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}). Not saving to memory.`,
                );
              }
            } else {
              usedMemory = true;
              this.logger.log(
                `Used translation memory for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang})`,
              );
            }

            // If DeepL returned source text, it means the text is likely untranslatable (e.g., identifiers like "Test30")
            // Save it anyway with source text so we have a record that we tried, preventing infinite retry loops
            if (translatedText === sourceTranslation.text && sourceLang !== targetLang) {
              this.logger.warn(
                `DeepL returned source text for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang}). Text appears untranslatable (e.g., identifier). Saving with source text to prevent retry loop.`,
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
}

