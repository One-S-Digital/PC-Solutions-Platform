import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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
  ) {}

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

    // Enqueue translation job (in production, this would use a job queue)
    this.logger.log(`Enqueuing translation job for ${entityType}:${entityId}`);
    // For now, we'll process translations synchronously
    await this.translateEntity(entityType, entityId);
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
      return translation.text;
    }

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
   */
  async resolveEntity(
    entityType: string,
    entityId: string,
    fields: string[],
    lang: string,
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const field of fields) {
      result[field] = await this.resolveField(entityType, entityId, field, lang);
    }

    return result;
  }

  /**
   * Simple translation implementation
   * In production, this would integrate with DeepL, Google Translate, etc.
   */
  private async translateText(
    text: string,
    from: string,
    to: string,
  ): Promise<string> {
    // For now, return a placeholder translation
    // In production, this would call the actual translation service
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