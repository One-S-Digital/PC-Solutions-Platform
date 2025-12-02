import { UserRole, UserStatus, StockStatus, ServiceCategory, ServiceDeliveryType } from './';

import {
  CandidateProfile,
  Course,
  PolicyDocument,
  PolicyAlert,
  ParentLead as BaseParentLead,
  Order as BaseOrder,
  OrderRequest as BaseOrderRequest,
  LineItem,
} from '../../../types';

// Add FrontendSettings interface
export interface FrontendSettings {
  id: string;
  siteName: string;
  siteDescription?: string;
  siteKeywords?: string;
  logoAssetId?: string;
  faviconAssetId?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  adminLogoAssetId?: string;
  adminPrimaryColor: string;
  adminSecondaryColor: string;
  adminAccentColor: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageAssetId?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  cookiePolicyUrl?: string;
  enableDarkMode: boolean;
  defaultTheme: string;
  mainAppCustomization?: any;
  adminCustomization?: any;
  createdAt: Date;
  updatedAt: Date;
  // Asset relations
  logoAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
  faviconAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
  adminLogoAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
  adminFaviconAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
  ogImageAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
}

export interface UserEmail {
  id: string;
  address: string;
  verified: boolean;
  primary: boolean;
}

export interface SyncMetadata {
  lastInboundAt?: Date;
  lastOutboundAt?: Date;
  lastNonce?: string;
}


export interface Product {
  id: string;
  title: string;
  supplierId: string;
  supplierName: string;
  supplierLogo?: string;
  brochureUrl?: string;
  brochureAssetId?: string;
  description: string;
  category: string; // Legacy single category
  categories?: string[]; // New: flexible category tags
  tags: string[];
  imageUrl?: string;
  imageAssetId?: string;
  price?: number;
  stockStatus?: StockStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  title: string;
  providerId: string;
  providerName: string;
  providerLogo?: string;
  description: string;
  category: ServiceCategory; // Legacy single category
  categories?: string[]; // New: flexible category tags
  availability: string;
  tags: string[];
  imageUrl?: string;
  deliveryType?: ServiceDeliveryType;
  priceInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  type: string; // OrganizationType: FOUNDATION, SERVICE_PROVIDER, PRODUCT_SUPPLIER
  region?: string;
  logoUrl?: string;
  logoAssetId?: string;
  coverImageUrl?: string;
  coverAssetId?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
  tags: string[];
  rating?: number;
  badges: string[];
  directOrderLink?: string;
  capacity?: number;
  pedagogy: string[];
  languagesSpoken: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  auth0Id?: string;
  clerkId: string;
  name: string;
  email: string;

  emails?: UserEmail[];

  firstName?: string;
  lastName?: string;
  avatarKey?: string;
  avatarUrl?: string;
  avatarAssetId?: string;
  imageUrl?: string;
  role: UserRole;
  orgId?: string;
  orgIds: string[];
  orgName?: string;
  status: UserStatus;
  lastLogin?: Date;
  region?: string;
  createdAt: Date;
  updatedAt: Date;
  clerkUpdatedAt?: Date;
  mongoUpdatedAt?: Date;

  syncMetadata?: SyncMetadata;
  organization?: Organization;
  candidateProfile?: CandidateProfile;
}

export interface JobListing {
  id: string;
  title: string;
  organizationName: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  description: string;
  location: string;
  type: string;
  salary?: string;
  applicants?: number;
}

export interface Candidate {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  currentRoleOrTitle?: string;
  role?: string;
  experience?: string;
  availabilityStatus?: string;
  createdAt?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

export interface HrDocument {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  fileUrl?: string;
  tags?: string[];
  status?: string;
}

export interface FileTypeInfo {
  kind: string;
  label: string;
  maxSize: string;
  allowedTypes: string[];
  allowedExtensions: string[];
  requirements?: string[];
  description: string;
  examples: string;
}

export interface ParentLead extends BaseParentLead {
  parent?: {
    name?: string;
    email?: string;
  };
}

export interface Order extends BaseOrder {
  foundation?: { name: string };
  foundationOrg?: { name: string };
}

export type OrderRequest = BaseOrderRequest;

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantType: string;
  organizationName?: string;
  lastMessageSnippet?: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export interface FileUploadResult {
  id: string;
  key: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface FileSearchResult {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface FileAnalytics {
  totalFiles: number;
  totalSize: number;
  recentUploads: number;
}

export interface FileHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: string;
  issues: string[];
}

export interface UploadedAsset {
  id: string;
  publicUrl: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface SettingsHealth {
  overall: 'PASS' | 'FAIL';
  message: string;
  assets: Record<string, {
    status: 'PASS' | 'FAIL';
    checks: {
      presence: boolean;
      dbIntegrity: boolean;
      reachability: boolean;
      contentType: boolean;
      rules: boolean;
    };
    details: string[];
    assetInfo?: UploadedAsset;
  }>;
  timestamp: string;
}

export interface SystemHealth {
  status: 'OK' | 'ERROR';
  environment: string;
  uptime?: number;
  version?: string;
}

export interface DbHealth {
  status: 'OK' | 'ERROR';
  details?: string;
}

// Admin Analytics Types - Real-time dashboard statistics
export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  registrations: Array<{ date: string; count: number }>;
  usersByRole: Array<{ role: string; count: number }>;
}

export interface OrgAnalytics {
  totalOrganizations: number;
  activeOrganizations: number;
  registrations: Array<{ date: string; count: number }>;
  orgsByType: Array<{ type: string; count: number }>;
}

export interface ProductAnalytics {
  totalProducts: number;
  newProducts: number;
  productsByCategory: Array<{ category: string; count: number }>;
  productsByStatus: Array<{ status: string; count: number }>;
}

export interface JobAnalytics {
  totalJobs: number;
  totalApplications: number;
  newJobs: number;
  newApplications: number;
  jobsByStatus: Array<{ status: string; count: number }>;
}

export interface RevenueAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: number;
  revenueByPlan: Array<{ planName: string; count: number; revenue: number }>;
}

export interface SystemUsageAnalytics {
  apiRequests: number;
  dbConnections: number;
  slowQueries: number;
  storageUsed: number;
}

export interface AnalyticsOverview {
  users: UserAnalytics;
  organizations: OrgAnalytics;
  products: ProductAnalytics;
  jobs: JobAnalytics;
  revenue: RevenueAnalytics;
  system: SystemUsageAnalytics;
  lastUpdated: string;
}

export interface LegacyUploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export type { Course, PolicyDocument, PolicyAlert, FrontendSettings, LineItem };


export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage?: number;
    prevPage?: number;
  };
  timestamp: string;
}
