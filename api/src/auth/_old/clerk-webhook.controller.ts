import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from './public.decorator';
import { UserSyncService } from './user-sync.service';
import { Webhook } from 'svix';
import { UserRole } from '@repo/types';
import { clerkClient } from '@clerk/clerk-sdk-node';

interface ClerkWebhookEvent {
  type: string;
  data: any;
  object: string;
  id: string;
  created_at: number;
}

@ApiTags('webhooks')
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private webhook: Webhook;

  constructor(
    private readonly configService: ConfigService,
    private readonly userSyncService: UserSyncService,
  ) {
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('CLERK_WEBHOOK_SECRET is not configured');
    }
    this.webhook = new Webhook(webhookSecret);
  }

  @Post()
  @Public()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Handle Clerk webhook events' })
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() body: any,
  ) {
    // Verify webhook signature
    try {
      const payload = this.webhook.verify(
        JSON.stringify(body),
        {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        },
      ) as ClerkWebhookEvent;

      // Handle different event types
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
          console.log(`Unhandled webhook event: ${payload.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private async handleUserCreated(clerkUser: any) {
    console.log('🔄 Processing user.created webhook:', clerkUser.id);

    try {
      // Extract role from unsafeMetadata (set during signup)
      const roleFromSignup = clerkUser.unsafe_metadata?.role;
      
      if (roleFromSignup && this.isValidUserRole(roleFromSignup)) {
        console.log('📝 Syncing role from signup to publicMetadata:', roleFromSignup);
        
        // Update Clerk user's publicMetadata with the role
        await clerkClient.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            role: roleFromSignup,
          },
        });

        // Create user in database with the role
        await this.userSyncService.createUser({
          clerkId: clerkUser.id,
          email: clerkUser.email_addresses[0]?.email_address || '',
          firstName: clerkUser.first_name || '',
          lastName: clerkUser.last_name || '',
          role: roleFromSignup,
        });

        console.log('✅ User created with role:', roleFromSignup);
      } else {
        console.error('❌ No valid role found in unsafeMetadata for new user:', clerkUser.id);
        // For safety, we don't create users without roles
        // Admin must manually set role in Clerk dashboard
      }
    } catch (error) {
      console.error('Failed to handle user.created webhook:', error);
      throw error;
    }
  }

  private async handleUserUpdated(clerkUser: any) {
    console.log('🔄 Processing user.updated webhook:', clerkUser.id);

    try {
      // Check if publicMetadata has a role
      const role = clerkUser.public_metadata?.role;
      
      if (role && this.isValidUserRole(role)) {
        // Update user in database
        await this.userSyncService.updateUser(clerkUser.id, {
          email: clerkUser.email_addresses[0]?.email_address,
          firstName: clerkUser.first_name,
          lastName: clerkUser.last_name,
          role: role,
        });

        console.log('✅ User updated with role:', role);
      } else {
        console.warn('⚠️ User updated without valid role:', clerkUser.id);
      }
    } catch (error) {
      console.error('Failed to handle user.updated webhook:', error);
      throw error;
    }
  }

  private async handleUserDeleted(clerkUser: any) {
    console.log('🔄 Processing user.deleted webhook:', clerkUser.id);

    try {
      // Soft delete user in database
      await this.userSyncService.deleteUser(clerkUser.id);
      console.log('✅ User deleted:', clerkUser.id);
    } catch (error) {
      console.error('Failed to handle user.deleted webhook:', error);
      throw error;
    }
  }

  private isValidUserRole(role: any): role is UserRole {
    return Object.values(UserRole).includes(role);
  }
}