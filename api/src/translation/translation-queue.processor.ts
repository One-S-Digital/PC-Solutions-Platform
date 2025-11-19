import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
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
export class TranslationQueueProcessor {
  private readonly logger = new Logger(TranslationQueueProcessor.name);
  private readonly supportedLangs = ['en', 'fr', 'de'];

  constructor(
    private deepLService: DeepLService,
    private translationMemory: TranslationMemoryService,
    private costTracking: CostTrackingService,
    private prisma: PrismaService,
  ) {}

  @Process('translate-entity')
  async handleTranslation(job: Job<TranslationJobData>) {
    const { entityType, entityId, sourceLang } = job.data;

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
        this.logger.warn(`No source translations found for ${entityType}:${entityId}`);
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
            // Translation is up to date, skip
            continue;
          }

          try {
            // Check Translation Memory first
            let translatedText = await this.translationMemory.getFromMemory(
              sourceTranslation.text,
              sourceLang,
              targetLang,
            );

            let usedMemory = false;
            if (!translatedText) {
              // Not in memory, call DeepL
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

              // Save to memory for future use
              await this.translationMemory.saveToMemory(
                sourceTranslation.text,
                sourceLang,
                targetLang,
                translatedText,
                'deepl',
              );
            } else {
              usedMemory = true;
              this.logger.log(
                `Used translation memory for ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang})`,
              );
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

