



import { UserRole, User, Product, Service, JobListing, CandidateProfile, Partner, HRDocument, Course, PolicyDocument, ParentLead, LeadMainStatus, FoundationLeadResponseStatus, Organization, PolicyAlert, PolicyAlertType, ELearningContentType, LanguageCode, HR_CATEGORIES, ELEARNING_CATEGORIES, POLICY_TYPES_ENUM, POLICY_BROAD_CATEGORIES, PolicyType, SWISS_CANTONS, StockStatus, ServiceRequest, OrderRequest, OrderRequestStatus, ServiceRequestStatus, Order, Message, Conversation, AppNotification, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES, SupplierSettings, ProviderSettings, PreferredContactMethod, AvgResponseType, DigestFrequency, ConsultationLength, SupportedLanguage, Application, MOCK_PARENT_USER, PricingPlan, ContentModerationItem, SystemMetric, LogEntry, SecurityAlert, PlatformSettings } from './types';

// Re-export SWISS_CANTONS so it can be imported from this module
export { SWISS_CANTONS, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES };

export const APP_NAME = "Pro Crèche Solutions";

// ===================================================================================
// WARNING: Client-Side Mock Data
// This file contains mock data for development and demonstration purposes.
// Avoid storing extensive, realistic, or sensitive Personally Identifiable Information (PII)
// in client-side bundled code. For production, data should be fetched from a secure backend.
// The PII below has been significantly reduced and anonymized.
// ===================================================================================


// Standard Tailwind classes for input fields
const COMMON_INPUT_CLASSES_BASE = "block w-full bg-white placeholder-gray-400 shadow-sm border border-gray-300 rounded-button focus:outline-none focus:ring-1 focus:ring-swiss-mint focus:border-swiss-mint";
const COMMON_INPUT_CLASSES_PADDING_DEFAULT = "px-3 py-2";
const COMMON_INPUT_CLASSES_PADDING_ICON = "pl-10 pr-3 py-2"; // For inputs with a leading icon

export const STANDARD_INPUT_FIELD = `${COMMON_INPUT_CLASSES_BASE} ${COMMON_INPUT_CLASSES_PADDING_DEFAULT}`;
export const ICON_INPUT_FIELD = `${COMMON_INPUT_CLASSES_BASE} ${COMMON_INPUT_CLASSES_PADDING_ICON}`;


export const MOCK_FOUNDATION_ORG_KINDERWELT: Organization = {
  id: 'orgKinderwelt123',
  name: 'Crèche KinderWelt (Vaud)',
  type: 'foundation',
  region: 'Vaud',
  logoUrl: 'https://picsum.photos/seed/orgKinderwelt/100/100',
  coverImageUrl: 'https://picsum.photos/seed/kinderweltCover/1200/300',
  email: 'info@example-kinderwelt.ch',
  phone: '[Phone Redacted]',
  website: 'https://example-kinderwelt.ch',
  address: '[Address Redacted]',
  description: 'A nurturing environment for early childhood development.',
  tags: ['Bilingual FR/EN', 'Montessori Inspired'],
  capacity: 50,
  pedagogy: ['Montessori', 'Play-based'],
  languagesSpoken: ['French', 'English'],
  rating: 4.8,
  badges: ['Top Rated']
};

export const MOCK_SUPPLIER_ORGANIZATION: Organization = {
  id: 'orgEcoGoodsGlobal',
  name: 'EcoGoods Global Supplies',
  type: 'supplier',
  region: 'Zurich',
  logoUrl: 'https://picsum.photos/seed/ecogoods/100/100',
  coverImageUrl: 'https://picsum.photos/seed/ecogoodsCover/1200/300',
  email: 'sales@example-ecogoods.ch',
  phone: '[Phone Redacted]',
  website: 'https://example-ecogoods.ch',
  address: '[Address Redacted]',
  description: 'Providers of eco-friendly toys and materials.',
  tags: ['Eco-Friendly', 'Wooden Toys'],
  rating: 4.5,
  badges: ['Verified Partner'],
  directOrderLink: 'https://supplier.example.com/direct-order-page'
};

export const MOCK_SERVICE_PROVIDER_ORGANIZATION: Organization = {
  id: 'orgProCleanSolutions',
  name: 'ProClean Solutions GmbH',
  type: 'service_provider',
  region: 'Geneva',
  logoUrl: 'https://picsum.photos/seed/proclean/100/100',
  coverImageUrl: 'https://picsum.photos/seed/procleanCover/1200/300',
  email: 'contact@example-proclean.ch',
  phone: '[Phone Redacted]',
  website: 'https://example-proclean.ch',
  address: '[Address Redacted]',
  description: 'Specialized cleaning services for daycares.',
  tags: ['Professional Cleaning', 'Hygiene Services'],
  rating: 4.7,
  badges: ['Promo Active']
};


export const MOCK_FOUNDATION_USER: User = { 
  id: 'userFoundation123',
  name: 'Astrid L.', // Anonymized
  email: 'astrid.l@example-foundation.com', // Anonymized
  role: UserRole.FOUNDATION,
  avatarUrl: 'https://picsum.photos/seed/astrid/100/100',
  status: 'Active',
  lastLogin: '2024-07-20T10:00:00Z',
  region: 'Vaud',
  orgId: MOCK_FOUNDATION_ORG_KINDERWELT.id,
  orgName: MOCK_FOUNDATION_ORG_KINDERWELT.name,
};

// MOCK_PARENT_USER is now imported from types.ts
export { MOCK_PARENT_USER };


export const MOCK_SUPER_ADMIN_USER: User = {
  id: 'adminPCS001',
  name: 'PCS Super Admin',
  email: 'superadmin@example-pcs.com', // Anonymized
  role: UserRole.SUPER_ADMIN,
  avatarUrl: 'https://picsum.photos/seed/adminpcs/100/100',
  status: 'Active',
  lastLogin: new Date().toISOString(),
  region: 'Switzerland',
};

export const MOCK_SUPPLIER_USER: User = { 
  id: 'supplierUser001',
  name: 'Max W.', // Anonymized
  email: 'max.w@example-supplier.com', // Anonymized
  role: UserRole.PRODUCT_SUPPLIER,
  orgId: MOCK_SUPPLIER_ORGANIZATION.id,
  orgName: MOCK_SUPPLIER_ORGANIZATION.name,
  avatarUrl: 'https://picsum.photos/seed/maxweber/100/100',
  status: 'Active',
  lastLogin: '2024-07-23T14:00:00Z',
  region: 'Zurich',
};

export const MOCK_SERVICE_PROVIDER_USER: User = {
  id: 'serviceProviderUser001',
  name: 'Lena A.', // Anonymized
  email: 'lena.a@example-provider.com', // Anonymized
  role: UserRole.SERVICE_PROVIDER,
  orgId: MOCK_SERVICE_PROVIDER_ORGANIZATION.id,
  orgName: MOCK_SERVICE_PROVIDER_ORGANIZATION.name,
  avatarUrl: 'https://picsum.photos/seed/lenaalthaus/100/100',
  status: 'Active',
  lastLogin: '2024-07-24T09:30:00Z',
  region: 'Geneva',
};

export const MOCK_EDUCATOR_USER: User = {
  id: 'educatorUser001',
  name: 'Tom F.', // Anonymized
  email: 'tom.f@example-edu.com', // Anonymized
  role: UserRole.EDUCATOR,
  avatarUrl: 'https://picsum.photos/seed/tomfischer/100/100',
  status: 'Active',
  lastLogin: '2024-07-24T11:00:00Z',
  region: 'Bern',
};


export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', title: 'Eco Wooden Blocks Set', supplierId: MOCK_SUPPLIER_ORGANIZATION.id, supplierName: MOCK_SUPPLIER_ORGANIZATION.name, supplierLogo: MOCK_SUPPLIER_ORGANIZATION.logoUrl, description: 'Sustainable wooden blocks for creative play.', category: 'Toys', tags: ['Eco-friendly', 'Wooden'], imageUrl: 'https://picsum.photos/seed/prod1/400/300', price: 49.99, stockStatus: 'In Stock' },
  { id: 'p2', title: 'Organic Snack Bites', supplierId: 'supplierOrgFreshBites', supplierName: 'FreshBites AG', supplierLogo: 'https://picsum.photos/seed/freshbites/50/50', description: 'Healthy organic snacks for children.', category: 'Food', tags: ['Organic', 'Healthy'], imageUrl: 'https://picsum.photos/seed/prod2/400/300', price: 8.50, stockStatus: 'On Demand' },
];

export const MOCK_SERVICES: Service[] = [
  { id: 'srv1', title: 'Daycare Legal Consultation', providerId: 'serviceProviderOrgLegal', providerName: 'LegalCare Sàrl', providerLogo: 'https://picsum.photos/seed/legalcare/50/50', description: 'Expert legal advice for daycare centers.', category: 'Legal', availability: 'Mon-Fri, 9am-5pm', tags: ['Legal Advice', 'Compliance'], imageUrl: 'https://picsum.photos/seed/serv1/400/300', deliveryType: 'Remote', priceInfo: 'CHF 250/hour' },
  { id: 'srv2', title: 'Professional Daycare Cleaning', providerId: MOCK_SERVICE_PROVIDER_ORGANIZATION.id, providerName: MOCK_SERVICE_PROVIDER_ORGANIZATION.name, providerLogo: MOCK_SERVICE_PROVIDER_ORGANIZATION.logoUrl, description: 'Deep cleaning services tailored for daycares.', category: 'Cleaning', availability: 'Daily, Flexible Hours', tags: ['Hygiene', 'Eco-Friendly'], imageUrl: 'https://picsum.photos/seed/serv2/400/300', deliveryType: 'On-site', priceInfo: 'From CHF 300' },
];

export const MOCK_JOB_LISTINGS: JobListing[] = [
  { id: 'job1', title: 'Lead Educator', foundationName: 'KinderCare Foundation', location: 'Geneva', contractType: 'CDI', startDate: '01.07.2024', applicationsReceived: 7, status: 'Open', description: 'Seeking an experienced lead educator...', requirements: ['Degree in Early Childhood Education', '5+ years experience'] },
];

export const MOCK_CANDIDATE_PROFILES: CandidateProfile[] = [
  {
    id: 'cand1',
    name: 'Samuel D.', // Anonymized
    email: 'samuel.d@example-candidate.com', // Anonymized
    phone: '[Phone Redacted]',
    avatarUrl: 'https://picsum.photos/seed/samuel/100/100',
    currentRoleOrTitle: 'Early Childhood Educator',
    location: 'Geneva, GE',
    availabilityStatus: 'Available Immediately',
    shortBio: 'Passionate and trilingual educator with experience in Montessori environments.',
    skills: ['Montessori Certified', 'Bilingual FR/EN', 'First Aid CPR'],
    workExperience: [ { id: 'we1', jobTitle: 'Lead Educator', institutionName: '[Previous Employer Redacted]', startDate: '2020-08', endDate: 'Present', descriptionPoints: ['Curriculum development.', 'Classroom management.'] } ],
    education: [ { id: 'edu1', degree: 'Diploma in Early Childhood Education', institutionName: '[Institution Redacted]', graduationYear: '2018' } ],
    certifications: [ { id: 'cert1', name: 'Montessori Diploma', issuingOrganization: 'AMI', issueDate: '2019-06' } ],
    availabilityPreferences: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times: 'Full-Day', contractType: 'Full-time', preferredAgeGroups: ['Toddlers', 'Preschool'], },
    documents: [ 
      { id: 'doc1', name: 'CV_Samuel_D.pdf', url: '#', type: 'CV', uploadDate: new Date('2024-07-15').toISOString(), size: 256 * 1024 },
      { id: 'doc2', name: 'Montessori_Diploma.pdf', url: '#', type: 'Certificate', uploadDate: new Date('2024-07-15').toISOString(), size: 512 * 1024 },
      { id: 'doc3', name: 'Reference_Letter.pdf', url: '#', type: 'Reference', uploadDate: new Date('2024-07-16').toISOString(), size: 128 * 1024 },
    ],
    role: 'Educator', availability: '01.09.2024, CDI', preferredRegion: 'Geneva',
    experience: '5+ years childcare experience.', languages: ['French', 'English', 'German'],
  },
];


export const MOCK_PARTNERS: Partner[] = [
    { id: 'partner1', name: 'ESEDE', logoUrl: 'https://picsum.photos/seed/esede/150/80?grayscale', description: 'Leading network for educator training.', type: 'Academic', countryRegion: 'Switzerland - National', websiteUrl: '#' },
];

export const MOCK_HR_DOCS: HRDocument[] = [
    { id: 'hr1', title: 'Employee Handbook Sample', category: HR_CATEGORIES[0], fileUrl: '#', uploaderId: 'admin001', lastUpdated: '2024-05-12T00:00:00Z', fileType: 'PDF', tags: ['Updated', 'Mandatory'], isFavorite: true, language: 'EN', version: 'v2.1', status: 'Published' },
];

export const MOCK_COURSES: Course[] = [
    { id: 'crs1', title: 'Child Safety Basics', description: 'Essential safety protocols.', type: 'Course', category: ELEARNING_CATEGORIES[0], lessons: 10, thumbnailUrl: 'https://picsum.photos/seed/safety101/300/200', updatedDate: '2024-05-10T00:00:00Z', language: 'EN', accessRoles: [UserRole.FOUNDATION, UserRole.EDUCATOR], status: 'Published' },
];

export const MOCK_POLICY_DOCS: PolicyDocument[] = [
    { id: 'pol1', title: 'Sample Childcare Licensing Standards', category: POLICY_BROAD_CATEGORIES[0], policyType: PolicyType.REGULATION, country: 'Switzerland', region: 'Vaud', tags: ['Licensing', 'New'], publishedDate: '2024-03-20T00:00:00Z', lastUpdatedDate: '2024-03-20T00:00:00Z', effectiveDate: '2024-04-01T00:00:00Z', contentPreview: 'Summary of licensing requirements.', fileUrl: '#', fileType: 'PDF', status: 'Published', language: 'FR' },
];

export const MOCK_POLICY_ALERTS: PolicyAlert[] = [
    { id: 'alert1', title: 'Important: Platform Update', message: 'Scheduled platform update will occur next week.', type: PolicyAlertType.INFO, regionScope: 'All', isActive: true, creationDate: '2024-07-20T00:00:00Z', displayStartDate: '2024-07-25T00:00:00Z', displayEndDate: '2024-07-31T00:00:00Z' },
];


export const MOCK_PARENT_LEADS: ParentLead[] = [
  {
    id: 'lead001',
    parentId: MOCK_PARENT_USER.id, 
    canton: 'Geneva',
    municipality: '[Municipality Redacted]',
    childAge: 3, // Keep general PII for functionality testing
    desiredStartDate: '2024-09-01',
    specialNeeds: '[Special Needs Redacted - Use only for specific testing if necessary]',
    contactName: 'Sophie D.', // Anonymized
    contactEmail: 'sophie.d@example-parent.com', // Anonymized
    contactPhone: '[Phone Redacted]',
    submissionDate: '2024-07-15T10:00:00Z',
    mainStatus: LeadMainStatus.PROCESSING,
    assignedFoundations: [MOCK_FOUNDATION_ORG_KINDERWELT.id],
    responses: [ { foundationId: MOCK_FOUNDATION_ORG_KINDERWELT.id, foundationName: MOCK_FOUNDATION_ORG_KINDERWELT.name, status: FoundationLeadResponseStatus.INTERESTED, messageToParent: 'Please book a visit.', responseDate: '2024-07-16T14:00:00Z' } ],
  },
];


export const ALL_USERS_MOCK: User[] = [
  MOCK_FOUNDATION_USER, 
  MOCK_PARENT_USER, 
  MOCK_SUPER_ADMIN_USER, 
  MOCK_SUPPLIER_USER, 
  MOCK_SERVICE_PROVIDER_USER,
  MOCK_EDUCATOR_USER,
  {...MOCK_CANDIDATE_PROFILES[0], id: 'cand1', role: UserRole.EDUCATOR} as User, // Add Samuel D. as a user for messaging
];

export const MOCK_ORGANIZATIONS: Organization[] = [
    MOCK_FOUNDATION_ORG_KINDERWELT,
    MOCK_SUPPLIER_ORGANIZATION,
    MOCK_SERVICE_PROVIDER_ORGANIZATION,
    { id: 'orgOtherFoundation1', name: 'Happy Kids Daycare', type: 'foundation', region: 'Geneva', logoUrl: 'https://picsum.photos/seed/happykids/100/100', capacity: 30, pedagogy: ['Play-based'], languagesSpoken: ['French'], email: 'contact@example-happykids.ch', phone: '[Phone Redacted]', website: 'https://example-happykids.ch', coverImageUrl: 'https://picsum.photos/seed/happykidsCover/1200/300', rating: 4.2, badges: [] },
];


export const COUNTRIES_FOR_POLICIES = ['Switzerland', 'Germany', 'France', 'Italy', 'Austria'] as const;
export type CountryForPolicies = typeof COUNTRIES_FOR_POLICIES[number];

export const REGIONS_BY_COUNTRY: Record<CountryForPolicies, readonly string[]> = {
    'Switzerland': ["All Cantons", ...SWISS_CANTONS],
    'Germany': ["All Länder", "Bavaria"], // Reduced for brevity
    'France': ["All Régions", "Île-de-France"], // Reduced for brevity
    'Italy': ["All Regioni", "Lombardy"], // Reduced for brevity
    'Austria': ["All Bundesländer", "Vienna"] // Reduced for brevity
};

// Example Order Requests
export const MOCK_ORDER_REQUESTS: OrderRequest[] = [
    {
        id: 'orderReq1',
        foundationId: MOCK_FOUNDATION_USER.id,
        foundationOrgId: MOCK_FOUNDATION_ORG_KINDERWELT.id,
        productId: 'p1',
        productName: 'EcoToys Wooden Blocks',
        supplierId: MOCK_SUPPLIER_ORGANIZATION.id,
        quantity: 2,
        notes: 'Urgent delivery requested.',
        status: OrderRequestStatus.SUBMITTED,
        requestDate: '2024-07-28T10:00:00Z',
    }
];

// Example Service Requests
export const MOCK_SERVICE_REQUESTS: ServiceRequest[] = [
    {
        id: 'serviceReq1',
        foundationId: MOCK_FOUNDATION_USER.id,
        foundationOrgId: MOCK_FOUNDATION_ORG_KINDERWELT.id,
        serviceId: 'srv2',
        serviceName: 'Daycare Deep Cleaning Service',
        providerId: MOCK_SERVICE_PROVIDER_ORGANIZATION.id,
        preferredDate: '2024-08-05',
        notes: 'Requesting afternoon service.',
        status: ServiceRequestStatus.NEW,
        requestDate: '2024-07-29T11:00:00Z',
    }
];

export const MOCK_ORDERS: Order[] = []; // Keep empty, populated dynamically by cart

export const MOCK_APPLICATIONS: Application[] = []; // For job applications


// Mock Data for Messaging System
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1',
    participantIds: [MOCK_FOUNDATION_USER.id, 'cand1'], 
    participantNames: { [MOCK_FOUNDATION_USER.id]: MOCK_FOUNDATION_USER.name, ['cand1']: 'Samuel D.' },
    participantRoles: { [MOCK_FOUNDATION_USER.id]: MOCK_FOUNDATION_USER.role, ['cand1']: UserRole.EDUCATOR, },
    lastMessageSnippet: 'Thank you for the invitation!',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), 
    lastMessageSenderId: 'cand1',
  },
  {
    id: 'conv2',
    name: 'Team Meeting',
    participantIds: [MOCK_FOUNDATION_USER.id, MOCK_EDUCATOR_USER.id, 'cand1'],
    participantNames: { 
        [MOCK_FOUNDATION_USER.id]: MOCK_FOUNDATION_USER.name, 
        [MOCK_EDUCATOR_USER.id]: MOCK_EDUCATOR_USER.name,
        ['cand1']: 'Samuel D.' 
    },
    participantRoles: { 
        [MOCK_FOUNDATION_USER.id]: MOCK_FOUNDATION_USER.role, 
        [MOCK_EDUCATOR_USER.id]: MOCK_EDUCATOR_USER.role,
        ['cand1']: UserRole.EDUCATOR 
    },
    lastMessageSnippet: 'See you all there!',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    lastMessageSenderId: MOCK_EDUCATOR_USER.id,
  },
  {
    id: 'conv3',
    name: 'Logistics Planning',
    participantIds: [MOCK_FOUNDATION_USER.id, MOCK_SUPPLIER_USER.id, MOCK_SERVICE_PROVIDER_USER.id],
    participantNames: { 
        [MOCK_FOUNDATION_USER.id]: MOCK_FOUNDATION_USER.name, 
        [MOCK_SUPPLIER_USER.id]: MOCK_SUPPLIER_USER.name,
        [MOCK_SERVICE_PROVIDER_USER.id]: MOCK_SERVICE_PROVIDER_USER.name 
    },
    participantRoles: { 
        [MOCK_FOUNDATION_USER.id]: MOCK_FOUNDATION_USER.role, 
        [MOCK_SUPPLIER_USER.id]: MOCK_SUPPLIER_USER.role,
        [MOCK_SERVICE_PROVIDER_USER.id]: MOCK_SERVICE_PROVIDER_USER.role
    },
    lastMessageSnippet: 'Delivery confirmed for next Tuesday.',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    lastMessageSenderId: MOCK_SUPPLIER_USER.id,
  }
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'msg1', conversationId: 'conv1', senderId: MOCK_FOUNDATION_USER.id, senderName: MOCK_FOUNDATION_USER.name, senderRole: MOCK_FOUNDATION_USER.role, content: 'Hello Samuel, we were impressed by your profile.', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), isRead: true },
  { id: 'msg2', conversationId: 'conv1', senderId: 'cand1', senderName: 'Samuel D.', senderRole: UserRole.EDUCATOR, content: 'Thank you for the invitation!', timestamp: MOCK_CONVERSATIONS[0].lastMessageTimestamp!, isRead: false },
  { id: 'msg3', conversationId: 'conv2', senderId: MOCK_FOUNDATION_USER.id, senderName: MOCK_FOUNDATION_USER.name, senderRole: MOCK_FOUNDATION_USER.role, content: 'Reminder: Team meeting tomorrow at 10 AM.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), isRead: true },
  { id: 'msg4', conversationId: 'conv2', senderId: MOCK_EDUCATOR_USER.id, senderName: MOCK_EDUCATOR_USER.name, senderRole: MOCK_EDUCATOR_USER.role, content: 'See you all there!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), isRead: true },
  { id: 'msg5', conversationId: 'conv3', senderId: MOCK_SUPPLIER_USER.id, senderName: MOCK_SUPPLIER_USER.name, senderRole: MOCK_SUPPLIER_USER.role, content: 'Delivery confirmed for next Tuesday.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), isRead: true },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [];

// Settings Mock Data
export const MOCK_SUPPLIER_SETTINGS: SupplierSettings = {
  companyName: MOCK_SUPPLIER_ORGANIZATION.name,
  logoUrl: MOCK_SUPPLIER_ORGANIZATION.logoUrl,
  coverImageUrl: MOCK_SUPPLIER_ORGANIZATION.coverImageUrl,
  aboutText: MOCK_SUPPLIER_ORGANIZATION.description || 'High-quality supplier.',
  vatNumber: '[VAT Redacted]',
  regionsServed: ['Zürich'],
  languagesSpoken: ['DE', 'EN'],
  preferredContactMethod: 'Email',
  avgResponseType: '< 24 h',
  externalBookingLink: 'https://example.com/ecogoods-consultations',
  directOrderLink: MOCK_SUPPLIER_ORGANIZATION.directOrderLink, // Added
  newRequestEmailToggle: true,
  digestRadio: 'Weekly',
  promoRedemptionAlertsToggle: true,
  autoRespondToggle: false,
  defaultMOQ: 10,
  packSize: 1,
  autoAcceptOrderQtyLimit: 5,
  promoCodes: [ { id: 'promo1', code: 'SUMMER24', discountType: 'Percentage', value: 10, expiryDate: '2024-08-31T00:00:00Z', status: 'Active' } ],
  currentTier: 'Premium', nextInvoiceDate: '2024-08-01T00:00:00Z', stripePortalLink: '#',
  timeZone: 'Europe/Zurich', currency: 'CHF', anonymisedBenchmarkDataOptIn: true,
  teamMembers: [ { id: 'tm1', email: 'team.member@example-supplier.com', role: 'Editor', status: 'Active' } ],
  hidePubliclyToggle: false, gdprDataDeletionRequestMade: false,
};

export const MOCK_PROVIDER_SETTINGS: ProviderSettings = {
  companyName: MOCK_SERVICE_PROVIDER_ORGANIZATION.name,
  logoUrl: MOCK_SERVICE_PROVIDER_ORGANIZATION.logoUrl,
  coverImageUrl: MOCK_SERVICE_PROVIDER_ORGANIZATION.coverImageUrl,
  aboutText: MOCK_SERVICE_PROVIDER_ORGANIZATION.description || 'Professional services.',
  vatNumber: '[VAT Redacted]',
  regionsServed: ['Geneva'],
  languagesSpoken: ['FR', 'EN'],
  preferredContactMethod: 'Platform Form',
  avgResponseType: '2–3 d',
  externalBookingLink: MOCK_SERVICE_PROVIDER_ORGANIZATION.website,
  directOrderLink: undefined, // Service Providers might not use this
  calComLink: 'https://example.com/proclean-services',
  deliveryTypeToggleRemote: false,
  newRequestEmailToggle: true,
  digestRadio: 'Daily',
  promoRedemptionAlertsToggle: false,
  autoRespondToggle: true,
  defaultConsultationLength: '30 min',
  promoCodes: [ { id: 'promo_srv1', code: 'FREE30MIN', discountType: 'FreeMinutes', value: 30, expiryDate: '2024-09-30T00:00:00Z', status: 'Active', description: 'Free consultation' } ],
  currentTier: 'Pro', nextInvoiceDate: '2024-08-15T00:00:00Z', stripePortalLink: '#',
  timeZone: 'Europe/Zurich', currency: 'CHF', anonymisedBenchmarkDataOptIn: false,
  teamMembers: [ { id: 'tm_srv1', email: 'manager@example-provider.com', role: 'Editor', status: 'Active' } ],
  hidePubliclyToggle: false, gdprDataDeletionRequestMade: false,
};

export const MOCK_PRICING_PLANS: PricingPlan[] = [
  // Foundation Plans
  { role: UserRole.FOUNDATION, name: 'Basic', price: { monthly: 49, annually: 490 }, features: ['Post up to 2 jobs', 'Basic Marketplace Access', 'HR Document Library'], isPopular: false },
  { role: UserRole.FOUNDATION, name: 'Pro', price: { monthly: 99, annually: 990 }, features: ['Post up to 10 jobs', 'Full Marketplace Access', 'Recruitment Tools', 'E-Learning Access'], isPopular: true },
  { role: UserRole.FOUNDATION, name: 'Enterprise', price: { monthly: 199, annually: 1990 }, features: ['Unlimited Jobs', 'Advanced Analytics', 'Dedicated Support', 'Team Management'], isPopular: false },
  // Supplier Plans
  { role: UserRole.PRODUCT_SUPPLIER, name: 'Starter', price: { monthly: 29, annually: 290 }, features: ['List up to 10 products', 'Receive Orders', 'Basic Profile'], isPopular: false },
  { role: UserRole.PRODUCT_SUPPLIER, name: 'Business', price: { monthly: 79, annually: 790 }, features: ['List up to 100 products', 'Promo Code Manager', 'Supplier Analytics'], isPopular: true },
];

export const MOCK_CONTENT_QUEUE: ContentModerationItem[] = [
    { id: 'cq1', type: 'Product', title: 'New Organic Play-Dough', authorName: 'BioPlay Inc.', submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'cq2', type: 'Service', title: 'Weekend Music Workshop for Toddlers', authorName: 'Melody Makers', submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
    { id: 'cq3', type: 'Job Post', title: 'Part-Time Kitchen Assistant', authorName: 'Crèche du Lac', submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

// Mock Data for System Monitoring
export const MOCK_SYSTEM_METRICS: SystemMetric[] = [
    { name: 'CPU Load', value: '35%', status: 'Normal' },
    { name: 'Memory Usage', value: '82%', status: 'Warning' },
    { name: 'Database Latency', value: '150ms', status: 'Critical' },
];

export const MOCK_LOG_ENTRIES: LogEntry[] = [
    { id: 'log1', timestamp: new Date(Date.now() - 1000 * 2).toISOString(), level: 'INFO', message: 'User superadmin@example-pcs.com logged in successfully.' },
    { id: 'log2', timestamp: new Date(Date.now() - 1000 * 5).toISOString(), level: 'WARN', message: 'API endpoint /api/analytics/report took 2.5s to respond.' },
    { id: 'log3', timestamp: new Date(Date.now() - 1000 * 10).toISOString(), level: 'ERROR', message: 'Failed to process payment for order #ORD556: Gateway timeout.' },
    { id: 'log4', timestamp: new Date(Date.now() - 1000 * 15).toISOString(), level: 'INFO', message: 'New user registered: parent@example.com' },
    { id: 'log5', timestamp: new Date(Date.now() - 1000 * 22).toISOString(), level: 'WARN', message: 'Database connection pool nearing limit (90% usage).' },
];

export const MOCK_SECURITY_ALERTS: SecurityAlert[] = [
    { id: 'sec1', timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(), event: 'Failed Login Attempt (x5)', riskLevel: 'High', sourceIp: '198.51.100.12' },
    { id: 'sec2', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), event: 'Unusual password reset request', riskLevel: 'Medium', sourceIp: '203.0.113.45' },
    { id: 'sec3', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), event: 'Admin role granted to new user', riskLevel: 'Low', sourceIp: '127.0.0.1' },
];

// Mock Data for Platform Settings
export const MOCK_PLATFORM_SETTINGS: PlatformSettings = {
    platformName: "Pro Crèche Solutions",
    metadataDescription: "A centralized digital ecosystem for Swiss childcare.",
    logoUrl: "", // Admin can upload
    faviconUrl: "", // Admin can upload
};