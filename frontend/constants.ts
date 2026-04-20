// [FIX] Imported SwissCanton type to resolve reference error.
import { UserRole, User, Product, Service, JobListing, CandidateProfile, Partner, HRDocument, Course, PolicyDocument, ParentLead, LeadMainStatus, FoundationLeadResponseStatus, Organization, PolicyAlert, PolicyAlertType, ELearningContentType, LanguageCode, HR_CATEGORIES, ELEARNING_CATEGORIES, POLICY_TYPES_ENUM, POLICY_CATEGORIES, PolicyType, SWISS_CANTONS, StockStatus, ServiceRequest, OrderRequest, OrderRequestStatus, ServiceRequestStatus, Order, Message, Conversation, AppNotification, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES, SupplierSettings, ProviderSettings, PreferredContactMethod, AvgResponseType, DigestFrequency, ConsultationLength, SupportedLanguage, Application, PricingPlan, ContentModerationItem, LogEntry, SecurityAlert, PlatformSettings, FoundationSettings, SwissCanton, VendorClient, VendorClientReason, SystemMonitoringData } from './types';

// Re-export SWISS_CANTONS so it can be imported from this module
export { SWISS_CANTONS, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES };

// Sentinel value meaning "applies to all regions/cantons".
export const ALL_REGIONS_OPTION = 'All' as const;

// Convenience list for selects where users can choose to cover all cantons.
export const SWISS_CANTONS_WITH_ALL = [ALL_REGIONS_OPTION, ...SWISS_CANTONS] as const;

// Restricted list of valid educator job roles. No free-text input is allowed; users must pick from this list.
export const EDUCATOR_JOB_ROLES = ['Direction', 'EDE', 'ASE', 'Auxiliaire', 'Cleaning'] as const;
export type EducatorJobRole = typeof EDUCATOR_JOB_ROLES[number];

export const APP_NAME = "Pro Crèche Solutions";

// hCaptcha Configuration
export const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'; // Test key for development
export const HCAPTCHA_THEME = 'light' as const;
export const HCAPTCHA_SIZE = 'normal' as const;

// Standard Tailwind classes for input fields
const COMMON_INPUT_CLASSES_BASE = "block w-full bg-white placeholder-gray-400 shadow-sm border border-gray-300 rounded-button focus:outline-none focus:ring-1 focus:ring-swiss-mint focus:border-swiss-mint";
const COMMON_INPUT_CLASSES_PADDING_DEFAULT = "px-3 py-2";
const COMMON_INPUT_CLASSES_PADDING_ICON = "pl-10 pr-3 py-2"; // For inputs with a leading icon

export const STANDARD_INPUT_FIELD = `${COMMON_INPUT_CLASSES_BASE} ${COMMON_INPUT_CLASSES_PADDING_DEFAULT}`;
export const ICON_INPUT_FIELD = `${COMMON_INPUT_CLASSES_BASE} ${COMMON_INPUT_CLASSES_PADDING_ICON}`;

// Policy Constants (essential for admin functionality)
export const COUNTRIES_FOR_POLICIES = ['Switzerland', 'Germany', 'Austria', 'France'] as const;
export type CountryForPolicies = typeof COUNTRIES_FOR_POLICIES[number];

export const REGIONS_BY_COUNTRY: Record<CountryForPolicies, readonly string[]> = {
  Switzerland: ['Basel-Stadt', 'Basel-Landschaft', 'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel', 'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Thurgau', 'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zürich'],
  Germany: ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'],
  Austria: ['Burgenland', 'Carinthia', 'Lower Austria', 'Salzburg', 'Styria', 'Tyrol', 'Upper Austria', 'Vienna', 'Vorarlberg'],
  France: ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'],
};

// =============================================================================
// DEFAULT PLATFORM SETTINGS
// These should eventually be fetched from the API/backend configuration
// =============================================================================
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'Pro Crèche Solutions',
  metadataDescription: 'A platform connecting parents with childcare providers',
  enableUserRegistration: true,
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  enableMaintenanceMode: false,
  maxFileUploadSize: 10485760, // 10MB
  supportedFileTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
  enablePublicRegistration: true,
  enabledLanguages: ['en', 'fr', 'de'],
  defaultLanguage: 'en',
  enableCaptcha: true,
  requireEmailVerification: true,
};

// =============================================================================
// INITIAL STATE VALUES
// Empty arrays used as initial state while data loads from API
// =============================================================================
export const INITIAL_POLICY_ALERTS: PolicyAlert[] = [];
export const INITIAL_PARENT_LEADS: ParentLead[] = [];
export const INITIAL_CANDIDATE_PROFILES: CandidateProfile[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_SERVICES: Service[] = [];
export const INITIAL_JOB_LISTINGS: JobListing[] = [];
export const INITIAL_APPLICATIONS: Application[] = [];
export const INITIAL_SERVICE_REQUESTS: ServiceRequest[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_CONVERSATIONS: Conversation[] = [];
export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
export const INITIAL_HR_DOCS: HRDocument[] = [];
export const INITIAL_COURSES: Course[] = [];
export const INITIAL_POLICY_DOCS: PolicyDocument[] = [];
export const INITIAL_ORDER_REQUESTS: OrderRequest[] = [];
export const INITIAL_VENDOR_CLIENTS: VendorClient[] = [];
export const INITIAL_ORGANIZATIONS: Organization[] = [];
export const INITIAL_SYSTEM_LOGS: LogEntry[] = [];
export const INITIAL_SECURITY_ALERTS: SecurityAlert[] = [];
export const INITIAL_CONTENT_MODERATION_ITEMS: ContentModerationItem[] = [];
export const INITIAL_PARTNERS: Partner[] = [];
export const INITIAL_LOG_ENTRIES: LogEntry[] = [];

// =============================================================================
// DEFAULT ADMIN SETTINGS
// Used as default values for admin forms before API data loads
// =============================================================================
export const DEFAULT_ADMIN_FOUNDATION_SETTINGS = {
  enableParentEnquiries: true,
  enableMessaging: true,
  enableDataExport: true,
  autoAssignRoles: false,
  enableAutoApproval: false,
  requireAdminApproval: true,
  enableNotifications: true,
  defaultLeadStatus: LeadMainStatus.NEW,
  enableLeadTracking: true,
};

export const DEFAULT_ADMIN_SUPPLIER_SETTINGS = {
  enableNotifications: true,
  enableDataExport: true,
  autoAssignRoles: false,
  enableAutoApproval: false,
  requireAdminApproval: true,
  enableLeadTracking: true,
};

export const DEFAULT_ADMIN_PROVIDER_SETTINGS = {
  enableNotifications: true,
  enableDataExport: true,
  autoAssignRoles: false,
  enableAutoApproval: false,
  requireAdminApproval: true,
  enableLeadTracking: true,
};

// Default system monitoring data structure (actual data should come from API)
export const DEFAULT_SYSTEM_MONITORING_DATA: SystemMonitoringData = {
  systemStatus: {
    status: 'Operational',
    components: {
      api: 'Operational',
      database: 'Operational',
      authService: 'Operational',
    },
  },
  metadata: {
    environment: 'Production',
    version: '1.0.0',
    uptimeMinutes: 0,
    lastHealthCheck: new Date().toISOString(),
  },
  serverPerformance: {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    uptimeDays: 0,
  },
  databasePerformance: {
    activeConnections: 0,
    maxConnections: 100,
    avgQueryTimeMs: 0,
    storageUsedGb: 0,
    storageTotalGb: 100,
    status: 'Healthy',
  },
  appPerformance: {
    activeUsers: 0,
    requestsPerMinute: 0,
    avgResponseTimeMs: 0,
    errorRate: 0,
  },
  events: [],
};

// =============================================================================
// PRICING PLANS (Business Configuration)
// These are actual pricing plans - should be fetched from backend in production
// =============================================================================
export const PRICING_PLANS: PricingPlan[] = [
  // Daycare Plans
  {
    role: UserRole.FOUNDATION,
    name: 'Basic',
    emoji: '🟢',
    price: { monthly: 69, annually: 745, annualEquivalent: 62 },
    monthlyPriceText: '💰 CHF 69 / month',
    annualPlanText: 'CHF 745 / year (save 10%)',
    tagline: 'Perfect for: Small daycares who want essential tools without complexity.',
    description: '✨ Get immediate access to suppliers, compliance info, and support—everything you need to operate smoothly at a low cost.',
    features: [
      'Supplier & service provider marketplace',
      'State policy hub (by canton)',
      'Multilingual interface (EN/FR/DE)',
      'Email support',
    ],
    isPopular: false,
  },
  {
    role: UserRole.FOUNDATION,
    name: 'Essential',
    emoji: '🔵',
    price: { monthly: 129, annually: 1390, annualEquivalent: 115 },
    monthlyPriceText: '💰 CHF 129 / month',
    annualPlanText: 'CHF 1,390 / year (save 10%)',
    tagline: 'Perfect for: Single-site daycares who want to save time with parent leads and compliant HR tools.',
    description: '✨ Win parents faster, stay compliant, and manage enquiries with ease—all from one simple dashboard.',
    features: [
      'Everything in Basic',
      'Parent leads inbox + auto-matching system',
      'HR & compliance document library (Swiss-validated)',
      'Parent enquiry tracker with quick replies',
    ],
    isPopular: true,
  },
  {
    role: UserRole.FOUNDATION,
    name: 'Professional',
    emoji: '🔴',
    price: { monthly: 259, annually: 2790, annualEquivalent: 232 },
    monthlyPriceText: '💰 CHF 259 / month',
    annualPlanText: 'CHF 2,790 / year (save 10%)',
    tagline: 'Perfect for: Medium-sized daycares ready to grow and professionalize operations.',
    description: '✨ Recruit and train staff, handle unlimited parent enquiries, and deliver excellence without adding admin burden.',
    features: [
      'Everything in Essential',
      'Recruitment module',
      'Unlimited parent enquiries',
      'E-learning for staff',
      'Team management & tools',
      'Priority support',
    ],
    isPopular: false,
  },
  // Supplier Plans - Pricing based on enquiry
  {
    role: UserRole.PRODUCT_SUPPLIER,
    name: 'Suppliers',
    emoji: '📦',
    price: { monthly: 0, annually: 0, annualEquivalent: 0 },
    monthlyPriceText: '',
    annualPlanText: '',
    tagline: 'Perfect for: Suppliers focused on daycare market growth.',
    description: '✨ Reach daycares efficiently with minimal admin—fair fees, simple pricing. Contact us for custom pricing.',
    features: [
      'Product listings & marketplace access',
      'Lead management system',
      'Order tracking & fulfillment',
      'Multi-language support',
      'Sales analytics dashboard',
      'Email support',
    ],
    isPopular: false,
  },
  // Service Provider Plans - Pricing based on enquiry
  {
    role: UserRole.SERVICE_PROVIDER,
    name: 'Service Providers',
    emoji: '🔧',
    price: { monthly: 0, annually: 0, annualEquivalent: 0 },
    monthlyPriceText: '',
    annualPlanText: '',
    tagline: 'Perfect for: Service providers targeting professional daycare partnerships.',
    description: '✨ Scale your service business with complete daycare relationship management. Contact us for custom pricing.',
    features: [
      'Service listings & marketplace access',
      'Appointment scheduling system',
      'Client relationship management',
      'Revenue tracking & reporting',
      'Multi-language support',
      'Priority support',
    ],
    isPopular: false,
  },
];

// =============================================================================
// SUGGESTED CATEGORIES AND OPTIONS
// These are suggestion lists for forms - not mock data
// =============================================================================
export const SUGGESTED_SERVICE_CATEGORIES = [
  'Cleaning & Maintenance',
  'IT & Technical Support',
  'Facilities Maintenance',
  'Consulting',
  'Training & Coaching',
  'Catering',
  'Security Services',
  'Landscaping & Gardening',
  'Transportation',
  'Pest Control',
  'HVAC Services',
  'Plumbing',
  'Electrical Services',
  'Accounting & Finance',
  'Legal Services',
  'Marketing & Design',
  'Photography & Videography',
  'Event Planning',
  'Other',
] as const;

export const SUGGESTED_PRODUCT_CATEGORIES = [
  'Educational Toys',
  'Furniture',
  'Books & Learning Materials',
  'Art & Craft Supplies',
  'Outdoor Play Equipment',
  'Safety & Hygiene Products',
  'Kitchen & Dining',
  'Bedding & Textiles',
  'Technology & Electronics',
  'Musical Instruments',
  'Sports Equipment',
  'Sensory & Therapy Tools',
  'Office Supplies',
  'Cleaning Supplies',
  'Food & Snacks',
  'Baby Care Products',
  'First Aid & Medical',
  'Storage & Organization',
  'Other',
] as const;

export const SUGGESTED_PRODUCT_COMPLIANCE_TAGS = [
  'EN-71 Certified',
  'CE Marked',
  'FSC Certified',
  'Fire-Retardant',
  'BPA-Free',
  'Allergen-Free',
  'Organic Materials',
  'Recycled Materials',
  'Hypoallergenic',
  'Food Grade',
] as const;

export const SUGGESTED_PRODUCT_AGE_RANGES = [
  'Infant (0-18 months)',
  'Toddler (18-36 months)',
  'Preschool (3-6 years)',
  'School-age (6-12 years)',
] as const;

export const SUGGESTED_PRODUCT_DELIVERY_METHODS = [
  'Courier Delivery',
  'Supplier Delivery',
  'Pickup',
  'Installation Included',
] as const;

// =============================================================================
// PEDAGOGY OPTIONS
// Centralized definition for pedagogy approaches used by foundations
// Each option has a translation key and a database value
// =============================================================================
export const PEDAGOGY_OPTIONS = [
  { key: 'montessori', value: 'Montessori' },
  { key: 'reggioEmilia', value: 'Reggio Emilia' },
  { key: 'waldorf', value: 'Waldorf' },
  { key: 'playBased', value: 'Play-based' },
  { key: 'academicFocused', value: 'Academic-focused' },
  { key: 'bilingual', value: 'Bilingual' },
  { key: 'natureBased', value: 'Nature-based' },
  { key: 'inclusive', value: 'Inclusive' },
  { key: 'other', value: 'Other' },
] as const;

// Map from database value to translation key (for displaying stored values)
export const PEDAGOGY_KEY_MAP: Record<string, string> = Object.fromEntries(
  PEDAGOGY_OPTIONS.map(opt => [opt.value, opt.key])
);

