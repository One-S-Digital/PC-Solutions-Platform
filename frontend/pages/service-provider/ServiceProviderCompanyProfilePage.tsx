// This file is deprecated and its functionality is now handled by ServiceProviderSettingsPage.tsx.
// The route in App.tsx should redirect /service-provider/company-profile to /settings/service-provider.
import React from 'react';
import { Navigate } from 'react-router-dom';

const ServiceProviderCompanyProfilePage: React.FC = () => {
  return <Navigate to="/settings/service-provider" replace />;
};

export default ServiceProviderCompanyProfilePage;
