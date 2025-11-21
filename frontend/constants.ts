// [FIX] Imported SwissCanton type to resolve reference error.
import { UserRole, User, Product, Service, JobListing, CandidateProfile, Partner, HRDocument, Course, PolicyDocument, ParentLead, LeadMainStatus, FoundationLeadResponseStatus, Organization, PolicyAlert, PolicyAlertType, ELearningContentType, LanguageCode, HR_CATEGORIES, ELEARNING_CATEGORIES, POLICY_TYPES_ENUM, POLICY_CATEGORIES, PolicyType, SWISS_CANTONS, StockStatus, ServiceRequest, OrderRequest, OrderRequestStatus, ServiceRequestStatus, Order, Message, Conversation, AppNotification, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES, SupplierSettings, ProviderSettings, PreferredContactMethod, AvgResponseType, DigestFrequency, ConsultationLength, SupportedLanguage, Application, PricingPlan, ContentModerationItem, LogEntry, SecurityAlert, PlatformSettings, FoundationSettings, SwissCanton, VendorClient, VendorClientReason, SystemMonitoringData } from './types';

// Re-export SWISS_CANTONS so it can be imported from this module
export { SWISS_CANTONS, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES };

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

// Production-ready settings (mock data removed)
export const MOCK_PLATFORM_SETTINGS: PlatformSettings = {
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

// Platform data constants
export const MOCK_POLICY_ALERTS: PolicyAlert[] = [];

// Empty arrays for production (data fetched from API)
export const MOCK_PARENT_LEADS: ParentLead[] = [];
export const MOCK_CANDIDATE_PROFILES: CandidateProfile[] = [];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_SERVICES: Service[] = [];
export const MOCK_JOB_LISTINGS: JobListing[] = [];
export const MOCK_APPLICATIONS: Application[] = [];
export const MOCK_SERVICE_REQUESTS: ServiceRequest[] = [];
export const MOCK_ORDERS: Order[] = [];
export const MOCK_CONVERSATIONS: Conversation[] = [];
export const MOCK_MESSAGES: Message[] = [];
export const MOCK_NOTIFICATIONS: AppNotification[] = [];
export const MOCK_HR_DOCS: HRDocument[] = [];
export const MOCK_COURSES: Course[] = [];
export const MOCK_POLICY_DOCS: PolicyDocument[] = [];
export const MOCK_ORDER_REQUESTS: OrderRequest[] = [];
export const MOCK_VENDOR_CLIENTS: VendorClient[] = [];

// Empty organizations array for production
export const MOCK_ORGANIZATIONS: Organization[] = [];

// Logs and alerts for production monitoring
export const MOCK_SYSTEM_LOGS: LogEntry[] = [];
export const MOCK_SECURITY_ALERTS: SecurityAlert[] = [];

export const MOCK_FOUNDATION_SETTINGS: FoundationSettings = {
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

// Production pricing plans (real business logic)
export const MOCK_PRICING_PLANS: PricingPlan[] = [
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
  {
    role: UserRole.FOUNDATION,
    name: 'Enterprise',
    emoji: '⚡',
    price: { monthly: 499, annually: 5389, annualEquivalent: 449 },
    monthlyPriceText: '💰 CHF 499 / month',
    annualPlanText: 'CHF 5,389 / year (save 10%)',
    tagline: 'Perfect for: Multi-site operators who need maximum automation and premium support.',
    description: '✨ Scale across sites while maintaining consistent excellence and zero admin headaches.',
    features: [
      'Everything in Professional',
      'Multi-site management',
      'Advanced analytics & reporting',
      'Dedicated account manager',
      'Custom integrations & API access',
      'White-label branding options',
    ],
    isPopular: false,
  },
  // Supplier Plans
  {
    role: UserRole.PRODUCT_SUPPLIER,
    name: 'Suppliers',
    emoji: '📦',
    price: { monthly: 99, annually: 1069, annualEquivalent: 89 },
    monthlyPriceText: '💰 CHF 99 / month',
    annualPlanText: 'CHF 1,069 / year (save 10%)',
    tagline: 'Perfect for: Suppliers focused on daycare market growth.',
    description: '✨ Reach daycares efficiently with minimal admin—fair fees, simple pricing.',
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
  // Service Provider Plans
  {
    role: UserRole.SERVICE_PROVIDER,
    name: 'Service Providers',
    emoji: '🔧',
    price: { monthly: 149, annually: 1609, annualEquivalent: 134 },
    monthlyPriceText: '💰 CHF 149 / month',
    annualPlanText: 'CHF 1,609 / year (save 10%)',
    tagline: 'Perfect for: Service providers targeting professional daycare partnerships.',
    description: '✨ Scale your service business with complete daycare relationship management.',
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

// Content moderation items (empty for production)
export const MOCK_CONTENT_MODERATION_ITEMS: ContentModerationItem[] = [];

// Monitor data (empty for production)
export const MOCK_SYSTEM_MONITORING_DATA: SystemMonitoringData = {
  totalUsers: 0,
  activeSessions: 0,
  systemLoad: 0,
  memoryUsage: 0,
  diskUsage: 0,
  uptime: 0,
  lastGenerated: new Date().toISOString(),
};

// Settings defaults for production
export const MOCK_SUPPLIER_SETTINGS: SupplierSettings = {
  enableNotifications: true,
  enableDataExport: true,
  autoAssignRoles: false,
  enableAutoApproval: false,
  requireAdminApproval: true,
  enableLeadTracking: true,
};

export const MOCK_PROVIDER_SETTINGS: ProviderSettings = {
  enableNotifications: true,
  enableDataExport: true,
  autoAssignRoles: false,
  enableAutoApproval: false,
  requireAdminApproval: true,
  enableLeadTracking: true,
};

// Empty mock data for production (fetched from API)
export const MOCK_PARTNERS: Partner[] = [];
export const MOCK_LOG_ENTRIES: LogEntry[] = [];

// Build timestamp to force cache refresh: 2025-11-19T11:44:00Z
// Suggested Service Categories (users can add custom ones)
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

// Suggested Product Categories (users can add custom ones)
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
