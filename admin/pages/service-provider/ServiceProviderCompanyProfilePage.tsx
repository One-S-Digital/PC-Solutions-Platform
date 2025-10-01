// This file is deprecated and its functionality is now handled by pages/SettingsPage.tsx
// The route in App.tsx should redirect /service-provider/company-profile to /settings.
import React from 'react';
import { Navigate } from 'react-router-dom';

const ServiceProviderCompanyProfilePage: React.FC = () => {
  return <Navigate to="/settings" replace />;
};

export default ServiceProviderCompanyProfilePage;
