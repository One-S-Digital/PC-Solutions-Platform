import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ClerkWebhookDto } from './dto/clerk-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly usersService: UsersService) {}

  async verifyClerkWebhook(
    payload: any,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ): Promise<boolean> {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('CLERK_WEBHOOK_SECRET not configured — rejecting webhook');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${svixId}.${svixTimestamp}.${JSON.stringify(payload)}`)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(svixSignature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  async handleClerkEvent(payload: ClerkWebhookDto) {
    switch (payload.type) {
      case 'user.created':
        await this.handleUserCreated(payload.data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(payload.data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(payload.data);
        break;
      default:
        this.logger.warn(`Unhandled webhook type: ${payload.type}`);
    }
  }

  private async handleUserCreated(userData: any, retryCount = 0) {
    const maxRetries = 3;
    const clerkId = userData.id;
    
    try {
      this.logger.log(`[USER-CREATED] Creating user: ${clerkId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Check if user already exists
      const existingAppUser = await this.usersService.findAppUserByClerkId(clerkId);
      if (existingAppUser) {
        this.logger.log(`⚠️  [USER-CREATED] User already exists: ${clerkId}, skipping creation`);
        return;
      }
      
      this.logger.log(`➡️  [USER-CREATED] User doesn't exist, proceeding with creation...`);
      
      // Create user with retry logic
      await this.createUserWithRetry(userData, retryCount);
      
      this.logger.log(`✅ [USER-CREATED] User created successfully: ${clerkId}`);
      
    } catch (error) {
      this.logger.error(`❌ [USER-CREATED] Failed to create user ${clerkId} (attempt ${retryCount + 1}):`, error);
      this.logger.error(`🔴 [USER-CREATED] Error stack: ${error.stack}`);
      this.logger.error(`🔴 [USER-CREATED] Error details: ${JSON.stringify(error, null, 2)}`);
      
      if (retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000;
        this.logger.warn(`⏰ [USER-CREATED] Retrying user creation in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.handleUserCreated(userData, retryCount + 1);
      } else {
        this.logger.error(`❌ [USER-CREATED] User creation failed after ${maxRetries + 1} attempts: ${clerkId}`);
        this.logger.error(`💀 [USER-CREATED] Giving up on user creation. Clerk will retry webhook.`);
        // Don't throw - let Clerk retry the webhook
      }
    }
  }

  private async createUserWithRetry(userData: any, retryCount: number) {
    const clerkId = userData.id;
    const email = userData.email_addresses?.[0]?.email_address;
    
    try {
      this.logger.log(`🏗️  [CREATE] Step 1: Creating AppUser...`);
      
      // Extract role from metadata (fallback to PARENT if not found)
      const pendingRole = userData.unsafe_metadata?.pendingRole || 
                         userData.unsafe_metadata?.signupType || 
                         userData.public_metadata?.role || 
                         'PARENT';
      
      this.logger.log(`🏷️  [CREATE] Extracted role: ${pendingRole}`);
      
      if (!email) {
        throw new Error('No email address found in user data');
      }
      
      // Create AppUser first
      const appUser = await this.usersService.createAppUser({
        clerkId,
        email,
        role: pendingRole,
      });
      
      this.logger.log(`✅ [CREATE] Step 1 complete: AppUser created: ${appUser.id} for ClerkId: ${clerkId}`);
      this.logger.log(`🏗️  [CREATE] Step 2: Creating User profile...`);
      
      // Create User profile
      const user = await this.usersService.syncWithClerk({
        id: clerkId,
        email_addresses: userData.email_addresses,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      });
      
      this.logger.log(`✅ [CREATE] Step 2 complete: User profile created: ${user.id} for ClerkId: ${clerkId}`);
      this.logger.log(`🎉 [CREATE] All steps complete for user: ${clerkId}`);
      
      return user;
      
    } catch (error) {
      this.logger.error(`❌ [CREATE] User creation failed (attempt ${retryCount + 1}):`, error);
      this.logger.error(`🔴 [CREATE] Failed at: ${error.message}`);
      throw error;
    }
  }

  private async handleUserUpdated(userData: any) {
    try {
      this.logger.log(`Updating user: ${userData.id}`);
      
      await this.usersService.syncWithClerk({
        id: userData.id,
        email_addresses: userData.email_addresses,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      });

      this.logger.log(`User updated successfully: ${userData.id}`);
    } catch (error) {
      this.logger.error(`Failed to update user ${userData.id}:`, error);
    }
  }

  private async handleUserDeleted(userData: any) {
    try {
      this.logger.log(`Deleting user: ${userData.id}`);
      
      // Find user by Clerk ID and mark as inactive instead of deleting
      const user = await this.usersService.findByClerkId(userData.id);
      if (user) {
        await this.usersService.update(user.id, { 
          status: 'Inactive' as any,
        });
        this.logger.log(`User deactivated successfully: ${userData.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to deactivate user ${userData.id}:`, error);
    }
  }
}
