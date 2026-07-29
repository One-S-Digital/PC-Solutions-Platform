import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';

interface MirrorRolePayload {
  clerkUserId: string;
  role: string;
}

interface EmailSyncPayload {
  clerkId: string;
  newEmail: string;
  errorMessage?: string;
  attemptedAt?: string;
}

interface EmailDeletePayload {
  clerkId: string;
  emailAddressId: string;
  emailAddress?: string;
  reason?: string;
  scheduledAt?: string;
}

interface UserDeletePayload {
  clerkId: string;
  reason?: string;
  requestedAt?: string;
}

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private clerk: any = null;
  private isEnabled: boolean = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (clerkSecretKey) {
      this.clerk = createClerkClient({ secretKey: clerkSecretKey });
      this.isEnabled = true;
    } else {
      this.logger.warn('CLERK_SECRET_KEY not configured - outbox worker will be disabled');
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox() {
    if (!this.isEnabled) {
      return; // Skip processing if Clerk is not configured
    }
    
    try {
      // Use raw query with FOR UPDATE SKIP LOCKED for concurrent safety
      const jobs = await this.prisma.$queryRaw<
        { id: bigint; topic: string; payload: any; attempts: number }[]
      >`
        SELECT id, topic, payload, attempts 
        FROM "Outbox" 
        WHERE "nextRunAt" <= NOW() 
        ORDER BY id 
        LIMIT 50 
        FOR UPDATE SKIP LOCKED
      `;

      for (const job of jobs) {
        try {
          await this.processJob(job);
          
          // Delete successful job
          await this.prisma.outbox.delete({
            where: { id: Number(job.id) },
          });
        } catch (error) {
          await this.handleJobError(job, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process outbox', error);
    }
  }

  private async processJob(job: { topic: string; payload: any }) {
    if (job.topic === 'mirror.role') {
      await this.mirrorRoleToClerk(job.payload as MirrorRolePayload);
    } else if (job.topic === 'clerk.email.sync') {
      await this.syncEmailToClerk(job.payload as EmailSyncPayload);
    } else if (job.topic === 'clerk.email.delete') {
      await this.deleteOldEmailFromClerk(job.payload as EmailDeletePayload);
    } else if (job.topic === 'clerk.user.delete') {
      await this.deleteUserFromClerk(job.payload as UserDeletePayload);
    } else {
      this.logger.warn(`Unknown outbox topic: ${job.topic}`);
    }
  }

  private async mirrorRoleToClerk(payload: MirrorRolePayload) {
    const { clerkUserId, role } = payload;
    
    this.logger.log(`Mirroring role to Clerk: ${clerkUserId} -> ${role}`);
    
    try {
      // First check if user exists in Clerk
      await this.clerk.users.getUser(clerkUserId);
      
      // Update Clerk user metadata
      await this.clerk.users.updateUser(clerkUserId, {
        publicMetadata: { role },
        unsafeMetadata: { role: undefined }, // Clear unsafe metadata
      });
      
      this.logger.log(`Successfully mirrored role for ${clerkUserId}`);
    } catch (error) {
      if (error?.status === 404) {
        this.logger.warn(`User ${clerkUserId} not found in Clerk, skipping role mirror`);
        return; // Don't throw error for non-existent users
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Sync email to Clerk authentication provider (retry handler for outbox).
   * This is called when the initial sync failed and was queued for retry.
   */
  private async syncEmailToClerk(payload: EmailSyncPayload) {
    const { clerkId, newEmail } = payload;
    
    this.logger.log(`📧 [OUTBOX] Retrying email sync to Clerk: ${clerkId} -> ${newEmail}`);
    
    try {
      // First check if user exists in Clerk
      const clerkUser = await this.clerk.users.getUser(clerkId);
      
      // Check if the new email already exists for this user
      const existingEmailAddress = clerkUser.emailAddresses?.find(
        (ea: any) => ea.emailAddress.toLowerCase() === newEmail.toLowerCase()
      );
      
      if (existingEmailAddress) {
        // Email already exists, just make sure it's set as primary
        if (clerkUser.primaryEmailAddressId !== existingEmailAddress.id) {
          this.logger.log(`📧 [OUTBOX] Setting existing email as primary for ${clerkId}`);
          await this.clerk.users.updateUser(clerkId, {
            primaryEmailAddressId: existingEmailAddress.id,
          });
        } else {
          this.logger.log(`📧 [OUTBOX] Email ${newEmail} is already the primary email for ${clerkId}`);
        }
      } else {
        // Create a new email address for the user
        this.logger.log(`📧 [OUTBOX] Creating new email address ${newEmail} for ${clerkId}`);
        await this.clerk.emailAddresses.createEmailAddress({
          userId: clerkId,
          emailAddress: newEmail,
          verified: true, // Admin updates should skip verification
          primary: true, // Set as primary immediately
        });
      }
      
      this.logger.log(`✅ [OUTBOX] Successfully synced email for ${clerkId}`);
    } catch (error: any) {
      if (error?.status === 404) {
        this.logger.warn(`User ${clerkId} not found in Clerk, skipping email sync`);
        return; // Don't throw error for non-existent users
      }
      throw error; // Re-throw other errors for retry
    }
  }

  /**
   * Delete old email from Clerk after grace period has expired.
   * This is scheduled when a user's email is changed to clean up the old address.
   */
  private async deleteOldEmailFromClerk(payload: EmailDeletePayload) {
    const { clerkId, emailAddressId, emailAddress, reason } = payload;
    
    this.logger.log(
      `🗑️ [OUTBOX] Deleting old email ${emailAddress || emailAddressId} for user ${clerkId}. ` +
      `Reason: ${reason || 'Grace period expired'}`
    );
    
    try {
      // First check if user still exists in Clerk
      const clerkUser = await this.clerk.users.getUser(clerkId);
      
      // Check if the email address still exists and is not the primary
      const emailToDelete = clerkUser.emailAddresses?.find(
        (ea: any) => ea.id === emailAddressId
      );
      
      if (!emailToDelete) {
        this.logger.log(
          `ℹ️ [OUTBOX] Email ${emailAddressId} no longer exists for user ${clerkId}, ` +
          `skipping deletion (may have been manually deleted)`
        );
        return;
      }
      
      // Safety check: Don't delete the primary email
      if (clerkUser.primaryEmailAddressId === emailAddressId) {
        this.logger.warn(
          `⚠️ [OUTBOX] Cannot delete email ${emailAddressId} - it is now the primary email ` +
          `for user ${clerkId}. The user may have reverted the change.`
        );
        return;
      }
      
      // Safety check: Don't delete if it's the only email left
      const emailCount = clerkUser.emailAddresses?.length || 0;
      if (emailCount <= 1) {
        this.logger.warn(
          `⚠️ [OUTBOX] Cannot delete email ${emailAddressId} - it is the only email ` +
          `for user ${clerkId}. Skipping to prevent account lockout.`
        );
        return;
      }
      
      // Delete the old email address
      await this.clerk.emailAddresses.deleteEmailAddress(emailAddressId);
      
      this.logger.log(
        `✅ [OUTBOX] Successfully deleted old email ${emailAddress || emailAddressId} ` +
        `for user ${clerkId}`
      );
    } catch (error: any) {
      if (error?.status === 404) {
        this.logger.warn(
          `User or email ${clerkId}/${emailAddressId} not found in Clerk, ` +
          `skipping deletion (may have been already deleted)`
        );
        return; // Don't throw error for non-existent resources
      }
      throw error; // Re-throw other errors for retry
    }
  }

  private async deleteUserFromClerk(payload: UserDeletePayload) {
    const { clerkId, reason } = payload;
    this.logger.log(`🗑️ [OUTBOX] Deleting Clerk user ${clerkId}. Reason: ${reason || 'n/a'}`);

    try {
      await this.clerk.users.deleteUser(clerkId);
      this.logger.log(`✅ [OUTBOX] Successfully deleted Clerk user ${clerkId}`);
    } catch (error: any) {
      if (error?.status === 404) {
        this.logger.warn(`ℹ️ [OUTBOX] Clerk user ${clerkId} not found, skipping deletion`);
        return;
      }
      throw error;
    }
  }

  private async handleJobError(
    job: { id: bigint; attempts: number }, 
    error: any
  ) {
    const errorMessage = error?.message || String(error);
    const attempts = Number(job.attempts) + 1;
    
    // If job has failed too many times, delete it to prevent infinite retries
    if (attempts >= 100) {
      this.logger.warn(
        `Outbox job ${job.id} has failed ${attempts} times, deleting to prevent infinite retries`
      );
      await this.prisma.outbox.delete({
        where: { id: Number(job.id) },
      });
      return;
    }
    
    // Calculate next retry with exponential backoff (max 60 seconds)
    const delaySeconds = Math.min(60, Math.pow(2, Math.min(6, attempts)) * 1);
    const nextRunAt = new Date(Date.now() + delaySeconds * 1000);
    
    this.logger.error(
      `Outbox job ${job.id} failed (attempt ${attempts}): ${errorMessage}`
    );
    
    // Update job with retry info
    await this.prisma.outbox.update({
      where: { id: Number(job.id) },
      data: {
        attempts,
        lastError: errorMessage.substring(0, 500), // Limit error message length
        nextRunAt,
      },
    });
  }
}