import React from 'react';
import { useUser } from '@clerk/clerk-react';
import FoundationDashboard from './dashboards/FoundationDashboard';
import EducatorDashboard from './dashboards/EducatorDashboard';
import ProductSupplierDashboard from './dashboards/ProductSupplierDashboard';
import ServiceProviderDashboard from './dashboards/ServiceProviderDashboard';
import ParentDashboard from './dashboards/ParentDashboard';

export default function DashboardPage() {
  const { user } = useUser();

  // Get user role from Clerk metadata
  const userRole = user?.publicMetadata?.role as string;

  // Route to appropriate dashboard based on role
  switch (userRole) {
    case 'FOUNDATION':
      return <FoundationDashboard />;
    case 'EDUCATOR':
      return <EducatorDashboard />;
    case 'PRODUCT_SUPPLIER':
      return <ProductSupplierDashboard />;
    case 'SERVICE_PROVIDER':
      return <ServiceProviderDashboard />;
    case 'PARENT':
      return <ParentDashboard />;
    default:
      // Default dashboard for users without a specific role
      return (
        <div className="min-h-screen frontend-page flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-strong mb-4">Welcome!</h1>
            <p className="text-text-muted mb-6">Please complete your profile to access your dashboard.</p>
            <a 
              href="/profile" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              Complete Profile
            </a>
          </div>
        </div>
      );
  }
}