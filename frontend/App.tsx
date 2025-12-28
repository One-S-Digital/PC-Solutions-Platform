

import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage'; // This will be the Foundation default dashboard
import MarketplacePage from './pages/MarketplacePage';
import RecruitmentPage from './pages/RecruitmentPage';
import HRProceduresPage from './pages/HRProceduresPage';
import StatePoliciesPage from './pages/StatePoliciesPage';
import ELearningPage from './pages/ELearningPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ProfileEditPage from './pages/ProfileEditPage';
import { AppContextProvider, AppContextProviderE2E, useAppContext } from './contexts/AppContext';
import { CartProvider } from './contexts/CartContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SubscriptionProvider, SubscriptionProviderE2E } from './contexts/SubscriptionContext';
import { SubscriptionPaywall } from './components/shared/SubscriptionPaywall';
import { useAuthContext } from './providers/AuthProvider';
import { UserRole } from './types';
import { useFrontendSettings } from './hooks/useFrontendSettings';

// Development-only logging helper
const devLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

// New Pages
// FIX: Corrected import casing to resolve filename conflict by consolidating into a single file with PascalCase naming.
import PartnersPage from './pages/PartnersPage';
import LoginPage from './pages/LoginPage'; // New Login Page
import SignupPage from './pages/SignupPage'; // New Signup Page Placeholder
import ParentLeadFormPage from './pages/ParentLeadFormPage';
import ParentEnquiriesPage from './pages/parent/ParentEnquiriesPage';
import FoundationLeadsPage from './pages/foundation/FoundationLeadsPage';
import ContentManagementDashboardPage from './pages/admin/ContentManagementDashboardPage'; 
import AdminSystemMonitoringPage from './pages/admin/AdminSystemMonitoringPage';
import DashboardDetailPage from './pages/DashboardDetailPage'; 
import PartnerDetailPage from './pages/partner/PartnerDetailPage'; 
import CandidateProfilePage from './pages/candidate/CandidateProfilePage';
import MessagesPage from './pages/MessagesPage'; 
import NotificationsPage from './pages/NotificationsPage';
import FileGalleryPage from './pages/FileGalleryPage';
import DesignSystemPage from './pages/DesignSystemPage'; // New Design System Page
import DiscountTerminationsPage from './pages/admin/DiscountTerminationsPage'; // New Admin Page


// Product Supplier Pages
import SupplierDashboardPage from './pages/supplier/SupplierDashboardPage';
import SupplierOrdersPage from './pages/supplier/SupplierOrdersPage';
import SupplierProductListingsPage from './pages/supplier/SupplierProductListingsPage';
import SupplierAnalyticsPage from './pages/supplier/SupplierAnalyticsPage';
import SupplierCompanyProfilePage from './pages/supplier/SupplierCompanyProfilePage';
import SupplierOrganisationProfilePage from './pages/supplier/SupplierOrganisationProfilePage';
import SupplierSupportPage from './pages/supplier/SupplierSupportPage';

// Service Provider Pages
import ServiceProviderDashboardPage from './pages/service-provider/ServiceProviderDashboardPage';
import ServiceProviderRequestsPage from './pages/service-provider/ServiceProviderRequestsPage';
import ServiceProviderListingsPage from './pages/service-provider/ServiceProviderListingsPage';
import ServiceProviderAnalyticsPage from './pages/service-provider/ServiceProviderAnalyticsPage';
import ServiceProviderCompanyProfilePage from './pages/service-provider/ServiceProviderCompanyProfilePage';
import ServiceProviderOrganisationProfilePage from './pages/service-provider/ServiceProviderOrganisationProfilePage';
import ServiceProviderSupportPage from './pages/service-provider/ServiceProviderSupportPage';
import ServiceProviderSettingsPage from './pages/ServiceProviderSettingsPage';

// Foundation Pages (some may reuse existing top-level pages)
import FoundationDashboardPage from './pages/foundation/FoundationDashboardPage';
import FoundationOrdersAppointmentsPage from './pages/foundation/FoundationOrdersAppointmentsPage';
import FoundationAnalyticsPage from './pages/foundation/FoundationAnalyticsPage';
import FoundationOrganisationProfilePage from './pages/foundation/FoundationOrganisationProfilePage';
import FoundationSupportPage from './pages/foundation/FoundationSupportPage';

// Educator Pages
import EducatorDashboardPage from './pages/educator/EducatorDashboardPage';
import EducatorJobBoardPage from './pages/educator/EducatorJobBoardPage';
import EducatorProfilePage from './pages/educator/EducatorProfilePage';
import EducatorApplicationsPage from './pages/educator/EducatorApplicationsPage';
import EducatorSupportPage from './pages/educator/EducatorSupportPage';

// Parent Pages
import ParentDashboardPage from './pages/parent/ParentDashboardPage';
import ParentSupportPage from './pages/parent/ParentSupportPage';
import ParentFoundationsPage from './pages/parent/ParentFoundationsPage';
import PublicPartnersPage from './pages/PublicPartnersPage';
import ProfilePage from './pages/ProfilePage';
import OrganizationProfileViewPage from './pages/profile/OrganizationProfileViewPage';
import EducatorProfileViewPage from './pages/profile/EducatorProfileViewPage';
import LoginPageE2E from './pages/LoginPageE2E';
import SignupPageE2E from './pages/SignupPageE2E';
import PricingPage from './pages/PricingPage';


const ProtectedRoute: React.FC<{ children: React.ReactElement; roles: UserRole[] }> = ({ children, roles }): React.ReactElement | null => {
  const { currentUser } = useAppContext();
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />; // Fallback, ProtectedLayout is primary guard
  }
  if (!roles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />; // Redirect to their own dashboard if role mismatches
  }
  return children;
};

/**
 * SubscriptionGatedRoute - Wraps content that requires active subscription
 * 
 * This component combines role-based access with subscription-based access.
 * Users without an active subscription will see the SubscriptionPaywall.
 * 
 * Note: The SubscriptionPaywall component already handles:
 * - Checking if user's role requires subscription
 * - Allowing access to always-allowed routes (settings, profile, support)
 * - Showing appropriate paywall UI based on subscription status
 * 
 * @param roles - Array of UserRoles that can access this route
 * @param children - The content to render if access is granted
 * @param requiredFeature - Optional specific feature key to check
 */
const SubscriptionGatedRoute: React.FC<{ 
  children: React.ReactElement; 
  roles: UserRole[];
  requiredFeature?: string;
}> = ({ children, roles, requiredFeature }): React.ReactElement | null => {
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Wrap with SubscriptionPaywall which handles subscription checking
  return (
    <SubscriptionPaywall requiredFeature={requiredFeature}>
      {children}
    </SubscriptionPaywall>
  );
};

const RoleBasedDashboardRedirect: React.FC = () => {
  const { currentUser } = useAppContext();
  if (!currentUser) return <Navigate to="/login" replace />; // Default to login for non-logged-in

  switch (currentUser.role) {
    case UserRole.PRODUCT_SUPPLIER:
      return <Navigate to="/supplier/dashboard" replace />;
    case UserRole.SERVICE_PROVIDER:
      return <Navigate to="/service-provider/dashboard" replace />;
    case UserRole.FOUNDATION:
      return <Navigate to="/foundation/dashboard" replace />;
    case UserRole.EDUCATOR:
      return <Navigate to="/educator/dashboard" replace />;
    case UserRole.PARENT:
      return <Navigate to="/parent/dashboard" replace />; // Updated Parent redirect
    case UserRole.ADMIN:
    case UserRole.SUPER_ADMIN:
      return <Navigate to="/admin/content-dashboard" replace />;
    default:
      return <Navigate to="/login" replace />; // Fallback to login
  }
};

const ProtectedLayout: React.FC = () => {
  const { currentUser } = useAppContext();
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { isLoading: isAuthLoading } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Wait for Clerk to load before checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  // User not signed in to Clerk ? redirect to login
  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in to Clerk but no currentUser yet
  if (!currentUser) {
    // Still loading from backend ? show loading screen (prevents redirect during sync)
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-page-bg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your account...</p>
          </div>
        </div>
      );
    }
    
    
    // Backend sync failed (not loading anymore, but no user)
    // Show a manual "Complete Profile" page instead of auto-redirecting
    // This handles OAuth users and email/password users whose webhook failed
    const hasOAuthAccount = clerkUser?.externalAccounts && clerkUser.externalAccounts.length > 0;
    const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
    const userName = clerkUser?.firstName || userEmail?.split('@')[0] || 'there';
    
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-swiss-mint/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-swiss-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-swiss-charcoal mb-2">
            Welcome, {userName}!
          </h1>
          
          {/* Message */}
          <p className="text-gray-600 mb-6">
            {hasOAuthAccount 
              ? "You've signed in successfully. To get started, please complete your profile by selecting your role and providing a few details."
              : "Your account was created but your profile setup wasn't completed. Please complete your profile to continue."}
          </p>
          
          {/* Email display */}
          {userEmail && (
            <p className="text-sm text-gray-500 mb-6">
              Signed in as <span className="font-medium text-swiss-charcoal">{userEmail}</span>
            </p>
          )}
          
          {/* Complete Profile Button */}
          <button
            onClick={() => navigate('/signup', { state: { from: location, isPending: true } })}
            className="w-full bg-swiss-mint text-white font-semibold py-3 px-6 rounded-lg hover:bg-swiss-mint/90 transition-colors mb-4"
          >
            Complete Your Profile
          </button>
          
          {/* Secondary actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
            <button
              onClick={async () => {
                try {
                  await signOut();
                  navigate('/login', { replace: true });
                } catch (error) {
                  console.error('Sign out failed:', error);
                  // Force navigate to login even if sign-out fails
                  navigate('/login', { replace: true });
                }
              }}
              className="text-gray-500 hover:text-gray-700 underline"
            >
              Sign out and use a different account
            </button>
          </div>
          
          {/* Help text */}
          <p className="mt-6 text-xs text-gray-400">
            Having trouble? <Link to="/support" className="text-swiss-mint hover:underline">Contact support</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<RoleBasedDashboardRedirect />} />
          {/* Dashboard details - Gated for subscription-required roles */}
          <Route path="/dashboard/details/:detailType" element={
            <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <DashboardDetailPage />
            </SubscriptionGatedRoute>
          } />
        
        {/* Marketplace - Gated for Foundation users */}
        <Route path="/marketplace" element={<Navigate to="/marketplace/products" replace />} />
        <Route path="/marketplace/products" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <MarketplacePage />
          </SubscriptionGatedRoute>
        } />
        <Route path="/marketplace/services" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <MarketplacePage />
          </SubscriptionGatedRoute>
        } />
        
        {/* Recruitment - Gated for Foundation users */}
        <Route path="/recruitment" element={<Navigate to="/recruitment/job-listings" replace />} />
        <Route path="/recruitment/job-listings" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <RecruitmentPage />
          </SubscriptionGatedRoute>
        } />
        <Route path="/recruitment/candidate-pool" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <RecruitmentPage />
          </SubscriptionGatedRoute>
        } />
        <Route path="/candidate/:candidateId" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <CandidateProfilePage />
          </SubscriptionGatedRoute>
        } />
        
        {/* Messages - Gated for subscription-required roles */}
        <Route path="/messages" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <MessagesPage />
          </SubscriptionGatedRoute>
        } />
        <Route path="/messages/:conversationId" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <MessagesPage />
          </SubscriptionGatedRoute>
        } />

        {/* HR Procedures - Gated for Foundation users */}
        <Route path="/hr-procedures" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <HRProceduresPage />
          </SubscriptionGatedRoute>
        } />
        {/* State Policies - Gated for Foundation users */}
        <Route path="/state-policies" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <StatePoliciesPage />
          </SubscriptionGatedRoute>
        } />
        {/* E-Learning - Gated for Foundation users */}
        <Route path="/e-learning" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <ELearningPage />
          </SubscriptionGatedRoute>
        } />
        {/* Partners directory - Gated for subscription-required roles */}
        <Route path="/partners-directory" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <PartnersPage />
          </SubscriptionGatedRoute>
        } />
        <Route path="/partner/:partnerId" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}>
            <PartnerDetailPage />
          </SubscriptionGatedRoute>
        } />
          <Route path="/users/*" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}><UsersPage /></ProtectedRoute>} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION, UserRole.PARENT, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/* Frontend-facing profile routes */}
          <Route
            path="/profile/organization/:id"
            element={
              <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR, UserRole.PARENT]}>
                <OrganizationProfileViewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/educator/:id"
            element={
              <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}>
                <EducatorProfileViewPage />
              </ProtectedRoute>
            }
          />
        <Route path="/settings" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION, UserRole.PARENT, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER]}><SettingsPage /></ProtectedRoute>} />
        <Route path="/settings/profile" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION, UserRole.PARENT, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}><ProfileEditPage /></ProtectedRoute>} />
        <Route path="/settings/service-provider" element={<ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderSettingsPage /></ProtectedRoute>} />
        
        {/* Admin Specific */}
        <Route 
          path="/admin/content-dashboard" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <ContentManagementDashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/discount-terminations" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <DiscountTerminationsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/system-monitoring" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <AdminSystemMonitoringPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/support" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <FoundationSupportPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/design-system" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <DesignSystemPage />
            </ProtectedRoute>
          } 
        />

        {/* Product Supplier Routes - Subscription Gated */}
        <Route path="/supplier/dashboard" element={
          <SubscriptionGatedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierDashboardPage /></SubscriptionGatedRoute>
        } />
        <Route path="/supplier/orders" element={
          <SubscriptionGatedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierOrdersPage /></SubscriptionGatedRoute>
        } />
        <Route path="/supplier/product-listings" element={
          <SubscriptionGatedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierProductListingsPage /></SubscriptionGatedRoute>
        } />
        <Route path="/supplier/analytics" element={
          <SubscriptionGatedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierAnalyticsPage /></SubscriptionGatedRoute>
        } />
        {/* Profile/Settings/Support routes don't require subscription */}
        <Route path="/supplier/company-profile" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><Navigate to="/settings" replace /></ProtectedRoute>
        } />
        <Route path="/supplier/organisation-profile" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierOrganisationProfilePage /></ProtectedRoute>
        } />
        <Route path="/supplier/support" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierSupportPage /></ProtectedRoute>
        } />

        {/* Service Provider Routes - Subscription Gated */}
        <Route path="/service-provider/dashboard" element={
          <SubscriptionGatedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderDashboardPage /></SubscriptionGatedRoute>
        } />
        <Route path="/service-provider/requests" element={
          <SubscriptionGatedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderRequestsPage /></SubscriptionGatedRoute>
        } />
        <Route path="/service-provider/service-listings" element={
          <SubscriptionGatedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderListingsPage /></SubscriptionGatedRoute>
        } />
        <Route path="/service-provider/analytics" element={
          <SubscriptionGatedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderAnalyticsPage /></SubscriptionGatedRoute>
        } />
        {/* Profile/Settings/Support routes don't require subscription */}
        <Route path="/service-provider/company-profile" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><Navigate to="/settings/service-provider" replace /></ProtectedRoute>
        } />
        <Route path="/service-provider/organisation-profile" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderOrganisationProfilePage /></ProtectedRoute>
        } />
        <Route path="/service-provider/support" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderSupportPage /></ProtectedRoute>
        } />
        
        {/* Foundation Routes - Subscription Gated */}
        <Route path="/foundation/dashboard" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION]}><FoundationDashboardPage /></SubscriptionGatedRoute>
        } />
        <Route path="/foundation/orders-appointments" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION]}><FoundationOrdersAppointmentsPage /></SubscriptionGatedRoute>
        } />
        <Route path="/foundation/leads" element={ 
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION]}><FoundationLeadsPage /></SubscriptionGatedRoute>
        } />
        <Route path="/foundation/analytics" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION]}><FoundationAnalyticsPage /></SubscriptionGatedRoute>
        } />
        {/* Profile/Support routes don't require subscription */}
        <Route path="/foundation/organisation-profile" element={ 
          <ProtectedRoute roles={[UserRole.FOUNDATION]}><FoundationOrganisationProfilePage /></ProtectedRoute>
        } />
        <Route path="/foundation/support" element={
          <ProtectedRoute roles={[UserRole.FOUNDATION]}><FoundationSupportPage /></ProtectedRoute>
        } />

        {/* Educator Routes */}
        <Route path="/educator/dashboard" element={
          <ProtectedRoute roles={[UserRole.EDUCATOR]}><EducatorDashboardPage /></ProtectedRoute>
        } />
        <Route path="/educator/job-board" element={
          <ProtectedRoute roles={[UserRole.EDUCATOR]}><EducatorJobBoardPage /></ProtectedRoute>
        } />
        <Route path="/educator/profile" element={
          <ProtectedRoute roles={[UserRole.EDUCATOR]}><EducatorProfilePage /></ProtectedRoute>
        } />
        <Route path="/educator/applications" element={
          <ProtectedRoute roles={[UserRole.EDUCATOR]}><EducatorApplicationsPage /></ProtectedRoute>
        } />
        <Route path="/educator/support" element={
          <ProtectedRoute roles={[UserRole.EDUCATOR]}><EducatorSupportPage /></ProtectedRoute>
        } />

        {/* Parent Routes */}
        <Route path="/parent/dashboard" element={
          <ProtectedRoute roles={[UserRole.PARENT]}><ParentDashboardPage /></ProtectedRoute>
        } />
        <Route path="/parent/enquiries" element={
          <ProtectedRoute roles={[UserRole.PARENT]}><ParentEnquiriesPage /></ProtectedRoute>
        } />
        <Route path="/parent/foundations" element={
          <ProtectedRoute roles={[UserRole.PARENT]}><ParentFoundationsPage /></ProtectedRoute>
        } />
        <Route path="/parent/support" element={
          <ProtectedRoute roles={[UserRole.PARENT]}><ParentSupportPage /></ProtectedRoute>
        } />
        
        {/* Misc Protected Routes */}
        <Route path="/file-gallery" element={<ProtectedRoute roles={[UserRole.EDUCATOR]}><FileGalleryPage /></ProtectedRoute>} />
        {/* Notifications - Gated for subscription-required roles */}
        <Route path="/notifications" element={
          <SubscriptionGatedRoute roles={[UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <NotificationsPage />
          </SubscriptionGatedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
  );
};

const FrontendSettingsManager: React.FC = () => {
  const { settings } = useFrontendSettings();

  React.useEffect(() => {
    if (settings) {
      if (settings.faviconAsset?.publicUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = settings.faviconAsset.publicUrl;
        link.onerror = () => {
          console.warn('Failed to load favicon:', settings.faviconAsset?.publicUrl);
        };
      }

      if (settings.siteName) {
        document.title = settings.siteName;
      }
    }
  }, [settings]);

  return null;
};

const App: React.FC = () => {
  const isE2E = import.meta.env.MODE === 'e2e' || import.meta.env.VITE_E2E_TEST === 'true';

  // E2E mode: avoid external dependencies (Clerk/backend) and keep routes deterministic for Playwright.
  if (isE2E) {
    return (
      <AppContextProviderE2E>
        <SubscriptionProviderE2E>
          <FrontendSettingsManager />
          <Routes>
            <Route path="/login" element={<LoginPageE2E />} />
            <Route path="/signup" element={<SignupPageE2E />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />

            {/* Protected routes: always redirect to login in E2E */}
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="/settings/*" element={<Navigate to="/login" replace />} />
            <Route path="/marketplace/*" element={<Navigate to="/login" replace />} />
            <Route path="/recruitment/*" element={<Navigate to="/login" replace />} />
            <Route path="/admin/*" element={<Navigate to="/login" replace />} />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SubscriptionProviderE2E>
      </AppContextProviderE2E>
    );
  }

  return (
    <AppContextProvider>
      <FrontendSettingsManager />
      <CartProvider>
        <NotificationProvider>
          <MessagingProvider>
            <SubscriptionProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/partners" element={<PublicPartnersPage />} />
                <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </SubscriptionProvider>
          </MessagingProvider>
        </NotificationProvider>
      </CartProvider>
    </AppContextProvider>
  );
};

export default App;
