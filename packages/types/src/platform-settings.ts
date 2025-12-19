/**
 * Platform settings interface
 */
export interface PlatformSettings {
  id: string;
  platformName: string;
  platformDescription?: string;
  platformVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  maxFileUploadSize: number;
  allowedFileTypes: string[];
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  twoFactorRequired: boolean;
  apiRateLimit: number;
  backupFrequency: string;
  logRetentionDays: number;
  revision: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maintenance mode status
 */
export interface MaintenanceMode {
  enabled: boolean;
  message?: string;
  timestamp?: string;
}

/**
 * System configuration (public subset)
 */
export interface SystemConfiguration {
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  maxFileUploadSize: number;
  allowedFileTypes: string[];
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  twoFactorRequired: boolean;
}
