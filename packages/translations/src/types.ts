/**
 * Type definitions for the shared translation package
 */

export type SupportedLanguage = 'en' | 'fr' | 'de';

export type TranslationNamespace = 'common' | 'auth' | 'dashboard' | 'translation';

export interface TranslationConfig {
  supportedLanguages: SupportedLanguage[];
  fallbackLanguage: SupportedLanguage;
  namespaces: TranslationNamespace[];
  defaultNamespace: TranslationNamespace;
}

export interface SwissTerminology {
  [key: string]: {
    fr: string;
    de: string;
  };
}

export interface TranslationKey {
  namespace: TranslationNamespace;
  key: string;
  value: string;
}

export interface TranslationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingKeys: string[];
  unusedKeys: string[];
}

export interface TranslationAuditResult {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  coverage: number;
  hardcodedText: string[];
  unusedKeys: string[];
}