import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ChartBarIcon, UsersIcon, ShoppingCartIcon, BriefcaseIcon, CogIcon as SettingsIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '../constants';
import { FoundationDashboard } from '../components/dashboard/FoundationDashboard';
import { SupplierDashboard } from '../components/dashboard/SupplierDashboard';
import { ServiceProviderDashboard } from '../components/dashboard/ServiceProviderDashboard';
import { EducatorDashboard } from '../components/dashboard/EducatorDashboard';
import { ParentDashboard } from '../components/dashboard/ParentDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { DashboardLayout } from '../components/layout/DashboardLayout';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-swiss-charcoal mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  // Get user role from Clerk metadata
  const userRole = user?.publicMetadata?.role as string;

  // Render role-specific dashboard
  const renderRoleDashboard = () => {
    switch (userRole) {
      case 'FOUNDATION':
        return <FoundationDashboard />;
      case 'PRODUCT_SUPPLIER':
        return <SupplierDashboard />;
      case 'SERVICE_PROVIDER':
        return <ServiceProviderDashboard />;
      case 'EDUCATOR':
        return <EducatorDashboard />;
      case 'PARENT':
        return <ParentDashboard />;
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return <AdminDashboard />;
      default:
        return <FoundationDashboard />;
    }
  };

  return (
    <DashboardLayout>
      {renderRoleDashboard()}
    </DashboardLayout>
  );
};

export default DashboardPage;