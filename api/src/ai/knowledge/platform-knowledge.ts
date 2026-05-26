import { UserRole } from '@prisma/client';

export interface KnowledgeArticle {
  id: string;
  category: string;
  roles?: UserRole[];
  keywords: string[];
  title: string;
  content: string;
  route?: string;
}

export const PLATFORM_ARTICLES: KnowledgeArticle[] = [
  // ── Getting Started ────────────────────────────────────────────────────────
  {
    id: 'platform-overview',
    category: 'getting-started',
    keywords: ['overview', 'about', 'platform', 'introduction', 'what is', 'procrèche'],
    title: 'Platform Overview',
    content:
      'PC Solutions Platform connects Swiss childcare foundations with educators, suppliers, and service providers. Foundations manage staff recruitment, parent leads, marketplace orders, and analytics from a single dashboard. Educators build profiles and apply for jobs. Product suppliers list products for foundations to order. Service providers list services and manage bookings.',
  },
  {
    id: 'create-account',
    category: 'getting-started',
    keywords: ['signup', 'register', 'create', 'account', 'new user', 'join', 'inscription'],
    title: 'Create an Account',
    content:
      'Go to the sign-up page and choose your role (Foundation, Educator, Supplier, Service Provider, or Parent). Fill in your name, email, and password — or sign in with Google. You will receive a verification email. Click the link to verify your account. After verifying, complete your profile to unlock full access.',
    route: '/signup',
  },
  {
    id: 'sign-in',
    category: 'getting-started',
    keywords: ['login', 'sign in', 'access', 'google', 'password', 'connexion'],
    title: 'Sign In',
    content:
      'Go to the login page and enter your email and password, or click "Continue with Google". After signing in you are redirected to your role-specific dashboard.',
    route: '/login',
  },
  {
    id: 'navigation',
    category: 'getting-started',
    keywords: ['navigate', 'menu', 'sidebar', 'dashboard', 'find', 'navigation'],
    title: 'Platform Navigation',
    content:
      'Use the sidebar on the left to move between sections. Each role sees only the sections relevant to them. Click the logo or "Dashboard" to return to your main dashboard. The top bar provides access to notifications, messages, and your profile menu.',
  },

  // ── Account ────────────────────────────────────────────────────────────────
  {
    id: 'change-password',
    category: 'account',
    keywords: ['password', 'change', 'update', 'security', 'mot de passe'],
    title: 'Change Password',
    content:
      'Go to Settings → Account Security and click "Change Password". Enter your current password and then your new password twice. Click Save. Passwords are managed securely via Clerk.',
    route: '/settings',
  },
  {
    id: 'change-email',
    category: 'account',
    keywords: ['email', 'change', 'update', 'address', 'adresse'],
    title: 'Change Email Address',
    content:
      'Go to Settings → Account Security and click "Change Email". Enter your new email address. You will receive a verification code at the new address to confirm the change.',
    route: '/settings',
  },
  {
    id: 'forgot-password',
    category: 'account',
    keywords: ['forgot', 'password', 'reset', 'recover', 'lost', 'oublié'],
    title: 'Reset Forgotten Password',
    content:
      'On the login page, click "Forgot password?". Enter your email address and click Send. Check your inbox for a reset link. Click it and set a new password.',
    route: '/login',
  },
  {
    id: 'profile-setup',
    category: 'account',
    keywords: ['profile', 'setup', 'complete', 'edit', 'photo', 'avatar', 'profil'],
    title: 'Profile Setup',
    content:
      'Click your avatar in the top-right or go to Profile in the sidebar. You can upload a photo, update your name and phone number. Educators should also complete CV, skills, certifications, work experience, and availability to appear in the candidate pool.',
    route: '/profile',
  },

  // ── Foundation ─────────────────────────────────────────────────────────────
  {
    id: 'foundation-dashboard',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['foundation', 'dashboard', 'overview', 'daycare', 'kpi', 'metrics', 'tableau de bord'],
    title: 'Foundation Dashboard',
    content:
      'Your dashboard shows key metrics: available staff, staff on leave, intern pool size, pending orders, and open parent leads. Each card links directly to the relevant section. Use the dashboard for a quick operational overview.',
    route: '/foundation/dashboard',
  },
  {
    id: 'parent-leads',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['leads', 'parent', 'inquiry', 'enquiry', 'waitlist', 'respond', 'demande', 'famille'],
    title: 'Parent Leads Management',
    content:
      'Go to Leads in the sidebar to see all parent enquiries. Each lead shows the parent name, child age, preferred location, and message. Click a lead to view full details and respond via the messaging thread. Update lead status to track follow-ups (New → In Progress → Responded).',
    route: '/foundation/leads',
  },
  {
    id: 'marketplace-ordering',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['marketplace', 'order', 'products', 'services', 'cart', 'buy', 'purchase', 'commande'],
    title: 'Marketplace Ordering',
    content:
      'Go to Marketplace → Products to browse products from suppliers, or Marketplace → Services to book services from providers. Add items to your cart and proceed to checkout. Your order and appointment history is accessible under Orders & Appointments.',
    route: '/marketplace/products',
  },
  {
    id: 'recruitment-jobs',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['recruitment', 'job', 'posting', 'hire', 'staff', 'candidates', 'listing', 'publish', 'recrutement', 'offre'],
    title: 'Recruitment & Job Postings',
    content:
      'Go to Recruitment → Job Listings to create and manage job postings. Click "Create Listing" and fill in the role, work percentage, contract type, location, requirements, and description. Publish to make it visible to educators. Use Recruitment → Candidate Pool to browse educator profiles directly.',
    route: '/recruitment/job-listings',
  },
  {
    id: 'staffing-replacements',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['staffing', 'replacement', 'request', 'absence', 'cover', 'temporary', 'remplacement', 'suppléance'],
    title: 'Staffing Replacements',
    content:
      'Go to Staffing → Replacements to manage absence cover. Click "New Request" and describe your need in plain text — role, dates, canton, required qualifications. The system automatically searches the internal educator pool and suggests matching candidates. Manage interns under Staffing → Intern Pool.',
    route: '/foundation/replacements',
  },
  {
    id: 'foundation-analytics',
    category: 'foundation',
    roles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['analytics', 'stats', 'metrics', 'revenue', 'report', 'data', 'statistiques'],
    title: 'Foundation Analytics',
    content:
      'Go to Analytics to view metrics including revenue, order volume, lead conversion rate, and staffing ratios. Use the date range filter to compare different periods.',
    route: '/foundation/analytics',
  },

  // ── Supplier ───────────────────────────────────────────────────────────────
  {
    id: 'supplier-dashboard',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['supplier', 'dashboard', 'overview', 'vendor', 'sales', 'fournisseur'],
    title: 'Supplier Dashboard',
    content:
      'Your dashboard shows total orders, pending orders, monthly revenue, and fulfillment rate. Use it to monitor sales performance and outstanding work.',
    route: '/supplier/dashboard',
  },
  {
    id: 'product-listings',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['product', 'listing', 'add', 'create', 'edit', 'catalog', 'publish', 'produit', 'catalogue'],
    title: 'Product Listings',
    content:
      'Go to My Products to manage your catalog. Click "Add Product" and fill in the name, description, price, category, and images. Toggle Active/Inactive to control visibility. Active products appear in the marketplace for foundations to order.',
    route: '/supplier/product-listings',
  },
  {
    id: 'supplier-orders',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['order', 'manage', 'fulfill', 'shipping', 'status', 'pending', 'commande', 'livraison'],
    title: 'Order Management',
    content:
      'Go to Orders to view incoming orders. Each order shows the foundation name, items, quantity, and current status. Click an order to see full details. Update status as you process: Pending → Processing → Shipped → Delivered.',
    route: '/supplier/orders',
  },
  {
    id: 'promo-codes',
    category: 'supplier',
    roles: [UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['promo', 'code', 'discount', 'coupon', 'offer', 'promotion', 'remise'],
    title: 'Promo Codes',
    content:
      'Create discount codes under Settings → Promo Codes. Set the type (percentage or fixed), value, usage limit, and validity dates. Codes can be shared with foundations to apply at checkout.',
  },

  // ── Service Provider ───────────────────────────────────────────────────────
  {
    id: 'service-provider-dashboard',
    category: 'service-provider',
    roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['service', 'provider', 'dashboard', 'overview', 'bookings', 'appointments', 'prestataire'],
    title: 'Service Provider Dashboard',
    content:
      'Your dashboard shows active requests, completed services, upcoming appointments, and your customer rating. Use it to monitor your workload and service quality.',
    route: '/service-provider/dashboard',
  },
  {
    id: 'service-listings',
    category: 'service-provider',
    roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['service', 'listing', 'add', 'create', 'edit', 'catalog', 'prestation'],
    title: 'Service Listings',
    content:
      'Go to My Services to manage your service catalog. Click "Add Service" and fill in name, description, price, category, and availability. Active services appear in the marketplace for foundations to book.',
    route: '/service-provider/service-listings',
  },
  {
    id: 'service-requests',
    category: 'service-provider',
    roles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['request', 'appointment', 'booking', 'schedule', 'accept', 'decline', 'réservation', 'demande'],
    title: 'Service Requests',
    content:
      'Go to Requests to view incoming bookings. Each request shows the foundation, service requested, description, and preferred date. Accept to confirm, or decline with a reason. Confirmed bookings appear in your appointment calendar.',
    route: '/service-provider/requests',
  },

  // ── Educator ───────────────────────────────────────────────────────────────
  {
    id: 'educator-profile',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['educator', 'profile', 'cv', 'resume', 'qualifications', 'experience', 'skills', 'profil', 'dossier'],
    title: 'Educator Profile',
    content:
      'Your profile is your CV on the platform. Go to My Profile to complete it. Add your qualifications (EDE, ASSC, FaBe, etc.), work experience, skills, certifications, short bio, and availability. Upload your CV document. A complete profile increases your chances of being matched with foundations. Your profile must be approved by an admin before you can apply for jobs.',
    route: '/educator/profile',
  },
  {
    id: 'job-board',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['job', 'board', 'search', 'find', 'apply', 'employment', 'position', 'listing', 'emploi', 'postuler'],
    title: 'Job Board',
    content:
      'Go to Job Board to browse all available positions posted by foundations. Filter by canton, contract type, or work percentage. Click a listing to read the full details and click "Apply" to submit your application with your CV and an optional cover letter. Track all your applications under My Applications.',
    route: '/educator/job-board',
  },
  {
    id: 'availability-settings',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['availability', 'schedule', 'hours', 'days', 'when', 'open to work', 'disponibilité'],
    title: 'Availability Settings',
    content:
      'Go to My Profile → Availability to set days and hours you are available. Choose Full-time, Part-time, or Replacement. Accurate availability helps the matching engine connect you with foundations looking for your schedule.',
    route: '/educator/profile',
  },
  {
    id: 'educator-applications',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['application', 'apply', 'status', 'track', 'pending', 'interview', 'offer', 'hired', 'rejected', 'candidature'],
    title: 'My Applications',
    content:
      'Go to My Applications to see all jobs you have applied to. Each entry shows the foundation name, job title, date applied, and current status: Pending, Shortlisted, Interview, Offer, Hired, or Rejected. Click an entry for full details.',
    route: '/educator/applications',
  },
  {
    id: 'educator-approval',
    category: 'educator',
    roles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['approval', 'approved', 'pending approval', 'rejected', 'waiting', 'admin', 'approbation'],
    title: 'Profile Approval Process',
    content:
      'After you complete your profile, an admin will review it. While your profile is pending approval, you can view the platform but cannot apply for jobs or access the intern pool. Once approved, you gain full access to the job board and applications. If rejected, you can update your profile and resubmit.',
    route: '/educator/pending-approval',
  },

  // ── Parent ─────────────────────────────────────────────────────────────────
  {
    id: 'find-daycare',
    category: 'parent',
    roles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['find', 'daycare', 'search', 'creche', 'crèche', 'childcare', 'foundation', 'browse'],
    title: 'Find a Daycare',
    content:
      'Go to Foundations to browse all registered childcare foundations. Filter by canton and preferred languages. Click a foundation to see their profile, location, capacity, and contact information.',
    route: '/parent/foundations',
  },
  {
    id: 'submit-inquiry',
    category: 'parent',
    roles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['inquiry', 'enquiry', 'submit', 'request', 'waitlist', 'contact', 'apply', 'demande', 'inscription'],
    title: 'Submit a Childcare Enquiry',
    content:
      "From the Foundations page, open a foundation's profile and click \"Send Enquiry\". Fill in your child's name, age, preferred start date, location preferences, and any special requirements. Click Submit. The foundation receives your enquiry and will contact you.",
    route: '/parent/foundations',
  },
  {
    id: 'track-inquiries',
    category: 'parent',
    roles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['track', 'status', 'inquiry', 'response', 'follow up', 'my enquiries', 'mes demandes'],
    title: 'Track Your Enquiries',
    content:
      'Go to My Enquiries to see all enquiries you have submitted. Each shows the foundation name, date submitted, and current status (New, In Progress, Responded). Click an enquiry to read any replies from the foundation.',
    route: '/parent/enquiries',
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  {
    id: 'account-security',
    category: 'settings',
    keywords: ['security', 'password', 'email', 'account', 'protection', '2fa', 'two-factor', 'sécurité'],
    title: 'Account Security',
    content:
      'Go to Settings → Account Security to change your password or email address.',
    route: '/settings',
  },
  {
    id: 'notification-settings',
    category: 'settings',
    keywords: ['notification', 'email', 'alerts', 'preferences', 'subscribe', 'unsubscribe', 'notifications'],
    title: 'Notification Settings',
    content:
      'Go to Settings → Notifications to control which emails and platform alerts you receive. Toggle individual notification types on or off.',
    route: '/settings',
  },
  {
    id: 'language-settings',
    category: 'settings',
    keywords: ['language', 'english', 'french', 'german', 'translate', 'langue', 'sprache', 'français', 'deutsch'],
    title: 'Language Settings',
    content:
      'Go to Settings → Language to switch between French, German, and English. The change applies immediately across the platform.',
    route: '/settings',
  },

  // ── Billing ────────────────────────────────────────────────────────────────
  {
    id: 'subscription-plans',
    category: 'billing',
    roles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['subscription', 'plan', 'pricing', 'tier', 'upgrade', 'basic', 'professional', 'enterprise', 'abonnement'],
    title: 'Subscription Plans',
    content:
      'Available plans: Basic, Essential, Professional, and Enterprise. Higher tiers unlock advanced analytics, more job postings, and priority support. Go to Settings → Billing to view plans and your current subscription.',
    route: '/settings',
  },
  {
    id: 'manage-subscription',
    category: 'billing',
    roles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['manage', 'subscription', 'cancel', 'upgrade', 'downgrade', 'renew', 'annuler'],
    title: 'Manage Subscription',
    content:
      'Go to Settings → Billing to upgrade, downgrade, or cancel your subscription. Changes take effect at the end of the current billing period.',
    route: '/settings',
  },
  {
    id: 'invoices',
    category: 'billing',
    roles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    keywords: ['invoice', 'receipt', 'payment', 'billing', 'history', 'download', 'facture', 'paiement'],
    title: 'Invoices & Payment History',
    content:
      'Go to Settings → Billing to view your payment history and download invoices as PDF.',
    route: '/settings',
  },

  // ── Troubleshooting ────────────────────────────────────────────────────────
  {
    id: 'login-issues',
    category: 'troubleshooting',
    keywords: ['login', 'cant', 'error', 'problem', 'access', 'locked', 'suspended', 'connexion', 'problème'],
    title: 'Login Problems',
    content:
      'If you cannot log in: (1) Check you are using the correct email address. (2) Use "Forgot password?" to reset your password. (3) If you signed up with Google, use the "Continue with Google" button. (4) If your account is suspended, contact support.',
    route: '/login',
  },
  {
    id: 'verification-issues',
    category: 'troubleshooting',
    keywords: ['verification', 'code', 'email', 'not received', 'expired', 'resend', 'vérification'],
    title: 'Verification Email Not Received',
    content:
      'If you did not receive a verification email: (1) Check spam/junk folder. (2) Wait up to 5 minutes. (3) Click "Resend verification email" on the verification page. (4) Make sure you used the correct email. (5) Contact support if the problem persists.',
  },
  {
    id: 'contact-support',
    category: 'troubleshooting',
    keywords: ['support', 'contact', 'help', 'ticket', 'email', 'assistance', 'aide'],
    title: 'Contact Support',
    content:
      'To get help: (1) Use the Support section in the sidebar to submit a support ticket. (2) Describe your issue clearly including any error messages. (3) Our team responds within 24 hours on business days. Mark urgent tickets as High priority.',
  },
];
