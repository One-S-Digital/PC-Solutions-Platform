import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeepLService implements OnModuleInit {
  private readonly logger = new Logger(DeepLService.name);
  private translator: any | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('DEEPL_API_KEY');
    this.logger.log(`DeepL initialization starting. API key present: ${!!apiKey}`);
    if (apiKey) {
      try {
        this.initializationPromise = this.initializeTranslator(apiKey);
        await this.initializationPromise;
      } catch (error) {
        // Don't throw - allow app to start even if DeepL fails
        this.logger.error(`DeepL initialization failed, but continuing without it: ${error.message}`);
        this.translator = null;
      }
    } else {
      this.logger.warn('DeepL API key not configured. Machine translation will not be available.');
    }
  }

  private async initializeTranslator(apiKey: string): Promise<void> {
    try {
      this.logger.log('Attempting to import deepl-node package...');
      // Dynamic import to allow code to work even if package isn't installed yet
      const deepl = await import('deepl-node');
      this.logger.log('deepl-node package imported successfully');
      
      this.logger.log('Creating DeepL Translator instance...');
      this.translator = new deepl.Translator(apiKey);
      
      // Test the translator with a simple translation to verify it works
      this.logger.log('Testing DeepL translator with a simple translation...');
      try {
        const testResult = await this.translator.translateText('Hello', 'EN', 'FR');
        this.logger.log(`DeepL translator initialized successfully. Test translation: "Hello" -> "${testResult.text}"`);
      } catch (testError) {
        this.logger.error(`DeepL translator created but test translation failed: ${testError.message}`);
        throw testError;
      }
    } catch (error) {
      this.logger.error(`Failed to initialize DeepL translator: ${error.message}. Stack: ${error.stack}`);
      this.logger.error('This could be due to: 1) deepl-node package not installed, 2) Invalid API key, 3) Network issues');
      this.translator = null;
      throw error; // Re-throw to make initialization failure explicit
    }
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    // Wait for initialization if it's still in progress
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.translator) {
      // Fallback: return original text if DeepL not available
      this.logger.warn('DeepL translator not initialized. Returning original text.');
      return this.placeholderTranslation(text, sourceLang, targetLang);
    }

    try {
      // Map our language codes to DeepL codes
      const sourceLangCode = this.mapToDeepLCode(sourceLang, true); // true = is source
      const targetLangCode = this.mapToDeepLCode(targetLang, false); // false = is target

      if (!sourceLangCode || !targetLangCode) {
        throw new Error(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
      }

      const result = await this.translator.translateText(
        text,
        sourceLangCode,
        targetLangCode,
      );

      return result.text;
    } catch (error) {
      this.logger.error(`DeepL translation failed: ${error.message}`, error.stack);
      // Fallback to placeholder on error
      return this.placeholderTranslation(text, sourceLang, targetLang);
    }
  }

  async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string,
  ): Promise<string[]> {
    // Wait for initialization if it's still in progress
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.translator) {
      return texts.map((text) => this.placeholderTranslation(text, sourceLang, targetLang));
    }

    try {
      const sourceLangCode = this.mapToDeepLCode(sourceLang, true); // true = is source
      const targetLangCode = this.mapToDeepLCode(targetLang, false); // false = is target

      if (!sourceLangCode || !targetLangCode) {
        throw new Error(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
      }

      const results = await this.translator.translateText(
        texts,
        sourceLangCode,
        targetLangCode,
      );

      return results.map((r: any) => r.text);
    } catch (error) {
      this.logger.error(`DeepL batch translation failed: ${error.message}`, error.stack);
      return texts.map((text) => this.placeholderTranslation(text, sourceLang, targetLang));
    }
  }

  /**
   * Map our language codes to DeepL codes
   * Note: DeepL uses 'EN' for source language, not 'EN-GB' or 'EN-US'
   * Regional variants (EN-GB, EN-US) can only be used as target languages
   */
  private mapToDeepLCode(lang: string, isSource: boolean = true): string | null {
    if (lang === 'en') {
      // For source language, use 'EN'. For target, we could use 'EN-GB' or 'EN-US'
      return isSource ? 'EN' : 'EN-GB'; // Using EN-GB for target (British English)
    }
    const mapping: Record<string, string> = {
      fr: 'FR',
      de: 'DE',
    };
    return mapping[lang] || null;
  }

  /**
   * Placeholder translation for when DeepL is not available
   * Returns the original text without modification (no prefix)
   */
  private placeholderTranslation(text: string, from: string, to: string): string {
    // Return original text - no prefix added
    // This allows users to see what needs translation without confusing prefixes
    return text;
  }

  /**
   * Check if DeepL is properly configured
   * Note: This may return false if initialization is still in progress
   */
  isAvailable(): boolean {
    return this.translator !== null;
  }

  /**
   * Wait for DeepL to be initialized and check availability
   */
  async waitForInitialization(): Promise<boolean> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.translator !== null;
  }
}

