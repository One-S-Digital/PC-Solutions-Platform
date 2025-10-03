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

  private async handleUserCreated(userData: any) {
    try {
      this.logger.log(`Creating user: ${userData.id}`);
      
      await this.usersService.syncWithClerk({
        id: userData.id,
        email_addresses: userData.email_addresses,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      });

      this.logger.log(`User created successfully: ${userData.id}`);
    } catch (error) {
      this.logger.error(`Failed to create user ${userData.id}:`, error);
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
