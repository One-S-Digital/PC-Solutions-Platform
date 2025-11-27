/**
 * Field Registry - Defines which fields are translatable for each entity type
 * This follows the i18n specification for dynamic content translation
 * 
 
 */
export const FIELDS_BY_ENTITY: Record<string, string[]> = {
  // User profile fields (only descriptive content - never passwords, names, emails)
  user: ['display_name', 'shortBio'],
  
  // Organization fields (only description is translatable - name is a proper noun/identifier)
  organization: ['description'],
  
  // Service provider fields
  service_provider: ['name', 'about', 'services'],
  
  // Product fields
  product: ['title', 'subtitle', 'short_desc', 'long_desc', 'features'],
  
  // Service fields
  service: ['title', 'description'],
  
  // Job application fields
  job_application: ['cover_letter'],
  
  // Job posting fields (job_listing in database)
  job_listing: ['title', 'description', 'requirements', 'responsibilities', 'qualifications', 'benefits'],
  job_posting: ['title', 'description', 'requirements', 'responsibilities', 'qualifications', 'benefits'], // Alias for compatibility
  
  // Content fields (generic)
  content: ['title', 'body', 'excerpt'],
  
  // E-learning content (stored in Asset table with category ELEARNING)
  elearning: ['title', 'description', 'content_preview'],
  
  // HR documents (stored in Asset table with category HR_DOCUMENT)
  hr_document: ['title', 'description', 'content_preview'],
  
  // State policies (stored in Asset table with category STATE_POLICY)
  state_policy: ['title', 'description', 'content_preview'],
  
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