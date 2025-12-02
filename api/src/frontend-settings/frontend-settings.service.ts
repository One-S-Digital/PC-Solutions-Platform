import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFrontendSettingsDto } from './dto/update-frontend-settings.dto';
import { UploadService } from '../upload/upload.service';
import { AssetKind } from '@workspace/types';

@Injectable()
export class FrontendSettingsService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async getPublicSettings() {
    const settings = await this.getSettings();
    
    // Return only public-facing settings (no admin-specific data)
    return {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      siteKeywords: settings.siteKeywords,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      contactAddress: settings.contactAddress,
      facebookUrl: settings.facebookUrl,
      twitterUrl: settings.twitterUrl,
      linkedinUrl: settings.linkedinUrl,
      instagramUrl: settings.instagramUrl,
      metaTitle: settings.metaTitle,
      metaDescription: settings.metaDescription,
      googleAnalyticsId: settings.googleAnalyticsId,
      googleTagManagerId: settings.googleTagManagerId,
      privacyPolicyUrl: settings.privacyPolicyUrl,
      termsOfServiceUrl: settings.termsOfServiceUrl,
      cookiePolicyUrl: settings.cookiePolicyUrl,
      enableDarkMode: settings.enableDarkMode,
      defaultTheme: settings.defaultTheme,
      logoAsset: settings.logoAsset,
      faviconAsset: settings.faviconAsset,
      ogImageAsset: settings.ogImageAsset,
      sidebarLogoAsset: settings.sidebarLogoAsset,
    };
  }

  async getSettings() {
    let settings = await this.prisma.frontendSettings.findFirst({
      include: {
        logoAsset: true,
        faviconAsset: true,
        ogImageAsset: true,
        adminLogoAsset: true,
        adminFaviconAsset: true,
        sidebarLogoAsset: true,
      },
    });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await this.prisma.frontendSettings.create({
        data: {
          siteName: 'Pro Crèche Solutions',
          siteDescription: 'Leading childcare solutions platform in Switzerland',
          siteKeywords: 'childcare, daycare, switzerland, education',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          accentColor: '#F59E0B',
          adminPrimaryColor: '#1F2937',
          adminSecondaryColor: '#374151',
          adminAccentColor: '#3B82F6',
          enableDarkMode: true,
          defaultTheme: 'light',
        },
        include: {
          logoAsset: true,
          faviconAsset: true,
          ogImageAsset: true,
          adminLogoAsset: true,
          adminFaviconAsset: true,
          sidebarLogoAsset: true,
        },
      });
    }

    return settings;
  }

  async updateSettings(updateData: UpdateFrontendSettingsDto) {
    let settings = await this.prisma.frontendSettings.findFirst();
    
    if (!settings) {
      // Create new settings if none exist
      settings = await this.prisma.frontendSettings.create({
        data: updateData,
        include: {
          logoAsset: true,
          faviconAsset: true,
          ogImageAsset: true,
          adminLogoAsset: true,
          adminFaviconAsset: true,
          sidebarLogoAsset: true,
        },
      });
    } else {
      // Update existing settings
      settings = await this.prisma.frontendSettings.update({
        where: { id: settings.id },
        data: updateData,
        include: {
          logoAsset: true,
          faviconAsset: true,
          ogImageAsset: true,
          adminLogoAsset: true,
          adminFaviconAsset: true,
          sidebarLogoAsset: true,
        },
      });
    }

    return settings;
  }

  async uploadLogo(file: Express.Multer.File, uploadedById: string) {
    // Use the existing upload service
    const uploadResult = await this.uploadService.uploadFile(file, uploadedById, AssetKind.FRONTEND_LOGO);

    // Update frontend settings with new logo
    const settings = await this.getSettings();
    await this.prisma.frontendSettings.update({
      where: { id: settings.id },
      data: { logoAssetId: uploadResult.asset.id },
    });

    return uploadResult;
  }

  async uploadFavicon(file: Express.Multer.File, uploadedById: string) {
    // Use the existing upload service
    const uploadResult = await this.uploadService.uploadFile(file, uploadedById, AssetKind.FRONTEND_FAVICON);

    // Update frontend settings with new favicon
    const settings = await this.getSettings();
    await this.prisma.frontendSettings.update({
      where: { id: settings.id },
      data: { faviconAssetId: uploadResult.asset.id },
    });

    return uploadResult;
  }

  async uploadOgImage(file: Express.Multer.File, uploadedById: string) {
    // Use the existing upload service
    const uploadResult = await this.uploadService.uploadFile(file, uploadedById, AssetKind.FRONTEND_OG_IMAGE);

    // Update frontend settings with new OG image
    const settings = await this.getSettings();
    await this.prisma.frontendSettings.update({
      where: { id: settings.id },
      data: { ogImageAssetId: uploadResult.asset.id },
    });

    return uploadResult;
  }

  async uploadAdminLogo(file: Express.Multer.File, uploadedById: string) {
    // Use the existing upload service
    const uploadResult = await this.uploadService.uploadFile(file, uploadedById, AssetKind.ADMIN_LOGO);

    // Update frontend settings with new admin logo
    const settings = await this.getSettings();
    await this.prisma.frontendSettings.update({
      where: { id: settings.id },
      data: { adminLogoAssetId: uploadResult.asset.id },
    });

    return uploadResult;
  }

  async uploadAdminFavicon(file: Express.Multer.File, uploadedById: string) {
    // Use the existing upload service
    const uploadResult = await this.uploadService.uploadFile(file, uploadedById, AssetKind.ADMIN_FAVICON);

    // Update frontend settings with new admin favicon
    const settings = await this.getSettings();
    await this.prisma.frontendSettings.update({
      where: { id: settings.id },
      data: { adminFaviconAssetId: uploadResult.asset.id },
    });

    return uploadResult;
  }

  async uploadSidebarLogo(file: Express.Multer.File, uploadedById: string) {
    // Use the existing upload service
    const uploadResult = await this.uploadService.uploadFile(file, uploadedById, AssetKind.SIDEBAR_LOGO);

    // Update frontend settings with new sidebar logo
    const settings = await this.getSettings();
    await this.prisma.frontendSettings.update({
      where: { id: settings.id },
      data: { sidebarLogoAssetId: uploadResult.asset.id },
    });

    return uploadResult;
  }
}