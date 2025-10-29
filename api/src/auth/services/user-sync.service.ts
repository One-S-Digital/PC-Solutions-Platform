import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { UserRole } from '@prisma/client';

export interface SyncOptions {
  waitForWebhook?: boolean;
  webhookTimeout?: number;
  forceSync?: boolean;
}

export interface SyncResult {
  user: any;
  method: 'database' | 'webhook' | 'clerk-api';
  synced: boolean;
  duration: number;
}

/**
 * Centralized User Sync Service
 * 
 * This service is the single source of truth for ensuring users exist in the backend.
 * It handles all sync scenarios:
 * 1. User already exists in database → Return immediately
 * 2. Wait for webhook → Intelligent polling with timeout
 * 3. Fallback to Clerk API → Fetch and create user
 * 
 * Benefits:
 * - Single source of truth
 * - Prevents duplicate sync requests
 * - Intelligent webhook waiting
 * - Automatic fallback
 * - Proper error handling
 * - Easy to test and maintain
 */
@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);
  private clerkClient: any;
  private syncQueue: Map<string, Promise<SyncResult>> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeClerkClient();
  }

  private initializeClerkClient() {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (clerkSecretKey) {
      this.clerkClient = createClerkClient({ secretKey: clerkSecretKey });
      this.logger.log('✅ Clerk client initialized for user sync');
    } else {
      this.logger.warn('⚠️  CLERK_SECRET_KEY not configured - API sync will not work');
    }
  }

  /**
   * Main sync method - ensures user exists in backend
   * 
   * @param clerkId - Clerk user ID
   * @param options - Sync options (webhook timeout, force sync, etc.)
   * @returns SyncResult with user data and sync method used
   */
  async ensureUserExists(clerkId: string, options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    
    this.logger.log(`🔄 [ensureUserExists] Starting sync for clerkId: ${clerkId}`, {
      options,
    });

    // Check if already syncing (prevent duplicate requests)
    if (this.syncQueue.has(clerkId)) {
      this.logger.log(`⏳ [ensureUserExists] Sync already in progress for ${clerkId}, waiting...`);
      return this.syncQueue.get(clerkId)!;
    }

    // Start sync
    const syncPromise = this.performSync(clerkId, options, startTime);
    this.syncQueue.set(clerkId, syncPromise);

    try {
      const result = await syncPromise;
      this.logger.log(`✅ [ensureUserExists] Sync completed for ${clerkId}`, {
        method: result.method,
        duration: result.duration,
        synced: result.synced,
      });
      return result;
    } finally {
      this.syncQueue.delete(clerkId);
    }
  }

  /**
   * Perform the actual sync with intelligent fallback strategy
   */
  private async performSync(
    clerkId: string,
    options: SyncOptions,
    startTime: number,
  ): Promise<SyncResult> {
    // Strategy 1: Check database first (fastest)
    if (!options.forceSync) {
      const existingUser = await this.findUserInDatabase(clerkId);
      if (existingUser) {
        return {
          user: existingUser,
          method: 'database',
          synced: false,
          duration: Date.now() - startTime,
        };
      }
    }

    // Strategy 2: Wait for webhook (if enabled)
    if (options.waitForWebhook) {
      const timeout = options.webhookTimeout || 5000; // Default 5 seconds
      this.logger.log(`⏳ [performSync] Waiting for webhook (timeout: ${timeout}ms)...`);
      
      const webhookUser = await this.waitForWebhook(clerkId, timeout);
      if (webhookUser) {
        return {
          user: webhookUser,
          method: 'webhook',
          synced: false,
          duration: Date.now() - startTime,
        };
      }
      
      this.logger.warn(`⚠️  [performSync] Webhook timeout, falling back to Clerk API`);
    }

    // Strategy 3: Fallback to Clerk API sync (most reliable)
    this.logger.log(`🔄 [performSync] Syncing from Clerk API...`);
    const user = await this.syncFromClerkAPI(clerkId);
    
    return {
      user,
      method: 'clerk-api',
      synced: true,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Find user in database
   */
  private async findUserInDatabase(clerkId: string): Promise<any | null> {
    this.logger.debug(`🔍 [findUserInDatabase] Checking database for ${clerkId}`);
    
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      this.logger.debug(`❌ [findUserInDatabase] User not found in database`);
      return null;
    }

    this.logger.debug(`✅ [findUserInDatabase] User found in database: ${appUser.id}`);

    // Try to get full User profile
    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (user) {
        return {
          ...user,
          organizations: [],
        };
      }
    } catch (error) {
      this.logger.warn(`⚠️  [findUserInDatabase] User table query failed, returning AppUser only`);
    }

    // Return AppUser minimal data
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null,
      lastName: null,
      role: appUser.role,
      phoneNumber: null,
      isActive: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    };
  }

  /**
   * Wait for webhook to create user with intelligent polling
   */
  private async waitForWebhook(clerkId: string, timeout: number): Promise<any | null> {
    const startTime = Date.now();
    const pollInterval = 500; // Check every 500ms
    let attempts = 0;
    const maxAttempts = Math.ceil(timeout / pollInterval);

    this.logger.debug(`⏳ [waitForWebhook] Starting webhook wait`, {
      timeout,
      pollInterval,
      maxAttempts,
    });

    while (Date.now() - startTime < timeout) {
      attempts++;
      
      // Check if user was created
      const user = await this.findUserInDatabase(clerkId);
      if (user) {
        this.logger.log(`✅ [waitForWebhook] User created by webhook after ${attempts} attempts (${Date.now() - startTime}ms)`);
        return user;
      }

      // Wait before next check (exponential backoff)
      const delay = Math.min(pollInterval * Math.pow(1.2, attempts - 1), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.logger.warn(`⏱️  [waitForWebhook] Timeout after ${attempts} attempts (${Date.now() - startTime}ms)`);
    return null;
  }

  /**
   * Sync user from Clerk API and create in database
   */
  private async syncFromClerkAPI(clerkId: string): Promise<any> {
    this.logger.log(`📡 [syncFromClerkAPI] Fetching user from Clerk API: ${clerkId}`);

    if (!this.clerkClient) {
      const error = 'CLERK_SECRET_KEY not configured - cannot sync from Clerk API';
      this.logger.error(`❌ [syncFromClerkAPI] ${error}`);
      throw new BadRequestException(error);
    }

    try {
      // Fetch user from Clerk
      const clerkUser = await this.clerkClient.users.getUser(clerkId);
      this.logger.log(`✅ [syncFromClerkAPI] User fetched from Clerk`, {
        id: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      });

      // Extract user data
      const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!primaryEmail) {
        throw new BadRequestException('No email found for Clerk user');
      }

      // Determine role from metadata
      const intendedRole = this.extractRoleFromMetadata(clerkUser);
      const validRole = this.validateRole(intendedRole);

      this.logger.log(`👤 [syncFromClerkAPI] Creating user in database`, {
        clerkId,
        email: primaryEmail,
        role: validRole,
      });

      // Create AppUser
      const appUser = await this.prisma.appUser.upsert({
        where: { clerkId },
        create: {
          clerkId,
          email: primaryEmail,
          role: validRole as UserRole,
        },
        update: {
          email: primaryEmail,
          role: validRole as UserRole,
        },
      });

      this.logger.log(`✅ [syncFromClerkAPI] AppUser created: ${appUser.id}`);

      // Create User profile
      try {
        await this.prisma.user.upsert({
          where: { clerkId },
          create: {
            clerkId,
            email: primaryEmail,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
            role: validRole as UserRole,
          },
          update: {
            email: primaryEmail,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
          },
        });
        this.logger.log(`✅ [syncFromClerkAPI] User profile created`);
      } catch (userError) {
        this.logger.warn(`⚠️  [syncFromClerkAPI] User profile creation failed (non-fatal)`, {
          error: userError.message,
        });
      }

      // Return user in expected format
      return this.findUserInDatabase(clerkId);

    } catch (error) {
      this.logger.error(`❌ [syncFromClerkAPI] Failed to sync from Clerk`, {
        error: error.message,
        stack: error.stack,
      });

      if (error.status === 404) {
        throw new NotFoundException(`User not found in Clerk: ${clerkId}`);
      }

      throw new BadRequestException(`Failed to sync from Clerk: ${error.message}`);
    }
  }

  /**
   * Extract role from Clerk user metadata
   */
  private extractRoleFromMetadata(clerkUser: any): string {
    return (
      clerkUser.privateMetadata?.intendedRole ||
      clerkUser.unsafeMetadata?.role ||
      clerkUser.unsafeMetadata?.pendingRole ||
      clerkUser.unsafeMetadata?.signupType ||
      clerkUser.publicMetadata?.role ||
      'PARENT'
    );
  }

  /**
   * Validate and sanitize role
   */
  private validateRole(role: string): string {
    const validRoles = Object.values(UserRole);
    if (validRoles.includes(role as UserRole)) {
      return role;
    }
    
    this.logger.warn(`⚠️  [validateRole] Invalid role "${role}", defaulting to PARENT`);
    return 'PARENT';
  }

  /**
   * Get sync queue status (for monitoring)
   */
  getQueueStatus() {
    return {
      activeSync: this.syncQueue.size,
      clerkIds: Array.from(this.syncQueue.keys()),
    };
  }

  /**
   * Clear sync queue (for testing)
   */
  clearQueue() {
    this.syncQueue.clear();
  }
}
