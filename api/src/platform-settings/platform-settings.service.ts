import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformSettingsDto, UpdatePlatformSettingsDto } from './dto/platform-settings.dto';
import { PlatformSettings } from '@prisma/client';

@Injectable()
export class PlatformSettingsService {
  constructor(private prisma: PrismaService) {}

  async getPlatformSettings(): Promise<PlatformSettings | null> {
    return this.prisma.platformSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPlatformSettings(createDto: CreatePlatformSettingsDto): Promise<PlatformSettings> {
    // Check if settings already exist
    const existingSettings = await this.prisma.platformSettings.findFirst();
    if (existingSettings) {
      throw new ConflictException('Platform settings already exist. Use update instead.');
    }

    return this.prisma.platformSettings.create({
      data: createDto,
    });
  }

  async updatePlatformSettings(
    id: string,
    updateDto: UpdatePlatformSettingsDto,
  ): Promise<PlatformSettings> {
    const existingSettings = await this.prisma.platformSettings.findUnique({
      where: { id },
    });

    if (!existingSettings) {
      throw new NotFoundException('Platform settings not found');
    }

    return this.prisma.platformSettings.update({
      where: { id },
      data: updateDto,
    });
  }

  async deletePlatformSettings(id: string): Promise<void> {
    const existingSettings = await this.prisma.platformSettings.findUnique({
      where: { id },
    });

    if (!existingSettings) {
      throw new NotFoundException('Platform settings not found');
    }

    await this.prisma.platformSettings.delete({
      where: { id },
    });
  }

  async getMaintenanceMode(): Promise<{ enabled: boolean; message?: string }> {
    const settings = await this.getPlatformSettings();
    return {
      enabled: settings?.maintenanceMode || false,
      message: settings?.platformDescription || 'System is under maintenance',
    };
  }

  async toggleMaintenanceMode(enabled: boolean, message?: string): Promise<PlatformSettings> {
    let settings = await this.getPlatformSettings();

    if (!settings) {
      // Create default settings if none exist
      settings = await this.createPlatformSettings({
        platformName: 'ProCrèche Solutions Suisse',
        platformDescription: message || 'System is under maintenance',
        maintenanceMode: enabled,
      });
    } else {
      // Update existing settings
      settings = await this.updatePlatformSettings(settings.id, {
        maintenanceMode: enabled,
        platformDescription: message || settings.platformDescription,
      });
    }

    return settings;
  }

  async getSystemConfiguration(): Promise<any> {
    const settings = await this.getPlatformSettings();
    if (!settings) {
      return {
        registrationEnabled: true,
        emailVerificationRequired: true,
        maxFileUploadSize: 10485760,
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
        sessionTimeout: 3600,
        passwordMinLength: 8,
        passwordRequireSpecial: true,
        twoFactorRequired: false,
        apiRateLimit: 1000,
        backupFrequency: 'daily',
        logRetentionDays: 90,
      };
    }

    return {
      registrationEnabled: settings.registrationEnabled,
      emailVerificationRequired: settings.emailVerificationRequired,
      maxFileUploadSize: settings.maxFileUploadSize,
      allowedFileTypes: settings.allowedFileTypes,
      sessionTimeout: settings.sessionTimeout,
      passwordMinLength: settings.passwordMinLength,
      passwordRequireSpecial: settings.passwordRequireSpecial,
      twoFactorRequired: settings.twoFactorRequired,
      apiRateLimit: settings.apiRateLimit,
      backupFrequency: settings.backupFrequency,
      logRetentionDays: settings.logRetentionDays,
    };
  }
}