import { UserRole, UserStatus, StockStatus, ServiceCategory, ServiceDeliveryType } from './';

// PolicyAlert re-exported from @workspace/types for use by api service
export type { PolicyAlert } from '@workspace/types';

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
  sidebarLogoAssetId?: string;
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
  sidebarLogoAsset?: {
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
  // IMPORTANT: profileId is the User.id from the User table (profile UUID)
  // This is different from id (which is AppUser.id)
  // Subscriptions MUST use profileId, not id
  profileId?: string | null;
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
  /** Educator visibility in candidate pool (when profile exists) */
  candidatePoolVisible?: boolean;
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
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'FILLED' | string;
  description: string;
  location: string;
  type: string;
  salary?: string;
  applicants?: number;
}

export interface Candidate {
  id: string;
  profileId?: string;
  name?: string;
  email?: string;
  phone?: string;
  currentRoleOrTitle?: string;
  role?: string;
  experience?: string;
  availabilityStatus?: string;
  candidatePoolVisible?: boolean;
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

export interface ParentLead {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string | null;
  parentUserId?: string | null;
  childName: string;
  childAge: number;
  message?: string | null;
  foundationId?: string | null;
  preferredLocation?: string | null;
  preferredCities?: string[];
  preferredLanguages?: string[];
  specialRequirements?: string | null;
  source?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
}

export interface Order {
  id: string;
  organizationId?: string;
  status: string;
  totalAmount?: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
  items?: LineItem[];
  foundation?: { name: string };
  foundationOrg?: { name: string };
  supplierId?: string | null;
  supplierName?: string | null;
}

export interface OrderRequest {
  id: string;
  status: string;
  createdAt: string | Date;
}

export interface LineItem {
  productId?: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  imageUrl?: string | null;
}

export interface CandidateProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  certifications?: string[];
  workExperience?: string;
  education?: string;
  availability?: string;
  shortBio?: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
}

export interface PolicyDocument {
  id: string;
  title: string;
  category?: string;
  status?: string;
  language?: string;
  country?: string;
  region?: string;
  isCritical?: boolean;
  updatedAt?: string;
  fileUrl?: string;
  tags?: string[];
}

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
  messageType?: 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
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

export interface AdminDashboardCounts {
  totalUsers: number;
  totalFoundations: number;
  totalProducts: number;
  totalParentLeads: number;
  totalJobs: number;
  totalApplications: number;
  lastUpdated: string;
}

export interface LegacyUploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export type { FrontendSettings };

// ========================
// Mailing List Types
// ========================

export interface MailingFilters {
  roles?: string[];
  excludeRoles?: string[];
  isActive?: boolean;
  hasSubscription?: boolean;
  subscriptionStatuses?: string[];
  subscriptionTiers?: string[];
  renewalDateFrom?: string;
  renewalDateTo?: string;
  cantons?: string[];
  cities?: string[];
  languages?: string[];
  marketingOptIn?: boolean;
  excludeUnsubscribed?: boolean;
  createdFrom?: string;
  createdTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
  search?: string;
}

export interface MailingPreviewRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  orgName: string | null;
  canton: string | null;
  isActive: boolean;
  hasSubscription: boolean;
  marketingOptIn: boolean;
}

export interface MailingPreviewResponse {
  count: number;
  rows: MailingPreviewRow[];
  warnings: string[];
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MailingSegment {
  id: string;
  name: string;
  description: string | null;
  filtersJson: MailingFilters;
  estimatedSize: number | null;
  lastComputedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: { campaigns: number };
}

export interface MailingSegmentListResponse {
  segments: MailingSegment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type MailingCampaignStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface MailingCampaignSummary {
  id: string;
  subject: string;
  status: MailingCampaignStatus;
  totalEstimated: number;
  sentCount: number;
  failedCount: number;
  segmentName: string | null;
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
}

export interface MailingCampaignDetail {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  segmentId: string | null;
  filtersJson: MailingFilters | null;
  status: MailingCampaignStatus;
  totalEstimated: number;
  sentCount: number;
  failedCount: number;
  cursor: string | null;
  createdById: string;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  segment?: { name: string } | null;
}

export interface MailingCampaignListResponse {
  campaigns: MailingCampaignSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MailingSendBatchResponse {
  sentCountThisBatch: number;
  failedCountThisBatch: number;
  totalSentSoFar: number;
  totalFailedSoFar: number;
  nextCursor: string | null;
  done: boolean;
  totalEstimated: number;
}


export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  total?: number;
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

export interface InviteUserResponse {
  id: string;
  emailAddress: string;
  status?: string;
  createdAt?: number;
  publicMetadata?: Record<string, unknown>;
  [key: string]: unknown;
}

// Partner types
export type PartnerType = 'ACADEMIC' | 'CORPORATE' | 'GOVERNMENTAL' | 'NON_PROFIT' | 'MEDIA' | 'TECHNOLOGY';

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  description?: string;
  websiteUrl?: string;
  countryRegion?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
  logoAssetId?: string;
  logoUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  partnershipStart?: string;
  partnershipEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerStats {
  total: number;
  active: number;
  featured: number;
  byType: Array<{ type: PartnerType; count: number }>;
}
