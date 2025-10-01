// Re-export backend types for frontend use
// This file will be updated as we integrate more backend types

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

export enum OrganizationType {
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export enum AssetKind {
  AVATAR = 'AVATAR',
  LOGO = 'LOGO',
  COVER_IMAGE = 'COVER_IMAGE',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  DOCUMENT = 'DOCUMENT',
  CV = 'CV',
  CATALOG_PDF = 'CATALOG_PDF',
  CATALOG_CSV = 'CATALOG_CSV',
  FRONTEND_LOGO = 'FRONTEND_LOGO',
  FRONTEND_FAVICON = 'FRONTEND_FAVICON',
  FRONTEND_OG_IMAGE = 'FRONTEND_OG_IMAGE',
  ADMIN_LOGO = 'ADMIN_LOGO',
  ADMIN_FAVICON = 'ADMIN_FAVICON',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE = 'PAST_DUE',
}

export enum SubscriptionTier {
  BASIC = 'BASIC',
  ESSENTIAL = 'ESSENTIAL',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  FILLED = 'FILLED',
}

export enum ServiceCategory {
  CLEANING = 'CLEANING',
  IT_SUPPORT = 'IT_SUPPORT',
  MAINTENANCE = 'MAINTENANCE',
  CONSULTING = 'CONSULTING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContentType {
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  QUIZ = 'QUIZ',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

export enum LessonStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum QuizType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  ESSAY = 'ESSAY',
  MATCHING = 'MATCHING',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  SUPPORT = 'SUPPORT',
}

// Core entity types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  cvUrl?: string;
  stripeCustomerId?: string;
  lastActiveAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  region?: string;
  description?: string;
  vatNumber?: string;
  contactPerson?: string;
  phoneNumber?: string;
  canton?: string;
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
  productCategory?: string;
  serviceType?: string;
  minimumOrderQuantity?: number;
  directOrderLink?: string;
  catalogUrl?: string;
  serviceCategories?: string[];
  deliveryType?: string;
  bookingLink?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  logoAssetId?: string;
  coverAssetId?: string;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  filename: string;
  publicUrl: string;
  storageKey: string;
  mimeType?: string;
  size?: number;
  uploadedById: string;
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  tags?: string[];
  status: string;
  isActive: boolean;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
  imageAssetId?: string;
}

export interface Service {
  id: string;
  title: string;
  description?: string;
  category: ServiceCategory;
  price?: number;
  isActive: boolean;
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobListing {
  id: string;
  title: string;
  description?: string;
  requirements?: string[];
  benefits?: string[];
  location?: string;
  salary?: string;
  status: JobStatus;
  foundationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  jobListingId: string;
  candidateId: string;
  coverLetter?: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  organizationId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
}

export interface ServiceRequest {
  id: string;
  organizationId: string;
  serviceId: string;
  description?: string;
  status: string;
  requestedAt: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParentLead {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  childName: string;
  childAge: number;
  message?: string;
  foundationId?: string;
  preferredLocation?: string;
  preferredLanguages?: string[];
  specialRequirements?: string;
  source?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  receiverId?: string;
  content: string;
  messageType: MessageType;
  isRead: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  difficultyLevel: string;
  estimatedDuration: number;
  thumbnailUrl?: string;
  status: CourseStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string;
  progressPercentage: number;
  lastAccessedAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string;
  pdfUrl?: string;
  verificationCode: string;
}

// Frontend-specific types (for compatibility with existing code)
export interface FrontendUser extends User {
  name: string;
  orgId?: string;
  orgName?: string;
  avatarUrl?: string;
  status?: 'Active' | 'Pending' | 'Inactive';
  lastLogin?: string;
  region?: string;
  plan?: string;
  memberSince?: string;
}

export interface FrontendOrganization extends Organization {
  logoUrl?: string;
  coverImageUrl?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  tags?: string[];
  rating?: number;
  badges?: string[];
}

export interface FrontendProduct extends Product {
  supplierName: string;
  supplierLogo?: string;
  imageUrl?: string;
  stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Demand';
}

export interface FrontendService extends Service {
  providerName: string;
  providerLogo?: string;
  availability: string;
  tags?: string[];
  imageUrl?: string;
  deliveryType?: 'On-site' | 'Remote' | 'Hybrid';
  priceInfo?: string;
}

export interface FrontendJobListing extends JobListing {
  foundationName: string;
  contractType: 'Full-time' | 'Part-time' | 'CDI' | 'CDD' | 'Internship';
  startDate: string;
  applicationsReceived: number;
  imageUrl?: string;
}

// Utility types
export type SwissCanton = 
  | 'Aargau' | 'Appenzell Ausserrhoden' | 'Appenzell Innerrhoden' 
  | 'Basel-Landschaft' | 'Basel-Stadt' | 'Bern' | 'Fribourg' 
  | 'Geneva' | 'Glarus' | 'Grisons' | 'Jura' | 'Lucerne' 
  | 'Neuchâtel' | 'Nidwalden' | 'Obwalden' | 'Schaffhausen' 
  | 'Schwyz' | 'Solothurn' | 'St. Gallen' | 'Thurgau' 
  | 'Ticino' | 'Uri' | 'Valais' | 'Vaud' | 'Zug' | 'Zurich';

export type SupportedLanguage = 'EN' | 'FR' | 'DE';

export type LanguageCode = 'EN' | 'FR' | 'DE';

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}