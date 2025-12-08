

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

export interface User {
  // Core Prisma User fields
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  
  // Optional fields
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
  
  // Legacy frontend fields for compatibility
  name: string;
  status?: 'Active' | 'Pending' | 'Inactive';
  lastLogin?: string;
  memberSince?: string;
  avatarUrl?: string;
  orgId?: string;
  orgName?: string;
  orgType?: OrganizationType;
  orgLogoUrl?: string | null;
  orgCoverImageUrl?: string | null;
  region?: SwissCanton | string;
  plan?: string;
  organizations?: Array<Organization & { membershipRole?: UserRole }>;
  primaryOrganization?: (Organization & { membershipRole?: UserRole }) | null;
}

// ... other existing types
export type SwissCanton = typeof SWISS_CANTONS[number];
export const SWISS_CANTONS = [
  'Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft', 'Basel-Stadt',
  'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Grisons', 'Jura', 'Lucerne', 'Neuchâtel',
  'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Thurgau',
  'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zurich'
] as const;


export enum OrganizationType {
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export interface Organization {
  // Core Prisma Organization fields
  id: string;
  name: string;
  type: OrganizationType;
  region?: string;
  description?: string;
  vatNumber?: string;
  
  // Additional organization fields
  contactPerson?: string;
  phoneNumber?: string;
  canton?: string; // Legacy single canton field
  regionsServed?: string[]; // Multiple cantons/regions
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
  productCategory?: string; // Legacy single category
  productCategories?: string[]; // New: flexible product category tags
  serviceType?: string;
  minimumOrderQuantity?: number;
  directOrderLink?: string;
  catalogUrl?: string;
  serviceCategories?: string[];
  deliveryType?: string;
  bookingLink?: string;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Asset relations
  logoAssetId?: string;
  coverAssetId?: string;
  
  // Legacy field compatibility
  logoUrl?: string;
  coverImageUrl?: string;
  products?: Product[];
  services?: Service[];
  jobListings?: JobListing[];
  membershipRole?: UserRole;
  
  // UI-specific fields for marketplace display
  tags?: string[];
  badges?: string[];
  rating?: number;
}


export type ProductAvailabilityStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'OUT_OF_STOCK';

export interface AssetSummary {
  id: string;
  publicUrl?: string;
  url?: string;
}

export interface Product {
  // Core Prisma Product fields
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  price?: number;
  priceCurrency?: string;
  category?: string; // Legacy single category
  primaryCategory?: string;
  categories?: string[]; // Flexible category tags
  tags: string[];
  productHighlights?: string[];
  unitOfMeasure?: string;
  status: string; // ACTIVE, INACTIVE, PENDING, REJECTED
  availabilityStatus?: ProductAvailabilityStatus;
  isActive: boolean;
  sku?: string;
  vendorSku?: string;
  ean?: string;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  stockStatus?: string;
  deliveryLeadTimeDays?: number;
  restockCadence?: string;
  usageNotes?: string;
  packagingDetails?: string;
  materials?: string;
  complianceTags?: string[];
  allergens?: string[];
  ageRanges?: string[];
  deliveryMethods?: string[];
  deliveryFees?: Array<{ method: string; fee: number; currency?: string }>;
  supportedCantons?: string[];
  visibilityStart?: string;
  visibilityEnd?: string;
  volumePricing?: Array<{ minQuantity: number; price: number }>;
  variants?: Array<{
    name: string;
    sku?: string;
    price?: number;
    stockQuantity?: number;
    stockStatus?: string;
    imageAssetId?: string;
    attributes?: string[];
  }>;
  galleryAssetIds?: string[];
  specSheetAssetId?: string;
  msdsAssetId?: string;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
  
  // Asset relation
  imageAssetId?: string;
  imageAsset?: AssetSummary | null;
  
  // Legacy frontend fields for compatibility
  supplierName?: string;
  supplierLogo?: string;
  imageUrl?: string;
}
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Demand';

export enum ServiceCategory {
  CLEANING = 'CLEANING',
  IT_SUPPORT = 'IT_SUPPORT',
  MAINTENANCE = 'MAINTENANCE',
  CONSULTING = 'CONSULTING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

export interface Service {
  // Core Prisma Service fields
  id: string;
  title: string;
  description?: string;
  category: ServiceCategory; // Legacy single category
  categories?: string[]; // New: flexible category tags
  price?: number;
  isActive: boolean;
  providerId: string;
  createdAt: string;
  updatedAt: string;
  
  // Legacy frontend fields for compatibility
  providerName?: string;
  providerLogo?: string;
  availability?: string;
  tags?: string[];
  imageUrl?: string;
  deliveryType?: ServiceDeliveryType;
  priceInfo?: string;
  bookingLink?: string;
}
export const SERVICE_CATEGORIES: ServiceCategory[] = [ServiceCategory.CLEANING, ServiceCategory.IT_SUPPORT, ServiceCategory.MAINTENANCE, ServiceCategory.CONSULTING, ServiceCategory.TRAINING, ServiceCategory.OTHER];
export type ServiceDeliveryType = 'On-site' | 'Remote' | 'Hybrid';
export const SERVICE_DELIVERY_TYPES: ServiceDeliveryType[] = ['On-site', 'Remote', 'Hybrid'];

export type JobContractType = 'FULL_TIME' | 'PART_TIME' | 'CDI' | 'CDD' | 'INTERNSHIP' | 'FREELANCE';

export const JobStatus = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    CLOSED: 'CLOSED',
    FILLED: 'FILLED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobContractTypeValue = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CDI: 'CDI',
    CDD: 'CDD',
    INTERNSHIP: 'INTERNSHIP',
    FREELANCE: 'FREELANCE',
} as const;

export interface JobListing {
    id: string;
    title: string;
    foundationId: string;
    foundationName?: string;
    location?: string;
    contractType: JobContractType;
    startDate?: string;
    status: JobStatus;
    description?: string;
    requirements: string[];
    responsibilities: string[];
    qualifications: string[];
    benefits: string[];
    salary?: string;
    salaryRange?: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    applicationsCount: number;
}

export interface CandidateProfile {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    currentRoleOrTitle?: string;
    location?: string; // e.g., "Geneva, GE"
    availabilityStatus?: 'Available Immediately' | 'Seeking Opportunities' | 'Not Available';
    shortBio?: string;
    skills: string[];
    workExperience?: WorkExperienceItem[];
    education?: EducationItem[];
    certifications?: CertificationItem[];
    availabilityPreferences?: {
        days?: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
        times?: 'Morning' | 'Afternoon' | 'Full-Day' | 'Flexible';
        contractType?: 'Full-time' | 'Part-time' | 'Internship' | 'Temporary';
        preferredAgeGroups?: ('Infants' | 'Toddlers' | 'Preschool')[];
    };
    documents?: DocumentItem[];
    
    // Legacy fields for simpler list view
    role?: string;
    availability?: string;
    preferredRegion?: string;
    experience?: string;
    languages?: string[];
}

export interface WorkExperienceItem {
    id: string;
    jobTitle: string;
    institutionName: string;
    startDate: string; // YYYY-MM
    endDate: string; // YYYY-MM or 'Present'
    descriptionPoints: string[];
}

export interface EducationItem {
    id: string;
    degree: string;
    institutionName: string;
    graduationYear: string;
    description?: string;
}

export interface CertificationItem {
    id: string;
    name: string;
    issuingOrganization: string;
    issueDate: string; // YYYY-MM
    expiryDate?: string; // YYYY-MM
    credentialUrl?: string;
}

export interface DocumentItem {
    id: string;
    name: string;
    url: string;
    type: 'CV' | 'Diploma' | 'Certificate' | 'Reference' | 'Other';
    uploadDate: string; // ISO String
    size: number; // in bytes
}


export type PartnerType = 'ACADEMIC' | 'CORPORATE' | 'GOVERNMENTAL' | 'NON_PROFIT' | 'MEDIA' | 'TECHNOLOGY';

export const PARTNER_TYPES: PartnerType[] = ['ACADEMIC', 'CORPORATE', 'GOVERNMENTAL', 'NON_PROFIT', 'MEDIA', 'TECHNOLOGY'];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  ACADEMIC: 'Academic',
  CORPORATE: 'Corporate',
  GOVERNMENTAL: 'Governmental',
  NON_PROFIT: 'Non-Profit',
  MEDIA: 'Media',
  TECHNOLOGY: 'Technology',
};

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

export type UploadableContentType = 'e-learning' | 'hr' | 'policy';
export type ELearningContentType = 'COURSE' | 'VIDEO' | 'PDF' | 'LINK';
export const ELearningContentType = {
    COURSE: 'COURSE' as ELearningContentType,
    VIDEO: 'VIDEO' as ELearningContentType,
    PDF: 'PDF' as ELearningContentType,
    LINK: 'LINK' as ELearningContentType,
};
export const ELearningContentTypeLabels: Record<ELearningContentType, string> = {
    COURSE: 'Course',
    VIDEO: 'Video',
    PDF: 'PDF',
    LINK: 'External Link',
};

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
export const ELEARNING_CATEGORY_LABELS: Record<ELearningCategory, string> = {
    'Child Development': 'Child Development',
    'Health & Safety': 'Health & Safety',
    'Educational Methods': 'Educational Methods',
    'Special Needs': 'Special Needs',
    'Parental Engagement': 'Parental Engagement',
    'Administration': 'Administration',
    'Technology': 'Technology & Digital Tools',
    'Other': 'Other Content',
};

export interface Course {
    id: string;
    title: string;
    description: string;
    type: ELearningContentType;
    category: ELearningCategory;
    lessons?: number;
    duration?: string; // e.g., "2h 30m"
    thumbnailUrl?: string;
    updatedDate: string;
    language: LanguageCode;
    accessRoles?: UserRole[];
    status: 'Draft' | 'Published' | 'Archived';
    fileUrl?: string; // For PDF, Video, Link types
    tags?: string[];
    contentPreview?: string;
}
export type LanguageCode = 'EN' | 'FR' | 'DE';

export type HRCategory = 'Onboarding' | 'Policies' | 'Benefits' | 'Training' | 'Compliance' | 'Performance' | 'Other';
export const HR_CATEGORIES: HRCategory[] = ['Onboarding', 'Policies', 'Benefits', 'Training', 'Compliance', 'Performance', 'Other'];
export const HR_CATEGORY_LABELS: Record<HRCategory, string> = {
  Onboarding: 'Onboarding & Orientation',
  Policies: 'Policies & Legal',
  Benefits: 'Benefits & Compensation',
  Training: 'Training & Certification',
  Compliance: 'Compliance & Safety',
  Performance: 'Performance & Reviews',
  Other: 'Other Resources',
};

export interface HRDocument {
    id: string;
    title: string;
    category: HRCategory;
    fileUrl: string;
    uploaderId: string;
    lastUpdated: string; // ISO date string
    fileType: 'PDF' | 'DOCX' | 'XLSX';
    tags: string[];
    isFavorite?: boolean;
    language?: LanguageCode;
    version?: string;
    status: 'Draft' | 'Published' | 'Archived';
    contentPreview?: string;
}

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
export const POLICY_CATEGORY_LABELS: Record<PolicyCategory, string> = {
    'Education Policy': 'Education Policy',
    'Health & Safety': 'Health & Safety',
    'Labor & Employment': 'Labor & Employment',
    'Child Protection': 'Child Protection',
    'Data Privacy': 'Data Privacy',
    'Environmental': 'Environmental',
    'Other': 'Other Policies',
};

export enum PolicyType {
    REGULATION = 'Regulation',
    GUIDELINE = 'Guideline',
    STANDARD = 'Standard',
    DIRECTIVE = 'Directive',
    LAW = 'Law',
}
export const POLICY_TYPES_ENUM = Object.values(PolicyType);

export interface PolicyDocument {
    id: string;
    title: string;
    category: PolicyCategory;
    policyType?: PolicyType;
    country?: string;
    region?: string;
    tags: string[];
    publishedDate: string; // ISO date string
    lastUpdatedDate: string; // ISO date string
    effectiveDate?: string; // ISO date string
    contentPreview?: string;
    externalLink?: string; // Link to official source
    fileUrl?: string;
    fileType?: 'PDF' | 'DOC';
    status: 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Upcoming' | 'Archived';
    isCritical?: boolean;
    language?: LanguageCode;
}

export enum PolicyAlertType {
    INFO = 'Info',
    CRITICAL = 'Critical'
}
export interface PolicyAlert {
    id: string;
    title: string;
    message: string;
    type: PolicyAlertType;
    regionScope: 'All' | SwissCanton; // Target all or specific canton
    isActive: boolean;
    creationDate: string;
    displayStartDate?: string;
    displayEndDate?: string;
}


export enum LeadMainStatus {
    NEW = 'New',
    PROCESSING = 'Processing',
    PARENT_ACTION_REQUIRED = 'Parent Action Required',
    CLOSED_ENROLLED = 'Closed - Enrolled',
    CLOSED_OTHER = 'Closed - Other',
}

export enum FoundationLeadResponseStatus {
    NOT_RESPONDED = 'Not Responded',
    INTERESTED = 'Interested',
    NOT_INTERESTED = 'Not Interested',
    NEEDS_MORE_INFO = 'Needs More Info',
    ENROLLED = 'Enrolled'
}

export interface FoundationResponse {
    foundationId: string;
    foundationName: string;
    status: FoundationLeadResponseStatus;
    messageToParent?: string;
    responseDate: string; // ISO date string
}

export interface ParentLead {
    id: string;
    parentId: string; // Link to a parent user if they are registered
    canton: string;
    municipality: string;
    childAge: number;
    desiredStartDate: string; // ISO date string
    specialNeeds?: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    submissionDate: string; // ISO date string
    mainStatus: LeadMainStatus;
    assignedFoundations: string[]; // Array of foundation org IDs
    responses: FoundationResponse[];
}

export enum SignupRole {
    FOUNDATION = 'Foundation (Daycare)',
    SUPPLIER = 'Product Supplier',
    SERVICE_PROVIDER = 'Service Provider',
    EDUCATOR = 'Educator/Candidate',
    PARENT = 'Parent',
}
export interface SignupFormData {
    organisationName: string;
    contactPerson: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    canton: SwissCanton | '';
    languagesSpoken: SupportedLanguage[];
    capacity?: number;
    category: string; // For supplier
    serviceType: string; // For service provider
    childAge?: number; // For parent
    childStartDate: string; // for parent
    termsAccepted: boolean;
}

export type SupportedLanguage = 'EN' | 'FR' | 'DE';

export enum OrderRequestStatus {
    SUBMITTED = 'Submitted',
    VIEWED_BY_SUPPLIER = 'Viewed by Supplier',
    ACCEPTED = 'Accepted',
    DECLINED = 'Declined',
    PROCESSING = 'Processing',
    SHIPPED = 'Shipped',
    FULFILLED = 'Fulfilled',
    CANCELLED = 'Cancelled',
}

export interface OrderRequest {
    id: string;
    foundationId: string;
    foundationOrgId: string;
    productId: string;
    productName: string;
    supplierId: string;
    quantity: number;
    notes?: string;
    status: OrderRequestStatus;
    requestDate: string; // ISO
}

export enum ServiceRequestStatus {
    NEW = 'New',
    IN_REVIEW = 'In Review',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected',
    SCHEDULED = 'Scheduled',
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled',
}

export interface ServiceRequest {
    id: string;
    foundationId: string;
    foundationOrgId: string;
    serviceId: string;
    serviceName: string;
    providerId: string;
    preferredDate?: string; // YYYY-MM-DD
    appointmentDate?: string; // YYYY-MM-DD HH:MM
    notes?: string;
    status: ServiceRequestStatus;
    requestDate: string; // ISO
}

export interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  foundationId: string;
  foundationOrgId: string;
  supplierId: string;
  supplierName: string;
  items: LineItem[];
  totalAmount: number;
  notes?: string;
  status: OrderRequestStatus;
  requestDate: string; // ISO
}

// Inquiry types for suppliers who don't sell directly on platform
export enum InquiryStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  QUOTED = 'QUOTED',
  FULFILLED = 'FULFILLED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export enum InquiryUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum PreferredContactMethod {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  PLATFORM = 'PLATFORM',
}

export interface Inquiry {
  id: string;
  organizationId: string;
  supplierId: string;
  
  // Inquiry details
  subject?: string;
  message: string;
  productInterest?: string;
  quantity?: number;
  budget?: string;
  urgency?: InquiryUrgency;
  
  // Contact info
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  preferredContactMethod?: PreferredContactMethod;
  
  // Status and response
  status: InquiryStatus;
  supplierNotes?: string;
  responseMessage?: string;
  quotedAmount?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
  fulfilledAt?: string;
  
  // Related entity names (populated by backend)
  buyerName: string;
  buyerOrgId: string;
  supplierName: string;
  
  // Convenience field
  requestDate: string;
}

export interface InquiryStats {
  totalInquiries: number;
  newInquiries: number;
  pendingInquiries: number;
  fulfilledInquiries: number;
  conversionRate: string;
  recentInquiries: Inquiry[];
}

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  supplierId: string;
  supplierName: string;
  imageUrl?: string;
  stockStatus?: StockStatus;
}


export interface Conversation {
    id: string;
    name?: string; // For group chats
    participantIds: string[];
    participantNames: Record<string, string>;
    participantRoles: Record<string, UserRole>;
    lastMessageSnippet?: string;
    lastMessageTimestamp?: string;
    lastMessageSenderId?: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    content: string;
    timestamp: string; // ISO string
    isRead: boolean;
}


export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    timestamp: string;
    link?: string; // Optional link for navigation
}

export enum ApplicationStatus {
    PENDING = 'PENDING',
    REVIEWED = 'REVIEWED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

export interface Application {
    id: string;
    jobListingId: string;
    jobTitle: string;
    foundationName?: string;
    candidateId: string;
    candidateName?: string;
    status: ApplicationStatus;
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
    coverLetter?: string;
}


// SETTINGS INTERFACES

export interface PromoCode {
    id: string;
    code: string;
    discountType: 'Percentage' | 'FixedAmount' | 'FreeMinutes';
    value: number;
    expiryDate: string;
    status: 'Active' | 'Expired' | 'Disabled';
    description?: string; // e.g. "For first-time customers"
}

export type PreferredContactMethod = 'Email' | 'Phone' | 'Platform Form';
export type AvgResponseType = '< 24 h' | '2–3 d' | 'Other';
export type DigestFrequency = 'Daily' | 'Weekly' | 'None';
export type ConsultationLength = '30 min' | '60 min';

export interface TeamMember {
    id: string;
    email: string;
    role: 'Viewer' | 'Editor';
    status: 'Active' | 'Pending';
}

// Base settings for fields that might be shared
interface BaseSettings {
    companyName?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    logoAssetId?: string;
    coverAssetId?: string;
    aboutText?: string;
    description?: string; // Alias for aboutText
    vatNumber?: string;
    contactPerson?: string;
    phoneNumber?: string;
    contactEmail?: string;
    address?: string;
    canton?: string;
    regionsServed?: SwissCanton[];
    languagesSpoken?: SupportedLanguage[];
    preferredContactMethod?: PreferredContactMethod;
    avgResponseType?: AvgResponseType;
    externalBookingLink?: string;
    directOrderLink?: string; // Supplier only, but keep here for type simplicity
    newRequestEmailToggle?: boolean;
    digestRadio?: DigestFrequency;
    promoRedemptionAlertsToggle?: boolean;
    autoRespondToggle?: boolean;
    promoCodes?: PromoCode[];
    currentTier?: 'Basic' | 'Essential' | 'Professional' | 'Suppliers' | 'Service Providers'; // UPDATED
    nextInvoiceDate?: string;
    stripePortalLink?: string;
    timeZone?: string;
    currency?: 'CHF' | 'EUR';
    anonymisedBenchmarkDataOptIn?: boolean;
    teamMembers?: TeamMember[];
    hidePubliclyToggle?: boolean;
    gdprDataDeletionRequestMade?: boolean;
    // Foundation-specific fields
    capacity?: number;
    pedagogy?: string[];
    // Supplier-specific fields
    productCategory?: string; // Legacy single category
    productCategories?: string[]; // New: flexible product category tags
    minimumOrderQuantity?: number;
    catalogUrl?: string;
    // Service Provider-specific fields
    serviceType?: string;
    serviceCategories?: string[];
    deliveryType?: string;
    bookingLink?: string;
    // Educator/Parent-specific fields
    shortBio?: string;
    avatarAssetId?: string;
    avatarUrl?: string;
    cvAssetId?: string;
    firstName?: string;
    lastName?: string;
    email?: string; // User's personal email (for Educator/Parent)
    workExperience?: string;
    education?: string;
    certifications?: string[];
    skills?: string[];
    availability?: string;
    cvUrl?: string;
}

// Supplier-specific settings
export interface SupplierSettings extends BaseSettings {
    defaultMOQ?: number;
    packSize?: number;
    autoAcceptOrderQtyLimit?: number;
}

// Provider-specific settings
export interface ProviderSettings extends BaseSettings {
    calComLink?: string;
    deliveryTypeToggleRemote?: boolean;
    defaultConsultationLength?: ConsultationLength;
}

// Foundation-specific settings
export interface FoundationSettings extends BaseSettings {
    plan?: 'Basic' | 'Essential' | 'Professional'; // UPDATED
    newRequestEmailToggle?: boolean;
    digestRadio?: DigestFrequency;
    autoRespondToggle?: boolean;
}

// This will be the main type used in the settings form state
export type SettingsFormData = SupplierSettings & ProviderSettings & FoundationSettings;

// ADMIN TYPES
export interface PricingPlan {
    role: UserRole;
    name: string;
    price: {
        monthly: number;
        annually: number;
        annualEquivalent: number;
    };
    features: string[];
    isPopular: boolean;
    emoji?: string;
    monthlyPriceText?: string;
    annualPlanText?: string;
    tagline?: string;
    description?: string;
}

export interface ContentModerationItem {
    id: string;
    type: 'Product' | 'Service' | 'Job Post';
    title: string;
    authorName: string;
    submittedDate: string; // ISO
}

export type SystemStatusLevel = 'Operational' | 'Degraded' | 'Outage';

export interface SystemStatus {
  status: SystemStatusLevel;
  components: {
    api: SystemStatusLevel;
    database: SystemStatusLevel;
    authService: SystemStatusLevel;
  };
}

export interface SystemMetadata {
  environment: 'Production' | 'Staging';
  version: string;
  uptimeMinutes: number;
  lastHealthCheck: string; // ISO string
}

export interface ServerPerformanceMetrics {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  uptimeDays: number;
}

export interface DatabasePerformanceMetrics {
  activeConnections: number;
  maxConnections: number;
  avgQueryTimeMs: number;
  storageUsedGb: number;
  storageTotalGb: number;
  status: 'Healthy' | 'Unhealthy';
}

export interface AppPerformanceMetrics {
  activeUsers: number;
  requestsPerMinute: number;
  avgResponseTimeMs: number;
  errorRate: number; // percentage
}

export type SystemEventType = 'Health Check' | 'Database Backup' | 'Memory Alert' | 'API Improvement';

export interface SystemEvent {
  id: string;
  timestamp: string; // ISO string
  type: SystemEventType;
  message: string;
}

export interface SystemMonitoringData {
  systemStatus: SystemStatus;
  metadata: SystemMetadata;
  serverPerformance: ServerPerformanceMetrics;
  databasePerformance: DatabasePerformanceMetrics;
  appPerformance: AppPerformanceMetrics;
  events: SystemEvent[];
}

export interface LogEntry {
    id: string;
    timestamp: string; // ISO
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}

export interface SecurityAlert {
    id: string;
    timestamp: string; // ISO
    event: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    sourceIp: string;
}

export interface PlatformSettings {
    platformName: string;
    metadataDescription: string;
    logoUrl?: string;
    faviconUrl?: string;
    /**
     * Platform configuration settings
     */
    // Add fields found in MOCK_PLATFORM_SETTINGS to fix potential type errors if they exist
    enableUserRegistration?: boolean;
    enableEmailNotifications?: boolean;
    enableSmsNotifications?: boolean;
    enableMaintenanceMode?: boolean;
    /** Maximum file upload size in bytes */
    maxFileUploadSize?: number;
    /** Supported file types (MIME types, e.g., 'image/png', 'application/pdf') */
    supportedFileTypes?: string[];
    enablePublicRegistration?: boolean;
    /** Array of enabled language codes (e.g., ['en', 'fr', 'de']) */
    enabledLanguages?: string[];
    defaultLanguage?: string;
    enableCaptcha?: boolean;
    requireEmailVerification?: boolean;
}

export interface Asset {
  id: string;
  publicUrl: string;
  filename: string;
  mimeType?: string;
  size?: number;
}

export interface FrontendSettings {
  siteName: string;
  siteDescription?: string;
  siteKeywords?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  cookiePolicyUrl?: string;
  enableDarkMode?: boolean;
  defaultTheme?: string;
  logoAsset?: Asset;
  faviconAsset?: Asset;
  ogImageAsset?: Asset;
  sidebarLogoAsset?: Asset;
}

// ACTIVE CLIENT FEATURE TYPES
export enum VendorClientReason {
    NEW = 'NEW',
    TRIAL = 'TRIAL',
    CONTRACT = 'CONTRACT',
    PAUSED = 'PAUSED',
    TERMINATED = 'TERMINATED',
}

export const VendorClientReasonLabels: Record<VendorClientReason, string> = {
    [VendorClientReason.NEW]: 'New Client',
    [VendorClientReason.TRIAL]: 'Trial',
    [VendorClientReason.CONTRACT]: 'Contract',
    [VendorClientReason.PAUSED]: 'Paused',
    [VendorClientReason.TERMINATED]: 'Terminated',
};

export interface VendorClient {
    id: string;
    vendorId: string; // orgId of the supplier/service provider
    orgId: string; // orgId of the foundation/daycare
    isActive: boolean;
    reason?: VendorClientReason;
    note?: string;
    markedByUserId: string;
    markedAt: string; // ISO date string
    deactivatedAt?: string; // ISO date string
    lastAdminNotifiedAt?: string; // ISO date string
}
