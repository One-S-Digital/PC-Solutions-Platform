export declare const UserRole: {
    readonly SUPER_ADMIN: "SUPER_ADMIN";
    readonly ADMIN: "ADMIN";
    readonly FOUNDATION: "FOUNDATION";
    readonly PRODUCT_SUPPLIER: "PRODUCT_SUPPLIER";
    readonly SERVICE_PROVIDER: "SERVICE_PROVIDER";
    readonly EDUCATOR: "EDUCATOR";
    readonly PARENT: "PARENT";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const SubscriptionTier: {
    readonly BASIC: "BASIC";
    readonly ESSENTIAL: "ESSENTIAL";
    readonly PROFESSIONAL: "PROFESSIONAL";
    readonly ENTERPRISE: "ENTERPRISE";
};
export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];
export declare const SubscriptionStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
    readonly PAUSED: "PAUSED";
    readonly CANCELLED: "CANCELLED";
    readonly EXPIRED: "EXPIRED";
    readonly TRIAL: "TRIAL";
    readonly PAST_DUE: "PAST_DUE";
    readonly PENDING: "PENDING";
    readonly GRACE_PERIOD: "GRACE_PERIOD";
};
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export declare const AssetKind: {
    readonly AVATAR: "AVATAR";
    readonly LOGO: "LOGO";
    readonly COVER_IMAGE: "COVER_IMAGE";
    readonly PRODUCT_IMAGE: "PRODUCT_IMAGE";
    readonly DOCUMENT: "DOCUMENT";
    readonly CV: "CV";
    readonly CATALOG_PDF: "CATALOG_PDF";
    readonly CATALOG_CSV: "CATALOG_CSV";
    readonly FRONTEND_LOGO: "FRONTEND_LOGO";
    readonly FRONTEND_FAVICON: "FRONTEND_FAVICON";
    readonly FRONTEND_OG_IMAGE: "FRONTEND_OG_IMAGE";
    readonly ADMIN_LOGO: "ADMIN_LOGO";
    readonly ADMIN_FAVICON: "ADMIN_FAVICON";
    readonly SIDEBAR_LOGO: "SIDEBAR_LOGO";
    readonly ELEARNING: "ELEARNING";
    readonly COMPANY_PROFILE_DOC: "COMPANY_PROFILE_DOC";
};
export type AssetKind = (typeof AssetKind)[keyof typeof AssetKind];
export declare const OrganizationType: {
    readonly FOUNDATION: "FOUNDATION";
    readonly PRODUCT_SUPPLIER: "PRODUCT_SUPPLIER";
    readonly SERVICE_PROVIDER: "SERVICE_PROVIDER";
};
export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];
export declare const JobStatus: {
    readonly DRAFT: "DRAFT";
    readonly PUBLISHED: "PUBLISHED";
    readonly CLOSED: "CLOSED";
    readonly FILLED: "FILLED";
};
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
export declare const JobContractType: {
    readonly FULL_TIME: "FULL_TIME";
    readonly PART_TIME: "PART_TIME";
    readonly CDI: "CDI";
    readonly CDD: "CDD";
    readonly INTERNSHIP: "INTERNSHIP";
};
export type JobContractType = (typeof JobContractType)[keyof typeof JobContractType];
export declare const ServiceCategory: {
    readonly CLEANING: "CLEANING";
    readonly IT_SUPPORT: "IT_SUPPORT";
    readonly MAINTENANCE: "MAINTENANCE";
    readonly CONSULTING: "CONSULTING";
    readonly TRAINING: "TRAINING";
    readonly OTHER: "OTHER";
};
export type ServiceCategory = (typeof ServiceCategory)[keyof typeof ServiceCategory];
export declare const ApplicationStatus: {
    readonly PENDING: "PENDING";
    readonly REVIEWED: "REVIEWED";
    readonly ACCEPTED: "ACCEPTED";
    readonly REJECTED: "REJECTED";
};
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
export declare const CourseStatus: {
    readonly DRAFT: "DRAFT";
    readonly PUBLISHED: "PUBLISHED";
    readonly ARCHIVED: "ARCHIVED";
};
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];
export declare const ContentType: {
    readonly VIDEO: "VIDEO";
    readonly DOCUMENT: "DOCUMENT";
    readonly QUIZ: "QUIZ";
    readonly TEXT: "TEXT";
    readonly IMAGE: "IMAGE";
};
export type ContentType = (typeof ContentType)[keyof typeof ContentType];
export declare const LessonStatus: {
    readonly NOT_STARTED: "NOT_STARTED";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
};
export type LessonStatus = (typeof LessonStatus)[keyof typeof LessonStatus];
export declare const QuizType: {
    readonly MULTIPLE_CHOICE: "MULTIPLE_CHOICE";
    readonly TRUE_FALSE: "TRUE_FALSE";
    readonly ESSAY: "ESSAY";
    readonly MATCHING: "MATCHING";
};
export type QuizType = (typeof QuizType)[keyof typeof QuizType];
export declare const MessageType: {
    readonly TEXT: "TEXT";
    readonly FILE: "FILE";
    readonly IMAGE: "IMAGE";
    readonly SYSTEM: "SYSTEM";
};
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export declare const ConversationType: {
    readonly DIRECT: "DIRECT";
    readonly GROUP: "GROUP";
    readonly SUPPORT: "SUPPORT";
};
export type ConversationType = (typeof ConversationType)[keyof typeof ConversationType];
export interface ClerkUser {
    id: string;
    email: string;
    emailAddresses: Array<{
        emailAddress: string;
        id: string;
    }>;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    role?: UserRole;
    organizationId?: string;
    createdAt: number;
    updatedAt: number;
}
export interface SignupDataDto {
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    organizationType?: OrganizationType;
    organizationName?: string;
    phone?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    website?: string;
    description?: string;
    canton?: string;
    languages?: string[];
    capacity?: number;
    productCategory?: string;
    serviceType?: string;
    contactPerson?: string;
    workExperience?: string;
    education?: string;
    certifications?: string;
    skills?: string[];
    availability?: string;
}
