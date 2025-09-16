'use strict';

function createEnum(values) {
  return Object.freeze(values);
}

const UserRole = createEnum({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FOUNDATION: 'FOUNDATION',
  PRODUCT_SUPPLIER: 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  EDUCATOR: 'EDUCATOR',
  PARENT: 'PARENT',
});

const SubscriptionTier = createEnum({
  BASIC: 'BASIC',
  ESSENTIAL: 'ESSENTIAL',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
});

const SubscriptionStatus = createEnum({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
});

const AssetKind = createEnum({
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
});

const OrganizationType = createEnum({
  FOUNDATION: 'FOUNDATION',
  PRODUCT_SUPPLIER: 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
});

const JobStatus = createEnum({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  FILLED: 'FILLED',
});

const ServiceCategory = createEnum({
  CLEANING: 'CLEANING',
  IT_SUPPORT: 'IT_SUPPORT',
  MAINTENANCE: 'MAINTENANCE',
  CONSULTING: 'CONSULTING',
  TRAINING: 'TRAINING',
  OTHER: 'OTHER',
});

const ApplicationStatus = createEnum({
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
});

const CourseStatus = createEnum({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
});

const ContentType = createEnum({
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  QUIZ: 'QUIZ',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
});

const LessonStatus = createEnum({
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});

const QuizType = createEnum({
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  ESSAY: 'ESSAY',
  MATCHING: 'MATCHING',
});

const MessageType = createEnum({
  TEXT: 'TEXT',
  FILE: 'FILE',
  IMAGE: 'IMAGE',
  SYSTEM: 'SYSTEM',
});

const ConversationType = createEnum({
  DIRECT: 'DIRECT',
  GROUP: 'GROUP',
  SUPPORT: 'SUPPORT',
});

module.exports = {
  UserRole,
  SubscriptionTier,
  SubscriptionStatus,
  AssetKind,
  OrganizationType,
  JobStatus,
  ServiceCategory,
  ApplicationStatus,
  CourseStatus,
  ContentType,
  LessonStatus,
  QuizType,
  MessageType,
  ConversationType,
};
