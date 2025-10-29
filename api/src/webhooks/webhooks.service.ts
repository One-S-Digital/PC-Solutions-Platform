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
      this.logger.warn('CLERK_WEBHOOK_SECRET not configured');
      return true; // Skip verification in development
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
      this.logger.log(`Creating user: ${clerkId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Check if user already exists
      const existingAppUser = await this.usersService.findAppUserByClerkId(clerkId);
      if (existingAppUser) {
        this.logger.log(`User already exists: ${clerkId}`);
        return;
      }
      
      // Create user with retry logic
      await this.createUserWithRetry(userData, retryCount);
      
      this.logger.log(`✅ User created successfully: ${clerkId}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to create user ${clerkId} (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000;
        this.logger.warn(`Retrying user creation in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.handleUserCreated(userData, retryCount + 1);
      } else {
        this.logger.error(`❌ User creation failed after ${maxRetries + 1} attempts: ${clerkId}`);
        // Don't throw - let Clerk retry the webhook
      }
    }
  }

  private async createUserWithRetry(userData: any, retryCount: number) {
    const clerkId = userData.id;
    
    try {
      // Create AppUser first
      const appUser = await this.usersService.createAppUser({
        clerkId,
        email: userData.email_addresses?.[0]?.email_address,
        role: 'PARENT', // Default role, will be updated by webhook
      });
      
      this.logger.log(`AppUser created: ${appUser.id} for ClerkId: ${clerkId}`);
      
      // Create User profile
      const user = await this.usersService.syncWithClerk({
        id: clerkId,
        email_addresses: userData.email_addresses,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      });
      
      this.logger.log(`User profile created: ${user.id} for ClerkId: ${clerkId}`);
      
      return user;
      
    } catch (error) {
      this.logger.error(`User creation failed (attempt ${retryCount + 1}):`, error);
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
