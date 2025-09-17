import React from 'react';
import { useUser } from '@clerk/clerk-react';
import FoundationDashboard from './dashboards/FoundationDashboard';
import EducatorDashboard from './dashboards/EducatorDashboard';
import ProductSupplierDashboard from './dashboards/ProductSupplierDashboard';
import ServiceProviderDashboard from './dashboards/ServiceProviderDashboard';
import ParentDashboard from './dashboards/ParentDashboard';
import { Button, Card } from '@repo/ui';

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
            <Card className="p-8 max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-swiss-mint-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👋</span>
                </div>
                <h1 className="text-2xl font-bold text-swiss-charcoal mb-2">Welcome!</h1>
                <p className="text-swiss-gray">Please complete your profile to access your personalized dashboard.</p>
              </div>
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full"
                onClick={() => window.location.href = '/profile'}
              >
                Complete Profile
              </Button>
            </Card>
          </div>
        </div>
      );
  }
}