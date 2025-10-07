/**
 * Utility functions for the shared translation package
 */

import { SupportedLanguage, SwissTerminology, TranslationValidationResult } from './types';
import { SWISS_TERMINOLOGY } from './constants';

/**
 * Get Swiss terminology translation for a given text and language
 */
export function getSwissTerminology(text: string, language: SupportedLanguage): string | null {
  if (language === 'en') return text;
  
  const terminology = SWISS_TERMINOLOGY[text];
  if (!terminology) return null;
  
  return terminology[language] || null;
}

/**
 * Translate text using Swiss terminology with fallback
 */
export function translateWithSwissTerminology(
  text: string, 
  language: SupportedLanguage
): string {
  if (language === 'en') return text;
  
  const swissTranslation = getSwissTerminology(text, language);
  if (swissTranslation) return swissTranslation;
  
  // If no Swiss terminology found, return original text
  return text;
}

/**
 * Validate translation completeness
 */
export function validateTranslations(
  translations: Record<string, any>,
  language: SupportedLanguage,
  requiredKeys: string[] = []
): TranslationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingKeys: string[] = [];
  const unusedKeys: string[] = [];
  
  // Check for missing required keys
  for (const key of requiredKeys) {
    if (!translations[key]) {
      missingKeys.push(key);
      errors.push(`Missing required key: ${key}`);
    }
  }
  
  // Check for untranslated keys (containing English text)
  const englishPattern = /^[A-Z][a-z\s]+$/;
  for (const [key, value] of Object.entries(translations)) {
    if (typeof value === 'string' && englishPattern.test(value)) {
      warnings.push(`Key "${key}" appears to be untranslated: "${value}"`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingKeys,
    unusedKeys
  };
}

/**
 * Extract translation keys from nested object
 */
export function extractTranslationKeys(
  obj: Record<string, any>,
  prefix: string = ''
): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      keys.push(...extractTranslationKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get translation coverage percentage
 */
export function getTranslationCoverage(
  totalKeys: number,
  translatedKeys: number
): number {
  if (totalKeys === 0) return 100;
  return Math.round((translatedKeys / totalKeys) * 100);
}

/**
 * Format translation key for display
 */
export function formatTranslationKey(key: string): string {
  return key.replace(/\./g, ' → ');
}

/**
 * Check if a text appears to be hardcoded (not using translation keys)
 */
export function isHardcodedText(text: string): boolean {
  // Common patterns that suggest hardcoded text
  const hardcodedPatterns = [
    /^[A-Z][a-z\s]+$/, // Title case words
    /^[a-z]+[A-Z]/, // camelCase
    /^[a-z_]+$/, // snake_case
    /^[A-Z_]+$/, // SCREAMING_SNAKE_CASE
  ];
  
  return hardcodedPatterns.some(pattern => pattern.test(text));
}

/**
 * Generate translation key from text
 */
export function generateTranslationKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}