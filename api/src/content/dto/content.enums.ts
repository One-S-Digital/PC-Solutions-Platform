/**
 * Shared enums and constants for content management
 */

export enum ELearningContentType {
  COURSE = 'COURSE',
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  LINK = 'LINK',
}

export enum ContentStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  ARCHIVED = 'Archived',
  IN_REVIEW = 'In Review',
  APPROVED = 'Approved',
  UPCOMING = 'Upcoming',
}

export enum LanguageCode {
  EN = 'EN',
  FR = 'FR',
  DE = 'DE',
}

export enum PolicyType {
  REGULATION = 'Regulation',
  GUIDELINE = 'Guideline',
  STANDARD = 'Standard',
  DIRECTIVE = 'Directive',
  LAW = 'Law',
  COMPLIANCE_PROCEDURE = 'Compliance Procedure',
  ADMINISTRATIVE_PROCEDURE = 'Administrative Procedure',
}

export enum FileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  XLS = 'XLS',
  XLSX = 'XLSX',
  CSV = 'CSV',
  ODS = 'ODS',
  MP4 = 'MP4',
  DOC = 'DOC',
}

// E-Learning Categories
export const ELEARNING_CATEGORIES = [
  'Child Development',
  'Health & Safety',
  'Educational Methods',
  'Special Needs',
  'Parental Engagement',
  'Administration',
  'Technology',
  'Other',
] as const;

export type ELearningCategory = typeof ELEARNING_CATEGORIES[number];

// HR Categories
export const HR_CATEGORIES = [
  'Onboarding',
  'Policies',
  'Benefits',
  'Training',
  'Compliance',
  'Performance',
  'Other',
] as const;

export type HRCategory = typeof HR_CATEGORIES[number];

// Policy Categories
export const POLICY_CATEGORIES = [
  'Education Policy',
  'Health & Safety',
  'Labor & Employment',
  'Child Protection',
  'Data Privacy',
  'Environmental',
  'Other',
] as const;

export type PolicyCategory = typeof POLICY_CATEGORIES[number];

// Countries
export const COUNTRIES = [
  'Switzerland',
  'Germany',
  'Austria',
  'France',
] as const;

export type Country = typeof COUNTRIES[number];

// Regions by country
export const REGIONS_BY_COUNTRY: Record<Country, readonly string[]> = {
  Switzerland: [
    'Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 
    'Basel-Landschaft', 'Basel-Stadt', 'Bern', 'Fribourg', 'Geneva', 
    'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel',
    'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 
    'St. Gallen', 'Thurgau', 'Ticino', 'Uri', 'Valais', 'Vaud', 
    'Zug', 'Zurich',
  ] as const,
  Germany: [
    'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 
    'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 
    'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 
    'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 
    'Schleswig-Holstein', 'Thuringia',
  ] as const,
  Austria: [
    'Burgenland', 'Carinthia', 'Lower Austria', 'Upper Austria', 
    'Salzburg', 'Styria', 'Tyrol', 'Vorarlberg', 'Vienna',
  ] as const,
  France: [
    'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 
    'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France', 
    'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie', 
    'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur',
  ] as const,
};

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  ELEARNING: 500 * 1024 * 1024, // 500 MB - increased for video uploads
  HR_DOCUMENT: 50 * 1024 * 1024, // 50 MB
  STATE_POLICY: 50 * 1024 * 1024, // 50 MB
};

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  ELEARNING: [
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo', // AVI format (legacy MIME type)
    'video/vnd.avi', // AVI format (detected by file-type library v21+)
    'video/x-m4v', // M4V files
    'video/3gpp', // 3GP files
    'video/ogg', // OGG video
    'video/x-matroska', // MKV files
    'video/mpeg', // MPEG files
    'video/x-flv', // FLV files
    'application/octet-stream', // Generic binary (some browsers report video files this way)
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  HR_DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // CSV (common "spreadsheet" interchange format)
    'text/csv',
    'application/csv',
    // OpenDocument Spreadsheet (LibreOffice)
    'application/vnd.oasis.opendocument.spreadsheet',
  ],
  STATE_POLICY: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // CSV (common "spreadsheet" interchange format)
    'text/csv',
    'application/csv',
    // OpenDocument Spreadsheet (LibreOffice)
    'application/vnd.oasis.opendocument.spreadsheet',
  ],
};

