

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
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
import { AppContextProvider, useAppContext } from './contexts/AppContext';
import { CartProvider } from './contexts/CartContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
import PricingPage from './pages/PricingPage';
import PublicPartnersPage from './pages/PublicPartnersPage';
import ProfilePage from './pages/ProfilePage';
import OrganizationProfileViewPage from './pages/profile/OrganizationProfileViewPage';
import EducatorProfileViewPage from './pages/profile/EducatorProfileViewPage';


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
  const { isLoading: isAuthLoading } = useAuthContext();
  const location = useLocation();

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
    
    // Backend sync failed (not loading anymore, but no user) ? redirect to signup
    // This handles the case where a user authenticated via OAuth but hasn't completed their profile
    return <Navigate to="/signup" state={{ from: location, isPending: true }} replace />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RoleBasedDashboardRedirect />} />
        <Route path="/dashboard/details/:detailType" element={<DashboardDetailPage />} />
        
        <Route path="/marketplace" element={<Navigate to="/marketplace/products" replace />} />
        <Route path="/marketplace/products" element={<MarketplacePage />} />
        <Route path="/marketplace/services" element={<MarketplacePage />} />
        
        <Route path="/recruitment" element={<Navigate to="/recruitment/job-listings" replace />} />
        <Route path="/recruitment/job-listings" element={<RecruitmentPage />} />
        <Route path="/recruitment/candidate-pool" element={<RecruitmentPage />} />
        <Route path="/candidate/:candidateId" element={
          <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <CandidateProfilePage />
          </ProtectedRoute>
        } />
        
        <Route path="/messages" element={
          <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <MessagesPage />
          </ProtectedRoute>
        } />
        <Route path="/messages/:conversationId" element={
            <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
            <MessagesPage />
          </ProtectedRoute>
        } />

        <Route path="/hr-procedures" element={<ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><HRProceduresPage /></ProtectedRoute>} />
        <Route path="/state-policies" element={<ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PRODUCT_SUPPLIER, UserRole.EDUCATOR, UserRole.PARENT]}><StatePoliciesPage /></ProtectedRoute>} />
        <Route path="/e-learning" element={<ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><ELearningPage /></ProtectedRoute>} />
          <Route path="/partners-directory" element={<PartnersPage />} />
          <Route
            path="/partner/:partnerId"
            element={
              <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}>
                <PartnerDetailPage />
              </ProtectedRoute>
            }
          />
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
          path="/design-system" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <DesignSystemPage />
            </ProtectedRoute>
          } 
        />

        {/* Product Supplier Routes */}
        <Route path="/supplier/dashboard" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierDashboardPage /></ProtectedRoute>
        } />
        <Route path="/supplier/orders" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierOrdersPage /></ProtectedRoute>
        } />
        <Route path="/supplier/product-listings" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierProductListingsPage /></ProtectedRoute>
        } />
        <Route path="/supplier/analytics" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierAnalyticsPage /></ProtectedRoute>
        } />
        <Route path="/supplier/company-profile" element={ // This route is effectively replaced by /settings
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><Navigate to="/settings" replace /></ProtectedRoute>
        } />
        <Route path="/supplier/organisation-profile" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierOrganisationProfilePage /></ProtectedRoute>
        } />
        <Route path="/supplier/support" element={
          <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}><SupplierSupportPage /></ProtectedRoute>
        } />

        {/* Service Provider Routes */}
        <Route path="/service-provider/dashboard" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderDashboardPage /></ProtectedRoute>
        } />
        <Route path="/service-provider/requests" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderRequestsPage /></ProtectedRoute>
        } />
        <Route path="/service-provider/service-listings" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderListingsPage /></ProtectedRoute>
        } />
        <Route path="/service-provider/analytics" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderAnalyticsPage /></ProtectedRoute>
        } />
          <Route path="/service-provider/company-profile" element={ // This route is effectively replaced by /settings/service-provider
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><Navigate to="/settings/service-provider" replace /></ProtectedRoute>
        } />
        <Route path="/service-provider/organisation-profile" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderOrganisationProfilePage /></ProtectedRoute>
        } />
        <Route path="/service-provider/support" element={
          <ProtectedRoute roles={[UserRole.SERVICE_PROVIDER]}><ServiceProviderSupportPage /></ProtectedRoute>
        } />
        
        {/* Foundation Routes */}
        <Route path="/foundation/dashboard" element={
          <ProtectedRoute roles={[UserRole.FOUNDATION]}><FoundationDashboardPage /></ProtectedRoute>
        } />
        <Route path="/foundation/orders-appointments" element={
          <ProtectedRoute roles={[UserRole.FOUNDATION]}><FoundationOrdersAppointmentsPage /></ProtectedRoute>
        } />
        <Route path="/foundation/leads" element={ 
          <ProtectedRoute roles={[UserRole.FOUNDATION]}><FoundationLeadsPage /></ProtectedRoute>
        } />
        <Route path="/foundation/analytics" element={
          <ProtectedRoute roles={[UserRole.FOUNDATION]}><FoundationAnalyticsPage /></ProtectedRoute>
        } />
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
        <Route path="/parent/support" element={
          <ProtectedRoute roles={[UserRole.PARENT]}><ParentSupportPage /></ProtectedRoute>
        } />
        
        {/* Misc Protected Routes */}
        <Route path="/file-gallery" element={<ProtectedRoute roles={[UserRole.EDUCATOR]}><FileGalleryPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><NotificationsPage /></ProtectedRoute>} />

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
  return (
    <AppContextProvider>
      <FrontendSettingsManager />
      <CartProvider>
        <MessagingProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/partners" element={<PublicPartnersPage />} />
              <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </NotificationProvider>
        </MessagingProvider>
      </CartProvider>
    </AppContextProvider>
  );
};

export default App;
