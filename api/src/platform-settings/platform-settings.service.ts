import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformSettingsDto, UpdatePlatformSettingsDto } from './dto/platform-settings.dto';
import { PlatformSettings } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PlatformSettingsService {
  private readonly CACHE_KEY_PREFIX = 'platform:settings:';
  private readonly CACHE_TTL = 60; // 60 seconds
  private readonly MAINTENANCE_CACHE_KEY = 'platform:settings:maintenance';
  private readonly MAINTENANCE_CACHE_TTL = 5; // seconds (short TTL for faster propagation)

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPlatformSettings(): Promise<PlatformSettings | null> {
    const cacheKey = this.CACHE_KEY_PREFIX + 'current';
    
    // Try cache first
    const cached = await this.cacheManager.get<PlatformSettings>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const settings = await this.prisma.platformSettings.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Store in cache
    if (settings) {
      await this.cacheManager.set(cacheKey, settings, this.CACHE_TTL * 1000);
    }

    return settings;
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
    actorId?: string,
    expectedRevision?: number,
  ): Promise<PlatformSettings> {
    return this.prisma.$transaction(async (tx) => {
      // Lock the row for update to prevent concurrent modifications
      const existingSettings = await tx.platformSettings.findUnique({
        where: { id },
      });

      if (!existingSettings) {
        throw new NotFoundException('Platform settings not found');
      }

      // Check revision for optimistic locking
      if (expectedRevision !== undefined && existingSettings.revision !== expectedRevision) {
        throw new ConflictException(
          `Settings have been modified by another user. Expected revision ${expectedRevision}, but current is ${existingSettings.revision}. Please refresh and try again.`
        );
      }

      // Update with incremented revision
      const updated = await tx.platformSettings.update({
        where: { id },
        data: {
          ...updateDto,
          revision: { increment: 1 },
          updatedBy: actorId,
        },
        include: {
          updater: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cacheManager.del(this.CACHE_KEY_PREFIX + 'current');

      // Emit event for real-time updates
      this.eventEmitter.emit('platform.settings.changed', updated);

      return updated;
    }, { timeout: 5000 });
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
    // Short-lived cache specifically for maintenance checks (middleware hits this frequently)
    const cached = await this.cacheManager.get<{ enabled: boolean; message?: string }>(
      this.MAINTENANCE_CACHE_KEY,
    );
    if (cached) return cached;

    const settings = await this.getPlatformSettings();
    const value = {
      enabled: settings?.maintenanceMode || false,
      message: settings?.maintenanceMessage || 'System is under maintenance',
    };

    await this.cacheManager.set(this.MAINTENANCE_CACHE_KEY, value, this.MAINTENANCE_CACHE_TTL * 1000);
    return value;
  }

  async toggleMaintenanceMode(
    enabled: boolean,
    message?: string,
    actor: { profileUserId?: string; clerkUserId?: string } = {},
  ): Promise<PlatformSettings> {
    const previous = await this.getPlatformSettings();
    let settings = previous;

    if (!settings) {
      // Create default settings if none exist
      settings = await this.createPlatformSettings({
        platformName: 'ProCrèche Solutions Suisse',
        maintenanceMode: enabled,
        maintenanceMessage: message,
      });
    } else {
      // Update existing settings with revision tracking
      settings = await this.updatePlatformSettings(
        settings.id,
        {
          maintenanceMode: enabled,
          maintenanceMessage: message,
        },
        actor.profileUserId,
      );
    }

    // Resolve a stable audit actorId (AuditLog.actorId references the `User` table)
    let auditActorId: string | null = actor.profileUserId || null;
    if (!auditActorId && actor.clerkUserId) {
      try {
        const user = await this.prisma.user.findUnique({ where: { clerkId: actor.clerkUserId } });
        auditActorId = user?.id || null;
      } catch {
        auditActorId = null;
      }
    }

    // Write audit log entry (System Config uses this for auditing)
    try {
      await this.prisma.auditLog.create({
        data: {
          entity: 'PlatformSettings',
          entityId: settings.id,
          action: enabled ? 'maintenance.enable' : 'maintenance.disable',
          actorId: auditActorId,
          diff: {
            before: {
              maintenanceMode: previous?.maintenanceMode ?? false,
              maintenanceMessage: previous?.maintenanceMessage ?? null,
            },
            after: {
              maintenanceMode: enabled,
              maintenanceMessage: message ?? null,
            },
          },
          metadata: {
            source: 'platform-settings',
            timestamp: new Date().toISOString(),
            actorClerkId: actor.clerkUserId || null,
          },
        },
      });
    } catch {
      // Audit logging should not block maintenance toggling.
    }

    // Invalidate maintenance cache
    await this.cacheManager.del(this.MAINTENANCE_CACHE_KEY);

    // Emit specific event for maintenance mode changes
    this.eventEmitter.emit('platform.maintenance.changed', {
      enabled,
      message,
      timestamp: new Date().toISOString(),
    });

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