import { Injectable, Logger } from '@nestjs/common';
import { MockDatabaseService } from './mock-database.service';

export interface UpdateFrontendSettingsDto {
  siteName?: string;
  siteDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoAssetId?: string;
  faviconAssetId?: string;
  ogImageAssetId?: string;
  adminLogoAssetId?: string;
  adminFaviconAssetId?: string;
}

export interface UploadResult {
  asset: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    kind: string;
    uploadedById: string;
    createdAt: Date;
    updatedAt: Date;
  };
  publicUrl: string;
}

@Injectable()
export class MockFrontendSettingsService {
  private readonly logger = new Logger(MockFrontendSettingsService.name);

  constructor(private mockDb: MockDatabaseService) {}

  async getPublicSettings() {
    this.logger.log('Getting public frontend settings');
    const settings = await this.mockDb.getFrontendSettings();
    
    // Return only public fields
    return {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
    };
  }

  async getSettings() {
    this.logger.log('Getting all frontend settings');
    return await this.mockDb.getFrontendSettings();
  }

  async updateSettings(updates: UpdateFrontendSettingsDto) {
    this.logger.log('Updating frontend settings', updates);
    return await this.mockDb.updateFrontendSettings(updates);
  }

  async uploadLogo(file: Express.Multer.File, uploadedById: string): Promise<UploadResult> {
    this.logger.log('Uploading logo', { filename: file.originalname, size: file.size });
    
    const asset = await this.mockDb.createAsset({
      filename: `logo_${Date.now()}.${file.originalname.split('.').pop()}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      kind: 'FRONTEND_LOGO',
      uploadedById,
    });

    const publicUrl = `https://mock-assets.pc-solutions.com/${asset.filename}`;

    // Update settings with new logo
    await this.mockDb.updateFrontendSettings({ logoAssetId: asset.id });

    return { asset, publicUrl };
  }

  async uploadFavicon(file: Express.Multer.File, uploadedById: string): Promise<UploadResult> {
    this.logger.log('Uploading favicon', { filename: file.originalname, size: file.size });
    
    const asset = await this.mockDb.createAsset({
      filename: `favicon_${Date.now()}.${file.originalname.split('.').pop()}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      kind: 'FRONTEND_FAVICON',
      uploadedById,
    });

    const publicUrl = `https://mock-assets.pc-solutions.com/${asset.filename}`;

    // Update settings with new favicon
    await this.mockDb.updateFrontendSettings({ faviconAssetId: asset.id });

    return { asset, publicUrl };
  }

  async uploadOgImage(file: Express.Multer.File, uploadedById: string): Promise<UploadResult> {
    this.logger.log('Uploading OG image', { filename: file.originalname, size: file.size });
    
    const asset = await this.mockDb.createAsset({
      filename: `og_image_${Date.now()}.${file.originalname.split('.').pop()}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      kind: 'FRONTEND_OG_IMAGE',
      uploadedById,
    });

    const publicUrl = `https://mock-assets.pc-solutions.com/${asset.filename}`;

    // Update settings with new OG image
    await this.mockDb.updateFrontendSettings({ ogImageAssetId: asset.id });

    return { asset, publicUrl };
  }

  async uploadAdminLogo(file: Express.Multer.File, uploadedById: string): Promise<UploadResult> {
    this.logger.log('Uploading admin logo', { filename: file.originalname, size: file.size });
    
    const asset = await this.mockDb.createAsset({
      filename: `admin_logo_${Date.now()}.${file.originalname.split('.').pop()}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      kind: 'ADMIN_LOGO',
      uploadedById,
    });

    const publicUrl = `https://mock-assets.pc-solutions.com/${asset.filename}`;

    // Update settings with new admin logo
    await this.mockDb.updateFrontendSettings({ adminLogoAssetId: asset.id });

    return { asset, publicUrl };
  }

  async uploadAdminFavicon(file: Express.Multer.File, uploadedById: string): Promise<UploadResult> {
    this.logger.log('Uploading admin favicon', { filename: file.originalname, size: file.size });
    
    const asset = await this.mockDb.createAsset({
      filename: `admin_favicon_${Date.now()}.${file.originalname.split('.').pop()}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      kind: 'ADMIN_FAVICON',
      uploadedById,
    });

    const publicUrl = `https://mock-assets.pc-solutions.com/${asset.filename}`;

    // Update settings with new admin favicon
    await this.mockDb.updateFrontendSettings({ adminFaviconAssetId: asset.id });

    return { asset, publicUrl };
  }

  async getAssetById(id: string) {
    this.logger.log('Getting asset by ID', { id });
    return await this.mockDb.getAssetById(id);
  }

  async getAssetsByKind(kind: string) {
    this.logger.log('Getting assets by kind', { kind });
    return await this.mockDb.getAssetsByKind(kind);
  }

  async deleteAsset(id: string) {
    this.logger.log('Deleting asset', { id });
    return await this.mockDb.deleteAsset(id);
  }
}