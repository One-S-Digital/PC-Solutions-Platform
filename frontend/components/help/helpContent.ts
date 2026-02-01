import { UserRole } from '../../types';

export interface HelpArticle {
  id: string;
  titleKey: string;
  descriptionKey: string;
  contentKey: string;
  category: HelpCategory;
  roles?: UserRole[]; // If undefined, available to all roles
  keywords: string[];
}

export type HelpCategory = 
  | 'getting-started'
  | 'account'
  | 'foundation'
  | 'supplier'
  | 'service-provider'
  | 'educator'
  | 'parent'
  | 'settings'
  | 'billing'
  | 'troubleshooting';

export interface HelpCategoryInfo {
  id: HelpCategory;
  labelKey: string;
  icon: string;
  roles?: UserRole[];
}

export const HELP_CATEGORIES: HelpCategoryInfo[] = [
  { id: 'getting-started', labelKey: 'help:categories.gettingStarted', icon: '🚀' },
  { id: 'account', labelKey: 'help:categories.account', icon: '👤' },
  { id: 'foundation', labelKey: 'help:categories.foundation', icon: '🏫', roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'supplier', labelKey: 'help:categories.supplier', icon: '📦', roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'service-provider', labelKey: 'help:categories.serviceProvider', icon: '🔧', roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'educator', labelKey: 'help:categories.educator', icon: '👩‍🏫', roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'parent', labelKey: 'help:categories.parent', icon: '👨‍👩‍👧', roles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'settings', labelKey: 'help:categories.settings', icon: '⚙️' },
  { id: 'billing', labelKey: 'help:categories.billing', icon: '💳', roles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'troubleshooting', labelKey: 'help:categories.troubleshooting', icon: '🔧' },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // Getting Started
  {
    id: 'platform-overview',
    titleKey: 'help:articles.platformOverview.title',
    descriptionKey: 'help:articles.platformOverview.description',
    contentKey: 'help:articles.platformOverview.content',
    category: 'getting-started',
    keywords: ['overview', 'about', 'platform', 'introduction', 'what is'],
  },
  {
    id: 'create-account',
    titleKey: 'help:articles.createAccount.title',
    descriptionKey: 'help:articles.createAccount.description',
    contentKey: 'help:articles.createAccount.content',
    category: 'getting-started',
    keywords: ['signup', 'register', 'create', 'account', 'new user', 'join'],
  },
  {
    id: 'email-verification',
    titleKey: 'help:articles.emailVerification.title',
    descriptionKey: 'help:articles.emailVerification.description',
    contentKey: 'help:articles.emailVerification.content',
    category: 'getting-started',
    keywords: ['verify', 'email', 'code', '6-digit', 'confirmation', 'resend'],
  },
  {
    id: 'sign-in',
    titleKey: 'help:articles.signIn.title',
    descriptionKey: 'help:articles.signIn.description',
    contentKey: 'help:articles.signIn.content',
    category: 'getting-started',
    keywords: ['login', 'sign in', 'access', 'google', 'password'],
  },
  {
    id: 'navigation',
    titleKey: 'help:articles.navigation.title',
    descriptionKey: 'help:articles.navigation.description',
    contentKey: 'help:articles.navigation.content',
    category: 'getting-started',
    keywords: ['navigate', 'menu', 'sidebar', 'dashboard', 'find'],
  },

  // Account
  {
    id: 'change-password',
    titleKey: 'help:articles.changePassword.title',
    descriptionKey: 'help:articles.changePassword.description',
    contentKey: 'help:articles.changePassword.content',
    category: 'account',
    keywords: ['password', 'change', 'update', 'security', 'reset'],
  },
  {
    id: 'change-email',
    titleKey: 'help:articles.changeEmail.title',
    descriptionKey: 'help:articles.changeEmail.description',
    contentKey: 'help:articles.changeEmail.content',
    category: 'account',
    keywords: ['email', 'change', 'update', 'address'],
  },
  {
    id: 'forgot-password',
    titleKey: 'help:articles.forgotPassword.title',
    descriptionKey: 'help:articles.forgotPassword.description',
    contentKey: 'help:articles.forgotPassword.content',
    category: 'account',
    keywords: ['forgot', 'password', 'reset', 'recover', 'lost'],
  },
  {
    id: 'profile-setup',
    titleKey: 'help:articles.profileSetup.title',
    descriptionKey: 'help:articles.profileSetup.description',
    contentKey: 'help:articles.profileSetup.content',
    category: 'account',
    keywords: ['profile', 'setup', 'complete', 'edit', 'photo', 'avatar'],
  },

  // Foundation
  {
    id: 'foundation-dashboard',
    titleKey: 'help:articles.foundationDashboard.title',
    descriptionKey: 'help:articles.foundationDashboard.description',
    contentKey: 'help:articles.foundationDashboard.content',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['foundation', 'dashboard', 'overview', 'daycare'],
  },
  {
    id: 'parent-leads',
    titleKey: 'help:articles.parentLeads.title',
    descriptionKey: 'help:articles.parentLeads.description',
    contentKey: 'help:articles.parentLeads.content',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['leads', 'parent', 'inquiry', 'enquiry', 'waitlist'],
  },
  {
    id: 'marketplace-ordering',
    titleKey: 'help:articles.marketplaceOrdering.title',
    descriptionKey: 'help:articles.marketplaceOrdering.description',
    contentKey: 'help:articles.marketplaceOrdering.content',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['marketplace', 'order', 'products', 'services', 'cart', 'buy'],
  },
  {
    id: 'recruitment-jobs',
    titleKey: 'help:articles.recruitmentJobs.title',
    descriptionKey: 'help:articles.recruitmentJobs.description',
    contentKey: 'help:articles.recruitmentJobs.content',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['recruitment', 'job', 'posting', 'hire', 'staff', 'candidates'],
  },

  // Supplier
  {
    id: 'supplier-dashboard',
    titleKey: 'help:articles.supplierDashboard.title',
    descriptionKey: 'help:articles.supplierDashboard.description',
    contentKey: 'help:articles.supplierDashboard.content',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['supplier', 'dashboard', 'overview', 'vendor'],
  },
  {
    id: 'product-listings',
    titleKey: 'help:articles.productListings.title',
    descriptionKey: 'help:articles.productListings.description',
    contentKey: 'help:articles.productListings.content',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['product', 'listing', 'add', 'create', 'edit', 'catalog'],
  },
  {
    id: 'supplier-orders',
    titleKey: 'help:articles.supplierOrders.title',
    descriptionKey: 'help:articles.supplierOrders.description',
    contentKey: 'help:articles.supplierOrders.content',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['order', 'manage', 'fulfill', 'shipping', 'status'],
  },
  {
    id: 'promo-codes',
    titleKey: 'help:articles.promoCodes.title',
    descriptionKey: 'help:articles.promoCodes.description',
    contentKey: 'help:articles.promoCodes.content',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['promo', 'code', 'discount', 'coupon', 'offer', 'promotion'],
  },

  // Service Provider
  {
    id: 'service-provider-dashboard',
    titleKey: 'help:articles.serviceProviderDashboard.title',
    descriptionKey: 'help:articles.serviceProviderDashboard.description',
    contentKey: 'help:articles.serviceProviderDashboard.content',
    category: 'service-provider',
    roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['service', 'provider', 'dashboard', 'overview'],
  },
  {
    id: 'service-listings',
    titleKey: 'help:articles.serviceListings.title',
    descriptionKey: 'help:articles.serviceListings.description',
    contentKey: 'help:articles.serviceListings.content',
    category: 'service-provider',
    roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['service', 'listing', 'add', 'create', 'edit'],
  },
  {
    id: 'service-requests',
    titleKey: 'help:articles.serviceRequests.title',
    descriptionKey: 'help:articles.serviceRequests.description',
    contentKey: 'help:articles.serviceRequests.content',
    category: 'service-provider',
    roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['request', 'appointment', 'booking', 'schedule'],
  },
  {
    id: 'booking-link',
    titleKey: 'help:articles.bookingLink.title',
    descriptionKey: 'help:articles.bookingLink.description',
    contentKey: 'help:articles.bookingLink.content',
    category: 'service-provider',
    roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['booking', 'link', 'calendly', 'schedule', 'external'],
  },

  // Educator
  {
    id: 'educator-profile',
    titleKey: 'help:articles.educatorProfile.title',
    descriptionKey: 'help:articles.educatorProfile.description',
    contentKey: 'help:articles.educatorProfile.content',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['educator', 'profile', 'cv', 'resume', 'qualifications'],
  },
  {
    id: 'job-board',
    titleKey: 'help:articles.jobBoard.title',
    descriptionKey: 'help:articles.jobBoard.description',
    contentKey: 'help:articles.jobBoard.content',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['job', 'board', 'search', 'find', 'apply', 'employment'],
  },
  {
    id: 'availability-settings',
    titleKey: 'help:articles.availabilitySettings.title',
    descriptionKey: 'help:articles.availabilitySettings.description',
    contentKey: 'help:articles.availabilitySettings.content',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['availability', 'schedule', 'hours', 'days', 'when'],
  },

  // Parent
  {
    id: 'find-daycare',
    titleKey: 'help:articles.findDaycare.title',
    descriptionKey: 'help:articles.findDaycare.description',
    contentKey: 'help:articles.findDaycare.content',
    category: 'parent',
    roles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['find', 'daycare', 'search', 'creche', 'childcare'],
  },
  {
    id: 'submit-inquiry',
    titleKey: 'help:articles.submitInquiry.title',
    descriptionKey: 'help:articles.submitInquiry.description',
    contentKey: 'help:articles.submitInquiry.content',
    category: 'parent',
    roles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['inquiry', 'enquiry', 'submit', 'request', 'waitlist'],
  },
  {
    id: 'track-inquiries',
    titleKey: 'help:articles.trackInquiries.title',
    descriptionKey: 'help:articles.trackInquiries.description',
    contentKey: 'help:articles.trackInquiries.content',
    category: 'parent',
    roles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['track', 'status', 'inquiry', 'response', 'follow up'],
  },

  // Settings
  {
    id: 'account-security',
    titleKey: 'help:articles.accountSecurity.title',
    descriptionKey: 'help:articles.accountSecurity.description',
    contentKey: 'help:articles.accountSecurity.content',
    category: 'settings',
    keywords: ['security', 'password', 'email', 'account', 'protection'],
  },
  {
    id: 'notification-settings',
    titleKey: 'help:articles.notificationSettings.title',
    descriptionKey: 'help:articles.notificationSettings.description',
    contentKey: 'help:articles.notificationSettings.content',
    category: 'settings',
    keywords: ['notification', 'email', 'alerts', 'preferences', 'subscribe'],
  },
  {
    id: 'privacy-settings',
    titleKey: 'help:articles.privacySettings.title',
    descriptionKey: 'help:articles.privacySettings.description',
    contentKey: 'help:articles.privacySettings.content',
    category: 'settings',
    keywords: ['privacy', 'data', 'gdpr', 'delete', 'export'],
  },
  {
    id: 'language-settings',
    titleKey: 'help:articles.languageSettings.title',
    descriptionKey: 'help:articles.languageSettings.description',
    contentKey: 'help:articles.languageSettings.content',
    category: 'settings',
    keywords: ['language', 'english', 'french', 'german', 'translate'],
  },

  // Billing
  {
    id: 'subscription-plans',
    titleKey: 'help:articles.subscriptionPlans.title',
    descriptionKey: 'help:articles.subscriptionPlans.description',
    contentKey: 'help:articles.subscriptionPlans.content',
    category: 'billing',
    roles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['subscription', 'plan', 'pricing', 'tier', 'upgrade'],
  },
  {
    id: 'manage-subscription',
    titleKey: 'help:articles.manageSubscription.title',
    descriptionKey: 'help:articles.manageSubscription.description',
    contentKey: 'help:articles.manageSubscription.content',
    category: 'billing',
    roles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['manage', 'subscription', 'cancel', 'upgrade', 'downgrade'],
  },
  {
    id: 'invoices',
    titleKey: 'help:articles.invoices.title',
    descriptionKey: 'help:articles.invoices.description',
    contentKey: 'help:articles.invoices.content',
    category: 'billing',
    roles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['invoice', 'receipt', 'payment', 'billing', 'history'],
  },

  // Troubleshooting
  {
    id: 'login-issues',
    titleKey: 'help:articles.loginIssues.title',
    descriptionKey: 'help:articles.loginIssues.description',
    contentKey: 'help:articles.loginIssues.content',
    category: 'troubleshooting',
    keywords: ['login', 'cant', 'error', 'problem', 'access', 'locked'],
  },
  {
    id: 'verification-issues',
    titleKey: 'help:articles.verificationIssues.title',
    descriptionKey: 'help:articles.verificationIssues.description',
    contentKey: 'help:articles.verificationIssues.content',
    category: 'troubleshooting',
    keywords: ['verification', 'code', 'email', 'not received', 'expired'],
  },
  {
    id: 'browser-compatibility',
    titleKey: 'help:articles.browserCompatibility.title',
    descriptionKey: 'help:articles.browserCompatibility.description',
    contentKey: 'help:articles.browserCompatibility.content',
    category: 'troubleshooting',
    keywords: ['browser', 'chrome', 'firefox', 'safari', 'edge', 'compatibility'],
  },
  {
    id: 'contact-support',
    titleKey: 'help:articles.contactSupport.title',
    descriptionKey: 'help:articles.contactSupport.description',
    contentKey: 'help:articles.contactSupport.content',
    category: 'troubleshooting',
    keywords: ['support', 'contact', 'help', 'ticket', 'email', 'assistance'],
  },
];

// Helper function to filter articles by user role
export function getArticlesForRole(userRole?: UserRole): HelpArticle[] {
  if (!userRole) return HELP_ARTICLES.filter(a => !a.roles);
  
  return HELP_ARTICLES.filter(article => {
    if (!article.roles) return true;
    return article.roles.includes(userRole);
  });
}

// Helper function to filter categories by user role
export function getCategoriesForRole(userRole?: UserRole): HelpCategoryInfo[] {
  if (!userRole) return HELP_CATEGORIES.filter(c => !c.roles);
  
  return HELP_CATEGORIES.filter(category => {
    if (!category.roles) return true;
    return category.roles.includes(userRole);
  });
}

// Helper function to search articles
export function searchArticles(articles: HelpArticle[], query: string, t: (key: string) => string): HelpArticle[] {
  if (!query.trim()) return articles;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return articles.filter(article => {
    // Check keywords
    if (article.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))) {
      return true;
    }
    
    // Check translated title and description
    const title = t(article.titleKey).toLowerCase();
    const description = t(article.descriptionKey).toLowerCase();
    
    return title.includes(lowerQuery) || description.includes(lowerQuery);
  });
}
