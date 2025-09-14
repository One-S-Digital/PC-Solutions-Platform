import React from 'react';
import { useUser } from '@clerk/clerk-react';
import FoundationSettingsPage from './settings/FoundationSettingsPage';
import EducatorSettingsPage from './settings/EducatorSettingsPage';
import ProductSupplierSettingsPage from './settings/ProductSupplierSettingsPage';
import ServiceProviderSettingsPage from './settings/ServiceProviderSettingsPage';
import ParentSettingsPage from './settings/ParentSettingsPage';

export default function SettingsPage() {
  const { user } = useUser();

  // Get user role from Clerk metadata
  const userRole = user?.publicMetadata?.role as string;

  // Route to appropriate settings page based on role
  switch (userRole) {
    case 'FOUNDATION':
      return <FoundationSettingsPage />;
    case 'EDUCATOR':
      return <EducatorSettingsPage />;
    case 'PRODUCT_SUPPLIER':
      return <ProductSupplierSettingsPage />;
    case 'SERVICE_PROVIDER':
      return <ServiceProviderSettingsPage />;
    case 'PARENT':
      return <ParentSettingsPage />;
    default:
      // Default settings page for users without a specific role
      return (
        <div className="min-h-screen frontend-page flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-strong mb-4">Settings</h1>
            <p className="text-text-muted mb-6">Please complete your profile to access settings.</p>
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