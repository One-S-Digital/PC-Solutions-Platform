import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface MTProvider {
  translate(params: { text: string; from: string; to: string }): Promise<string>;
  detect?(text: string): Promise<{ lang: string; confidence: number }>;
}

export interface TranslationJob {
  entityType: string;
  entityId: string;
  priority?: number;
  retryCount?: number;
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
  private readonly jobQueue: TranslationJob[] = [];
  private readonly maxRetries = 3;
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Start the job processor
    this.startJobProcessor();
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

    // Enqueue translation job (asynchronous)
    this.logger.log(`Enqueuing translation job for ${entityType}:${entityId}`);
    this.enqueueTranslationJob({ entityType, entityId });
  }

  /**
   * Enqueue translation job for asynchronous processing
   */
  private enqueueTranslationJob({ entityType, entityId }: { entityType: string; entityId: string }): void {
    // In production, this would use a proper job queue like BullMQ
    // For now, we'll process it with a small delay to simulate async behavior
    setTimeout(async () => {
      try {
        await this.translateEntity(entityType, entityId);
        this.logger.log(`Translation job completed for ${entityType}:${entityId}`);
      } catch (error) {
        this.logger.error(`Translation job failed for ${entityType}:${entityId}:`, error);
      }
    }, 1000); // 1 second delay to simulate async processing
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
   * Translation implementation with proper MT adapter
   * In production, this would integrate with DeepL, Google Translate, etc.
   */
  private async translateText(
    text: string,
    from: string,
    to: string,
  ): Promise<string> {
    // For now, return a proper translation placeholder
    // In production, this would call the actual translation service
    // Simple translation mappings for common terms
    const commonTranslations: Record<string, Record<string, string>> = {
      'en': {
        'fr': {
          'Save': 'Enregistrer',
          'Cancel': 'Annuler',
          'Delete': 'Supprimer',
          'Edit': 'Modifier',
          'Add': 'Ajouter',
          'Remove': 'Supprimer',
          'Submit': 'Soumettre',
          'Loading': 'Chargement',
          'Error': 'Erreur',
          'Success': 'Succès',
          'Welcome': 'Bienvenue',
          'Dashboard': 'Tableau de bord',
          'Settings': 'Paramètres',
          'Profile': 'Profil',
          'Logout': 'Déconnexion',
        },
        'de': {
          'Save': 'Speichern',
          'Cancel': 'Abbrechen',
          'Delete': 'Löschen',
          'Edit': 'Bearbeiten',
          'Add': 'Hinzufügen',
          'Remove': 'Entfernen',
          'Submit': 'Absenden',
          'Loading': 'Laden',
          'Error': 'Fehler',
          'Success': 'Erfolg',
          'Welcome': 'Willkommen',
          'Dashboard': 'Dashboard',
          'Settings': 'Einstellungen',
          'Profile': 'Profil',
          'Logout': 'Abmelden',
        },
      },
      'fr': {
        'en': {
          'Enregistrer': 'Save',
          'Annuler': 'Cancel',
          'Supprimer': 'Delete',
          'Modifier': 'Edit',
          'Ajouter': 'Add',
          'Soumettre': 'Submit',
          'Chargement': 'Loading',
          'Erreur': 'Error',
          'Succès': 'Success',
          'Bienvenue': 'Welcome',
          'Tableau de bord': 'Dashboard',
          'Paramètres': 'Settings',
          'Profil': 'Profile',
          'Déconnexion': 'Logout',
        },
        'de': {
          'Enregistrer': 'Speichern',
          'Annuler': 'Abbrechen',
          'Supprimer': 'Löschen',
          'Modifier': 'Bearbeiten',
          'Ajouter': 'Hinzufügen',
          'Soumettre': 'Absenden',
          'Chargement': 'Laden',
          'Erreur': 'Fehler',
          'Succès': 'Erfolg',
          'Bienvenue': 'Willkommen',
          'Tableau de bord': 'Dashboard',
          'Paramètres': 'Einstellungen',
          'Profil': 'Profil',
          'Déconnexion': 'Abmelden',
        },
      },
      'de': {
        'en': {
          'Speichern': 'Save',
          'Abbrechen': 'Cancel',
          'Löschen': 'Delete',
          'Bearbeiten': 'Edit',
          'Hinzufügen': 'Add',
          'Entfernen': 'Remove',
          'Absenden': 'Submit',
          'Laden': 'Loading',
          'Fehler': 'Error',
          'Erfolg': 'Success',
          'Willkommen': 'Welcome',
          'Dashboard': 'Dashboard',
          'Einstellungen': 'Settings',
          'Profil': 'Profile',
          'Abmelden': 'Logout',
        },
        'fr': {
          'Speichern': 'Enregistrer',
          'Abbrechen': 'Annuler',
          'Löschen': 'Supprimer',
          'Bearbeiten': 'Modifier',
          'Hinzufügen': 'Ajouter',
          'Entfernen': 'Supprimer',
          'Absenden': 'Soumettre',
          'Laden': 'Chargement',
          'Fehler': 'Erreur',
          'Erfolg': 'Succès',
          'Willkommen': 'Bienvenue',
          'Dashboard': 'Tableau de bord',
          'Einstellungen': 'Paramètres',
          'Profil': 'Profil',
          'Abmelden': 'Déconnexion',
        },
      },
    };

    const languageTranslations = commonTranslations[from]?.[to];
    if (languageTranslations && languageTranslations[text]) {
      return languageTranslations[text];
    }

    // If no specific translation found, return the original text
    // In production, this would call the actual MT service
    return text;
  }

  /**
   * Enqueue a translation job
   */
  private enqueueTranslationJob(job: TranslationJob): void {
    this.jobQueue.push(job);
    this.logger.log(`Translation job queued: ${job.entityType}:${job.entityId}`);
  }

  /**
   * Start the job processor
   */
  private startJobProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.jobQueue.length > 0) {
        await this.processNextJob();
      }
    }, 1000); // Process jobs every second
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    if (this.jobQueue.length === 0) return;

    this.isProcessing = true;
    const job = this.jobQueue.shift();

    if (!job) {
      this.isProcessing = false;
      return;
    }

    try {
      this.logger.log(`Processing translation job: ${job.entityType}:${job.entityId}`);
      await this.translateEntity(job.entityType, job.entityId);
      this.logger.log(`Translation job completed: ${job.entityType}:${job.entityId}`);
    } catch (error) {
      this.logger.error(`Translation job failed: ${job.entityType}:${job.entityId}`, error);
      
      // Retry logic
      if ((job.retryCount || 0) < this.maxRetries) {
        job.retryCount = (job.retryCount || 0) + 1;
        this.jobQueue.unshift(job); // Put back at front of queue
        this.logger.log(`Retrying translation job (${job.retryCount}/${this.maxRetries}): ${job.entityType}:${job.entityId}`);
      } else {
        this.logger.error(`Translation job permanently failed after ${this.maxRetries} retries: ${job.entityType}:${job.entityId}`);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}