// ES Module exports for Vite compatibility
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FOUNDATION: 'FOUNDATION',
  PRODUCT_SUPPLIER: 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  EDUCATOR: 'EDUCATOR',
  PARENT: 'PARENT',
};

export const SubscriptionTier = {
  BASIC: 'BASIC',
  ESSENTIAL: 'ESSENTIAL',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
};

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
};

export const AssetKind = {
  AVATAR: 'AVATAR',
  LOGO: 'LOGO',
  COVER_IMAGE: 'COVER_IMAGE',
  PRODUCT_IMAGE: 'PRODUCT_IMAGE',
  DOCUMENT: 'DOCUMENT',
  CV: 'CV',
  CATALOG_PDF: 'CATALOG_PDF',
  CATALOG_CSV: 'CATALOG_CSV',
  FRONTEND_LOGO: 'FRONTEND_LOGO',
  FRONTEND_FAVICON: 'FRONTEND_FAVICON',
  FRONTEND_OG_IMAGE: 'FRONTEND_OG_IMAGE',
  ADMIN_LOGO: 'ADMIN_LOGO',
  ADMIN_FAVICON: 'ADMIN_FAVICON',
  SIDEBAR_LOGO: 'SIDEBAR_LOGO',
  ELEARNING: 'ELEARNING',
  COMPANY_PROFILE_DOC: 'COMPANY_PROFILE_DOC',
};

export const OrganizationType = {
  FOUNDATION: 'FOUNDATION',
  PRODUCT_SUPPLIER: 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
};

export const JobStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  FILLED: 'FILLED',
};

export const JobContractType = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CDI: 'CDI',
  CDD: 'CDD',
  INTERNSHIP: 'INTERNSHIP',
};

export const ServiceCategory = {
  CLEANING: 'CLEANING',
  IT_SUPPORT: 'IT_SUPPORT',
  MAINTENANCE: 'MAINTENANCE',
  CONSULTING: 'CONSULTING',
  TRAINING: 'TRAINING',
  OTHER: 'OTHER',
};

export const ApplicationStatus = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
};

export const CourseStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
};

export const ContentType = {
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  QUIZ: 'QUIZ',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
};

export const LessonStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

export const QuizType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  ESSAY: 'ESSAY',
  MATCHING: 'MATCHING',
};

export const MessageType = {
  TEXT: 'TEXT',
  FILE: 'FILE',
  IMAGE: 'IMAGE',
  SYSTEM: 'SYSTEM',
};

export const ConversationType = {
  DIRECT: 'DIRECT',
  GROUP: 'GROUP',
  SUPPORT: 'SUPPORT',
};

export const CANTON_CODES = {
  'AG': 'Aargau',
  'AR': 'Appenzell Ausserrhoden',
  'AI': 'Appenzell Innerrhoden',
  'BL': 'Basel-Landschaft',
  'BS': 'Basel-Stadt',
  'BE': 'Bern',
  'FR': 'Fribourg',
  'GE': 'Geneva',
  'GL': 'Glarus',
  'GR': 'Grisons',
  'JU': 'Jura',
  'LU': 'Lucerne',
  'NE': 'Neuchâtel',
  'NW': 'Nidwalden',
  'OW': 'Obwalden',
  'SH': 'Schaffhausen',
  'SZ': 'Schwyz',
  'SO': 'Solothurn',
  'SG': 'St. Gallen',
  'TG': 'Thurgau',
  'TI': 'Ticino',
  'UR': 'Uri',
  'VS': 'Valais',
  'VD': 'Vaud',
  'ZG': 'Zug',
  'ZH': 'Zurich',
  'CH': 'Federal (Switzerland)',
};

export const CANTON_DEFAULT_LANGUAGES = {
  'AG': 'de',
  'AI': 'de',
  'AR': 'de',
  'BE': 'de',
  'BL': 'de',
  'BS': 'de',
  'FR': 'fr',
  'GE': 'fr',
  'GL': 'de',
  'GR': 'de',
  'JU': 'fr',
  'LU': 'de',
  'NE': 'fr',
  'NW': 'de',
  'OW': 'de',
  'SG': 'de',
  'SH': 'de',
  'SO': 'de',
  'SZ': 'de',
  'TG': 'de',
  'TI': 'it',
  'UR': 'de',
  'VD': 'fr',
  'VS': 'fr',
  'ZG': 'de',
  'ZH': 'de',
  'CH': 'de',
};

export function getCantonName(code) {
  return CANTON_CODES[code];
}

export function getCantonDefaultLanguage(code) {
  return CANTON_DEFAULT_LANGUAGES[code];
}

export function isValidCantonCode(code) {
  return code in CANTON_CODES;
}
