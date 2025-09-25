import { IsString, IsOptional, IsUrl, IsHexColor, IsBoolean, IsObject } from 'class-validator';

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

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  // Brand Accent Color (main application)
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

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactAddress?: string;

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

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @IsOptional()
  @IsString()
  googleTagManagerId?: string;

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