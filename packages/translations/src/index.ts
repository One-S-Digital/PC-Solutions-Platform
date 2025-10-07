/**
 * Shared Translation Package
 * 
 * This package provides common Swiss terminology and translations
 * that can be shared across frontend and admin platforms.
 */

export * from './types';
export * from './utils';
export * from './hooks';
export * from './constants';

// Re-export i18next utilities
export { useTranslation } from 'react-i18next';
export type { UseTranslationResponse } from 'react-i18next';