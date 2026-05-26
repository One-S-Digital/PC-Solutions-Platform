import { UserRole } from '@prisma/client';

const FOUNDATION_BASE = `You manage a Swiss childcare foundation. What you can do:
- Dashboard: KPIs for staff, leads, orders, intern pool → /foundation/dashboard
- Parent Leads: view and respond to parent childcare enquiries → /foundation/leads
- Marketplace Products: order products from suppliers → /marketplace/products
- Marketplace Services: book services from providers → /marketplace/services
- Orders & Appointments: track fulfillment and bookings → /foundation/orders-appointments
- Analytics: revenue, lead conversion, staffing metrics → /foundation/analytics
- Organisation Profile: update your foundation details → /foundation/organisation-profile
- Messaging: communicate with educators, suppliers, providers → /messages
- Content: e-learning courses, HR procedures, state policies
- Settings: account, notifications, billing, language → /settings
- Support: submit help tickets → /foundation/support`;

const FOUNDATION_STAFFING_LINES = `
- Recruitment: post jobs, browse and shortlist candidates → /recruitment/job-listings, /recruitment/candidate-pool
- Staffing Replacements: create replacement requests (matched automatically) → /foundation/replacements
- Staffing Requests: manage general staffing needs → /foundation/staffing-requests
- Intern Pool: manage interns → /foundation/intern-pool`;

const ROLE_CAPABILITIES_BASE: Record<UserRole, string> = {
  [UserRole.FOUNDATION]: FOUNDATION_BASE,

  [UserRole.EDUCATOR]: `You are a childcare educator looking for work. What you can do:
- Dashboard: profile completion summary and job matches → /educator/dashboard
- My Profile: CV, qualifications (EDE/ASSC/FaBe), skills, certifications, work experience, availability → /educator/profile
- Job Board: search and apply for positions posted by foundations → /educator/job-board
- My Applications: track application statuses (Pending → Shortlisted → Interview → Offer → Hired/Rejected) → /educator/applications
- Intern Pool: view internship opportunities → /educator/intern-pool
- File Gallery: manage uploaded documents → /file-gallery
- Messaging: communicate with foundations → /messages
- Settings: account settings → /settings
- Support: submit help tickets → /educator/support
IMPORTANT: Profile must be approved by an admin before you can access the job board, applications, and intern pool.`,

  [UserRole.PARENT]: `You are a parent looking for Swiss childcare. What you can do:
- Dashboard: overview of your activity → /parent/dashboard
- Foundations: browse and search childcare foundations by canton and language → /parent/foundations
- My Enquiries: view and track submitted childcare enquiries → /parent/enquiries
- Messaging: communicate with foundations → /messages
- Settings: account settings → /settings
- Support: submit help tickets → /parent/support`,

  [UserRole.PRODUCT_SUPPLIER]: `You supply products to Swiss childcare foundations. What you can do:
- Dashboard: sales KPIs (orders, revenue, fulfillment rate) → /supplier/dashboard
- My Products: create, edit, and manage your product catalog → /supplier/product-listings
- Orders: view and manage incoming orders from foundations → /supplier/orders
- Analytics: revenue metrics and top-selling products → /supplier/analytics
- Organisation Profile: update your company details → /supplier/organisation-profile
- Messaging: communicate with foundations → /messages
- Settings: account, billing, language → /settings
- Support: submit help tickets → /supplier/support`,

  [UserRole.SERVICE_PROVIDER]: `You provide services to Swiss childcare foundations. What you can do:
- Dashboard: active requests, appointments, customer rating → /service-provider/dashboard
- My Services: create, edit, and manage your service catalog → /service-provider/service-listings
- Requests: view and manage incoming service bookings (accept/decline) → /service-provider/requests
- Analytics: revenue and booking trends → /service-provider/analytics
- Organisation Profile: update your company details → /service-provider/organisation-profile
- Messaging: communicate with foundations → /messages
- Settings: account, billing, language → /settings
- Support: submit help tickets → /service-provider/support`,

  [UserRole.ADMIN]: `You are a platform administrator. What you can do:
- Content Management: upload and manage e-learning, HR procedures, state policies → /admin/content-dashboard
- System Monitoring: platform health and metrics → /admin/system-monitoring
- User Management: view and manage all users and roles → /users
- Discount Management: create and manage discount codes → /admin/discount-terminations
- Design System: component library → /design-system
- You also have read access to Foundation, Supplier, Service Provider, and Educator sections for oversight.`,

  [UserRole.SUPER_ADMIN]: `You are a super administrator with full platform access. What you can do:
- Everything an Admin can do, with elevated permissions
- Content Management, System Monitoring, User Management, Discount Management
- Platform-wide configuration and oversight across all roles`,
};

export function getRoleCapabilities(role: UserRole, activeFlags: Set<string>): string {
  const base = ROLE_CAPABILITIES_BASE[role] ?? '';
  if (role === UserRole.FOUNDATION && activeFlags.has('v2_staffing_ia')) {
    return base + FOUNDATION_STAFFING_LINES;
  }
  return base;
}
