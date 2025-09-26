import { IsString, IsOptional, IsUrl, IsHexColor, IsBoolean, IsObject, IsUUID } from 'class-validator';

export class UpdateFrontendSettingsDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  siteDescription?: string;

  @IsOptional()
  @IsString()
  siteKeywords?: string;

  // Asset IDs for file uploads
  @IsOptional()
  @IsUUID()
  logoAssetId?: string;

  @IsOptional()
  @IsUUID()
  faviconAssetId?: string;

  @IsOptional()
  @IsUUID()
  ogImageAssetId?: string;

  @IsOptional()
  @IsUUID()
  adminLogoAssetId?: string;

  @IsOptional()
  @IsUUID()
  adminFaviconAssetId?: string;

  // Branding Colors
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  // Admin Dashboard Branding
  @IsOptional()
  @IsHexColor()
  adminPrimaryColor?: string;

  @IsOptional()
  @IsHexColor()
  adminSecondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  adminAccentColor?: string;

  // Contact Information
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactAddress?: string;

  // Social Media URLs
  @IsOptional()
  @IsUrl()
  facebookUrl?: string;

  @IsOptional()
  @IsUrl()
  twitterUrl?: string;

  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @IsOptional()
  @IsUrl()
  instagramUrl?: string;

  // SEO
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  // Analytics
  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @IsOptional()
  @IsString()
  googleTagManagerId?: string;

  // Legal URLs
  @IsOptional()
  @IsUrl()
  privacyPolicyUrl?: string;

  @IsOptional()
  @IsUrl()
  termsOfServiceUrl?: string;

  @IsOptional()
  @IsUrl()
  cookiePolicyUrl?: string;

  // Theme Settings
  @IsOptional()
  @IsBoolean()
  enableDarkMode?: boolean;

  @IsOptional()
  @IsString()
  defaultTheme?: string;

  // Customization Objects
  @IsOptional()
  @IsObject()
  mainAppCustomization?: any;

  @IsOptional()
  @IsObject()
  adminCustomization?: any;
}