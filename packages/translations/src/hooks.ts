/**
 * React hooks for the shared translation package
 */

import { useTranslation as useI18nTranslation } from 'react-i18next';
import { SupportedLanguage, TranslationNamespace } from './types';
import { translateWithSwissTerminology } from './utils';

/**
 * Enhanced useTranslation hook with Swiss terminology support
 */
export function useTranslation(namespace?: TranslationNamespace) {
  console.log('🔧 [DEBUG] @workspace/translations useTranslation called with namespace:', namespace);
  try {
    const { t, i18n, ready } = useI18nTranslation(namespace);
    console.log('🔧 [DEBUG] @workspace/translations useI18nTranslation result:', { t: typeof t, i18n: !!i18n, ready });
    console.log('🔧 [DEBUG] @workspace/translations i18n.isInitialized:', i18n?.isInitialized);
    console.log('🔧 [DEBUG] @workspace/translations i18n.language:', i18n?.language);
  
  const currentLanguage = i18n.language as SupportedLanguage;
  
  // Enhanced translation function with Swiss terminology
  const translate = (key: string, options?: any): string => {
    const translation = t(key, options);
    
    // Ensure translation is a string
    const translationStr = typeof translation === 'string' ? translation : String(translation);
    
    // Apply Swiss terminology if not already translated
    if (currentLanguage !== 'en' && translationStr === key) {
      return translateWithSwissTerminology(translationStr, currentLanguage);
    }
    
    return translationStr;
  };
  
  // Swiss terminology translation function
  const translateSwiss = (text: string): string => {
    return translateWithSwissTerminology(text, currentLanguage);
  };
  
    console.log('✅ [DEBUG] @workspace/translations useTranslation returning successfully');
    return {
      t: translate,
      translateSwiss,
      i18n,
      ready,
      currentLanguage
    };
  } catch (error) {
    console.error('❌ [DEBUG] @workspace/translations useTranslation error:', error);
    throw error;
  }
}

/**
 * Hook for getting Swiss terminology translations
 */
export function useSwissTerminology() {
  const { currentLanguage } = useTranslation();
  
  return (text: string) => translateWithSwissTerminology(text, currentLanguage);
}

/**
 * Hook for translation validation
 */
export function useTranslationValidation() {
  const { i18n } = useTranslation();
  
  const validateNamespace = (namespace: TranslationNamespace) => {
    const translations = i18n.getResourceBundle(i18n.language, namespace);
    // Implementation would depend on validation requirements
    return {
      isValid: true,
      errors: [],
      warnings: [],
      missingKeys: [],
      unusedKeys: []
    };
  };
  
  return {
    validateNamespace
  };
}