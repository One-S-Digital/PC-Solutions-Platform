

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
  region?: SwissCanton | string;
  plan?: string;
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
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Asset relations
  logoAssetId?: string;
  coverAssetId?: string;
  
  // Legacy field compatibility
  logoUrl?: string;
  coverImageUrl?: string;
}


export interface Product {
  // Core Prisma Product fields
  id: string;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  tags: string[];
  status: string; // ACTIVE, INACTIVE, PENDING, REJECTED
  isActive: boolean;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
  
  // Asset relation
  imageAssetId?: string;
  
  // Legacy frontend fields for compatibility
  supplierName?: string;
  supplierLogo?: string;
  imageUrl?: string;
  stockStatus?: string;
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
  category: ServiceCategory;
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
  deliveryType?: string;
  priceInfo?: string;
}
export const SERVICE_CATEGORIES: ServiceCategory[] = [ServiceCategory.CLEANING, ServiceCategory.IT_SUPPORT, ServiceCategory.MAINTENANCE, ServiceCategory.CONSULTING, ServiceCategory.TRAINING, ServiceCategory.OTHER];
export type ServiceDeliveryType = 'On-site' | 'Remote' | 'Hybrid';
export const SERVICE_DELIVERY_TYPES: ServiceDeliveryType[] = ['On-site', 'Remote', 'Hybrid'];

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'FILLED';
export type JobContractType = 'FULL_TIME' | 'PART_TIME' | 'CDI' | 'CDD' | 'INTERNSHIP';

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


export interface Partner {
    id: string;
    name: string;
    logoUrl: string;
    description: string;
    type: 'Academic' | 'Corporate' | 'Governmental';
    countryRegion: string;
    websiteUrl: string;
}

export type UploadableContentType = 'e-learning' | 'hr' | 'policy';
export type ELearningContentType = 'Course' | 'Video' | 'PDF' | 'Link';
export const ELearningContentType = {
    COURSE: 'Course' as ELearningContentType,
    VIDEO: 'Video' as ELearningContentType,
    PDF: 'PDF' as ELearningContentType,
    LINK: 'Link' as ELearningContentType,
};
export type ELearningCategory = 'Safety & Hygiene' | 'Pedagogy' | 'Child Development' | 'Administration' | 'Special Needs';
export const ELEARNING_CATEGORIES: ELearningCategory[] = ['Safety & Hygiene', 'Pedagogy', 'Child Development', 'Administration', 'Special Needs'];

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
}
export type LanguageCode = 'EN' | 'FR' | 'DE';

export type HRCategory = 'Staff Management' | 'Child & Family Onboarding' | 'Daily Operations & Compliance' | 'Policy & Legal Documents' | 'Training & Certification' | 'Templates & Letters';
export const HR_CATEGORIES: HRCategory[] = ['Staff Management', 'Child & Family Onboarding', 'Daily Operations & Compliance', 'Policy & Legal Documents', 'Training & Certification', 'Templates & Letters'];

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
}

export type PolicyBroadCategory = 'Cantonal Policies' | 'National Regulations' | 'Compliance Requirements' | 'Updates & News' | 'Official Downloads';
export const POLICY_BROAD_CATEGORIES: PolicyBroadCategory[] = ['Cantonal Policies', 'National Regulations', 'Compliance Requirements', 'Updates & News', 'Official Downloads'];
export enum PolicyType {
    REGULATION = 'Regulation',
    GUIDELINE = 'Guideline',
    NEWS = 'News Update',
    FORM = 'Official Form',
}
export const POLICY_TYPES_ENUM = Object.values(PolicyType);

export interface PolicyDocument {
    id: string;
    title: string;
    category: PolicyBroadCategory;
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

// Mock User for Parent
export const MOCK_PARENT_USER: User = {
  id: 'parentUser123',
  name: 'Sophie D.', // Anonymized
  email: 'sophie.d@example-parent.com', // Anonymized
  role: UserRole.PARENT,
  avatarUrl: 'https://picsum.photos/seed/sophie/100/100',
  status: 'Active',
  lastLogin: '2024-07-22T08:00:00Z',
  region: 'Geneva',
  memberSince: '2024-07-15T10:00:00Z',
};


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
    aboutText?: string;
    vatNumber?: string;
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
}

// ACTIVE CLIENT FEATURE TYPES
export enum VendorClientReason {
    NEW = 'New Client',
    TRIAL = 'Trial',
    CONTRACT = 'Contract',
    PAUSED = 'Paused',
    TERMINATED = 'Terminated',
}

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
