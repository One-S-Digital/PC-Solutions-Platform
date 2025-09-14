/**
 * Field Registry - Defines which fields are translatable for each entity type
 * This follows the i18n specification for dynamic content translation
 */
export const FIELDS_BY_ENTITY: Record<string, string[]> = {
  // User profile fields
  user: ['display_name', 'bio'],
  
  // Organization fields
  organization: ['name', 'description', 'about'],
  
  // Service provider fields
  service_provider: ['name', 'about', 'services'],
  
  // Product fields
  product: ['title', 'subtitle', 'short_desc', 'long_desc', 'features'],
  
  // Service fields
  service: ['title', 'description'],
  
  // Job application fields
  job_application: ['headline', 'cover_letter', 'portfolio_summary'],
  
  // Job posting fields
  job_posting: ['title', 'description', 'requirements'],
  
  // Content fields
  content: ['title', 'body', 'excerpt'],
  
  // Event fields
  event: ['title', 'description'],
  
  // Announcement fields
  announcement: ['title', 'message'],
};

/**
 * Supported languages for the platform
 */
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de'] as const;

/**
 * Default language
 */
export const DEFAULT_LANGUAGE = 'en' as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Translation origin types
 */
export const TRANSLATION_ORIGIN = {
  MACHINE: 'machine',
  HUMAN: 'human',
} as const;

export type TranslationOrigin = typeof TRANSLATION_ORIGIN[keyof typeof TRANSLATION_ORIGIN];