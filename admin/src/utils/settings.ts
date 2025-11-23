
import { FrontendSettings } from '../types/api';

export const getAdminLogo = (settings?: FrontendSettings) => {
  if (settings?.adminLogoAsset?.url) {
    return settings.adminLogoAsset.url;
  }
  return null;
};
