import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Webhook } from 'svix';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

// Simple in-memory set for idempotency (replace with Redis in production)
const processedEvents = new Set<string>();

interface ClerkWebhookEvent {
  type: string;
  data: any;
}

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);
  private clerk: any;
  private webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
    
    this.logger.log('🔧 [WEBHOOK INIT] Initializing Clerk webhook controller', {
      hasClerkSecretKey: !!clerkSecretKey,
      hasWebhookSecret: !!webhookSecret,
      clerkSecretKeyPrefix: clerkSecretKey ? clerkSecretKey.substring(0, 10) + '...' : 'MISSING',
      webhookSecretPrefix: webhookSecret ? webhookSecret.substring(0, 10) + '...' : 'MISSING',
    });
    
    if (!clerkSecretKey) {
      this.logger.error('❌ [WEBHOOK INIT] CLERK_SECRET_KEY is not configured');
      throw new Error('CLERK_SECRET_KEY is not configured');
    }
    if (!webhookSecret) {
      this.logger.error('❌ [WEBHOOK INIT] CLERK_WEBHOOK_SECRET is not configured');
      throw new Error('CLERK_WEBHOOK_SECRET is not configured');
    }
    
    this.clerk = createClerkClient({ secretKey: clerkSecretKey });
    this.webhookSecret = webhookSecret;
    
    this.logger.log('✅ [WEBHOOK INIT] Clerk webhook controller initialized successfully');
  }

  @Get('health')
  @Public()
  healthCheck() {
    const hasWebhookSecret = !!this.webhookSecret;
    const hasClerkClient = !!this.clerk;
    
    this.logger.log('🏥 [WEBHOOK HEALTH] Health check requested', {
      hasWebhookSecret,
      hasClerkClient,
      timestamp: new Date().toISOString(),
    });
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      webhookConfigured: hasWebhookSecret,
      clerkClientConfigured: hasClerkClient,
      message: hasWebhookSecret && hasClerkClient 
        ? 'Webhook is properly configured' 
        : 'Webhook configuration issues detected',
    };
  }

  @Post()
  @Public()
  @HttpCode(204)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const requestId = Math.random().toString(36).substring(7);
    
    // Enhanced debugging - log all incoming request details
    this.logger.log(`🔍 [WEBHOOK DEBUG ${requestId}] Webhook request received`, {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'] ? 'present' : 'missing',
        'content-length': req.headers['content-length'],
        'host': req.headers['host'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
      },
      bodyLength: req.body?.length || 0,
      bodyType: typeof req.body,
      bodyPreview: req.body ? String(req.body).substring(0, 200) + '...' : 'empty',
    });

    // Check webhook secret configuration
    if (!this.webhookSecret) {
      this.logger.error(`❌ [WEBHOOK DEBUG ${requestId}] CLERK_WEBHOOK_SECRET is not configured`);
      return res.status(500).send('Webhook secret not configured');
    }

    // Get Svix headers
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    this.logger.log(`🔍 [WEBHOOK DEBUG ${requestId}] Svix headers check`, {
      svixId: svixId || 'MISSING',
      svixTimestamp: svixTimestamp || 'MISSING',
      svixSignature: svixSignature ? 'present' : 'MISSING',
    });

    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.error(`❌ [WEBHOOK DEBUG ${requestId}] Missing Svix headers`, {
        missing: {
          svixId: !svixId,
          svixTimestamp: !svixTimestamp,
          svixSignature: !svixSignature,
        }
      });
      return res.status(400).send('Missing Svix headers');
    }

    // Check idempotency
    if (processedEvents.has(svixId)) {
      this.logger.log(`⏭️ [WEBHOOK DEBUG ${requestId}] Skipping duplicate event: ${svixId}`);
      return res.status(204).end();
    }

    // Verify webhook signature
    let event: ClerkWebhookEvent;
    try {
      this.logger.log(`🔐 [WEBHOOK DEBUG ${requestId}] Verifying webhook signature`, {
        secretLength: this.webhookSecret.length,
        secretPrefix: this.webhookSecret.substring(0, 10) + '...',
        bodyLength: req.body?.length || 0,
      });

      const webhook = new Webhook(this.webhookSecret);
      event = webhook.verify(req.body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;

      this.logger.log(`✅ [WEBHOOK DEBUG ${requestId}] Signature verification successful`, {
        eventType: event.type,
        eventDataKeys: Object.keys(event.data || {}),
      });
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK DEBUG ${requestId}] Invalid webhook signature`, {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        bodyPreview: req.body ? String(req.body).substring(0, 100) : 'empty',
      });
      return res.status(400).send('Invalid signature');
    }

    // Process event
    try {
      this.logger.log(`🔄 [WEBHOOK DEBUG ${requestId}] Processing event`, {
        type: event.type,
        userId: event.data?.id,
        email: event.data?.email_addresses?.[0]?.email_address,
      });

      await this.processEvent(event);
      processedEvents.add(svixId);
      
      this.logger.log(`✅ [WEBHOOK DEBUG ${requestId}] Event processed successfully`);
      
      // Clean up old events (keep last 10000)
      if (processedEvents.size > 10000) {
        const firstKey = processedEvents.values().next().value;
        processedEvents.delete(firstKey);
      }
      
      return res.status(204).end();
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK DEBUG ${requestId}] Failed to process webhook event`, {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        eventType: event?.type,
        eventData: event?.data,
      });
      return res.status(500).send('Webhook processing failed');
    }
  }

  private async processEvent(event: ClerkWebhookEvent) {
    const { type, data } = event;
    
    this.logger.log(`Processing webhook event: ${type}`);
    
    switch (type) {
      case 'user.created':
        await this.handleUserCreated(data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(data);
        break;
      default:
        this.logger.log(`Ignoring event type: ${type}`);
    }
  }

  private async handleUserCreated(data: any) {
    const clerkId: string = data.id;
    
    // Check for intended role in private metadata (from invitation flow)
    // or unsafe metadata (from signup flow)
    const intendedRole = 
      data.private_metadata?.intendedRole || 
      data.unsafe_metadata?.role ||
      data.unsafe_metadata?.pendingRole ||  // Also check pendingRole from signup
      data.unsafe_metadata?.signupType ||   // Also check signupType from signup
      'PARENT';
    
    // Validate role
    const validRole = this.isValidRole(intendedRole) ? intendedRole : 'PARENT';
    
    // Create user in our database
    const primaryEmail = data.email_addresses?.[0]?.email_address || `${clerkId}@missing-email.local`;
    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || 'User';

    const appUser = await this.prisma.appUser.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email: primaryEmail,
        role: validRole as UserRole,
      },
      update: {
        role: validRole as UserRole,
        email: primaryEmail,
      },
      select: { id: true, role: true },
    });

    await this.prisma.user.upsert({
      where: { clerkId },
      create: {
        id: appUser.id,
        clerkId,
        email: primaryEmail,
        firstName,
        lastName,
        role: validRole as UserRole,
      },
      update: {
        email: primaryEmail,
        firstName,
        lastName,
        role: validRole as UserRole,
      },
    });
    
    // Sync role to Clerk public metadata
    const clerkUser = await this.clerk.users.getUser(clerkId);
    const currentPublicRole = (clerkUser.publicMetadata as any)?.role;
    
    if (currentPublicRole !== appUser.role) {
      await this.clerk.users.updateUser(clerkId, {
        publicMetadata: { 
          ...(clerkUser.publicMetadata as any), 
          role: appUser.role 
        },
        unsafeMetadata: { 
          ...(clerkUser.unsafeMetadata as any), 
          role: undefined 
        },
      });
    }
    
    this.logger.log(`User created: ${clerkId} with role ${appUser.role}`);
  }

  private async handleUserUpdated(data: any) {
    const clerkId: string = data.id;
    const unsafeRole = data.unsafe_metadata?.role;
    const publicRole = data.public_metadata?.role;
    const primaryEmail = data.email_addresses?.[0]?.email_address || `${clerkId}@missing-email.local`;
    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || 'User';

    // Get user from our database (source of truth)
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      // User doesn't exist in our DB, create it
      await this.handleUserCreated(data);
      return;
    }

    await this.prisma.appUser.update({
      where: { id: appUser.id },
      data: { email: primaryEmail },
    });

    await this.prisma.user.update({
      where: { clerkId },
      data: {
        email: primaryEmail,
        firstName,
        lastName,
      },
    }).catch(async () => {
      await this.prisma.user.create({
        data: {
          id: appUser.id,
          clerkId,
          email: primaryEmail,
          firstName,
          lastName,
          role: appUser.role,
        },
      });
    });

    // If someone changed Clerk metadata outside our system, revert to DB truth
    if (publicRole && publicRole !== appUser.role) {
      this.logger.warn(
        `Reverting unauthorized role change for ${clerkId}: ` +
        `${publicRole} -> ${appUser.role}`
      );

      await this.clerk.users.updateUser(clerkId, {
        publicMetadata: {
          ...(data.public_metadata ?? {}),
          role: appUser.role
        },
      });
    }

    // Always scrub unsafe metadata role
    if (typeof unsafeRole !== 'undefined') {
      await this.clerk.users.updateUser(clerkId, {
        unsafeMetadata: {
          ...(data.unsafe_metadata ?? {}),
          role: undefined
        },
      });
    }
  }

  private async handleUserDeleted(data: any) {
    const clerkId: string = data.id;
    
    // Soft delete or hard delete based on your requirements
    // For now, we'll keep the user but mark as deleted
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });
    
    if (appUser) {
      // Add a deletion record to history
      await this.prisma.appUserRoleHistory.create({
        data: {
          userId: appUser.id,
          previousRole: appUser.role,
          newRole: appUser.role, // Same role, just marking deletion
          changedBy: 'system/webhook',
          reason: 'User deleted from Clerk',
        },
      });
    }
    
    this.logger.log(`User deleted: ${clerkId}`);
  }

  private isValidRole(role: any): boolean {
    return Object.values(UserRole).includes(role);
  }
}