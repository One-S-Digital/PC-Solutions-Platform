"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationType = exports.MessageType = exports.QuizType = exports.LessonStatus = exports.ContentType = exports.CourseStatus = exports.ApplicationStatus = exports.ServiceCategory = exports.JobContractType = exports.JobStatus = exports.OrganizationType = exports.AssetKind = exports.SubscriptionStatus = exports.SubscriptionTier = exports.UserRole = void 0;
// User Roles
exports.UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    FOUNDATION: 'FOUNDATION',
    PRODUCT_SUPPLIER: 'PRODUCT_SUPPLIER',
    SERVICE_PROVIDER: 'SERVICE_PROVIDER',
    EDUCATOR: 'EDUCATOR',
    PARENT: 'PARENT',
};
// Subscription Tiers
exports.SubscriptionTier = {
    BASIC: 'BASIC',
    ESSENTIAL: 'ESSENTIAL',
    PROFESSIONAL: 'PROFESSIONAL',
    ENTERPRISE: 'ENTERPRISE',
};
// Subscription Status
exports.SubscriptionStatus = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    CANCELLED: 'CANCELLED',
    PAST_DUE: 'PAST_DUE',
};
// Asset Kinds
exports.AssetKind = {
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
// Organization Types
exports.OrganizationType = {
    FOUNDATION: 'FOUNDATION',
    PRODUCT_SUPPLIER: 'PRODUCT_SUPPLIER',
    SERVICE_PROVIDER: 'SERVICE_PROVIDER',
};
// Job Status
exports.JobStatus = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    CLOSED: 'CLOSED',
    FILLED: 'FILLED',
};
// Job Contract Types
exports.JobContractType = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CDI: 'CDI',
    CDD: 'CDD',
    INTERNSHIP: 'INTERNSHIP',
    REPLACEMENT: 'REPLACEMENT',
    TEMPORARY: 'TEMPORARY',
    FREELANCE: 'FREELANCE',
};
// Service Categories
exports.ServiceCategory = {
    CLEANING: 'CLEANING',
    IT_SUPPORT: 'IT_SUPPORT',
    MAINTENANCE: 'MAINTENANCE',
    CONSULTING: 'CONSULTING',
    TRAINING: 'TRAINING',
    OTHER: 'OTHER',
};
// Application Status
exports.ApplicationStatus = {
    PENDING: 'PENDING',
    REVIEWED: 'REVIEWED',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
};
// Course Status
exports.CourseStatus = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED',
};
// Content Types
exports.ContentType = {
    VIDEO: 'VIDEO',
    DOCUMENT: 'DOCUMENT',
    QUIZ: 'QUIZ',
    TEXT: 'TEXT',
    IMAGE: 'IMAGE',
};
// Lesson Status
exports.LessonStatus = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
};
// Quiz Types
exports.QuizType = {
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    TRUE_FALSE: 'TRUE_FALSE',
    ESSAY: 'ESSAY',
    MATCHING: 'MATCHING',
};
// Message Types
exports.MessageType = {
    TEXT: 'TEXT',
    FILE: 'FILE',
    IMAGE: 'IMAGE',
    SYSTEM: 'SYSTEM',
};
// Conversation Types
exports.ConversationType = {
    DIRECT: 'DIRECT',
    GROUP: 'GROUP',
    SUPPORT: 'SUPPORT',
};
