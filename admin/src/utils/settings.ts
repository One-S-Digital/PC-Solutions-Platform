
import { FrontendSettings } from '../types/api';

export const getAdminLogo = (settings?: FrontendSettings) => {
  if (settings?.adminLogoAsset?.publicUrl) {
    return settings.adminLogoAsset.publicUrl;
  }
  return null;
};
