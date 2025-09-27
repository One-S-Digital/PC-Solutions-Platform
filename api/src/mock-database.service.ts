import { Injectable } from '@nestjs/common';

export interface MockFrontendSettings {
  id: string;
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoAssetId?: string;
  faviconAssetId?: string;
  ogImageAssetId?: string;
  adminLogoAssetId?: string;
  adminFaviconAssetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MockDatabaseService {
  private frontendSettings: MockFrontendSettings = {
    id: '1',
    siteName: 'PC Solutions',
    siteDescription: 'Your trusted partner in early childhood education',
    contactEmail: 'contact@pc-solutions.com',
    contactPhone: '+41 44 123 4567',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  private assets: MockAsset[] = [];

  // Frontend Settings Methods
  async getFrontendSettings(): Promise<MockFrontendSettings> {
    return { ...this.frontendSettings };
  }

  async updateFrontendSettings(updates: Partial<MockFrontendSettings>): Promise<MockFrontendSettings> {
    this.frontendSettings = {
      ...this.frontendSettings,
      ...updates,
      updatedAt: new Date(),
    };
    return { ...this.frontendSettings };
  }

  // Asset Methods
  async createAsset(asset: Omit<MockAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<MockAsset> {
    const newAsset: MockAsset = {
      ...asset,
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets.push(newAsset);
    return { ...newAsset };
  }

  async getAssetById(id: string): Promise<MockAsset | null> {
    const asset = this.assets.find(a => a.id === id);
    return asset ? { ...asset } : null;
  }

  async getAssetsByKind(kind: string): Promise<MockAsset[]> {
    return this.assets.filter(a => a.kind === kind).map(a => ({ ...a }));
  }

  async deleteAsset(id: string): Promise<boolean> {
    const index = this.assets.findIndex(a => a.id === id);
    if (index !== -1) {
      this.assets.splice(index, 1);
      return true;
    }
    return false;
  }

  // Utility Methods
  async reset(): Promise<void> {
    this.frontendSettings = {
      id: '1',
      siteName: 'PC Solutions',
      siteDescription: 'Your trusted partner in early childhood education',
      contactEmail: 'contact@pc-solutions.com',
      contactPhone: '+41 44 123 4567',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets = [];
  }

  async getStats(): Promise<{ settingsCount: number; assetsCount: number }> {
    return {
      settingsCount: 1,
      assetsCount: this.assets.length,
    };
  }
}