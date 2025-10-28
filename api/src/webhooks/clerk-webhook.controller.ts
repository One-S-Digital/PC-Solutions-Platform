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
    console.log('\n' + '='.repeat(80));
    console.log('🚀 [WEBHOOK INIT] Starting Clerk Webhook Controller Initialization');
    console.log('='.repeat(80));
    
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
    
    // Log to both console and logger for visibility
    const initDebug = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      hasClerkSecretKey: !!clerkSecretKey,
      hasWebhookSecret: !!webhookSecret,
      clerkSecretKeyPrefix: clerkSecretKey ? clerkSecretKey.substring(0, 10) + '...' : '❌ MISSING',
      clerkSecretKeySuffix: clerkSecretKey ? '...' + clerkSecretKey.substring(clerkSecretKey.length - 4) : 'N/A',
      clerkSecretKeyLength: clerkSecretKey?.length || 0,
      webhookSecretPrefix: webhookSecret ? webhookSecret.substring(0, 10) + '...' : '❌ MISSING',
      webhookSecretSuffix: webhookSecret ? '...' + webhookSecret.substring(webhookSecret.length - 4) : 'N/A',
      webhookSecretLength: webhookSecret?.length || 0,
      allEnvVars: Object.keys(process.env).filter(key => 
        key.includes('CLERK') || key.includes('WEBHOOK')
      ),
    };
    
    console.log('🔍 [WEBHOOK INIT] Configuration check:', JSON.stringify(initDebug, null, 2));
    this.logger.log('🔧 [WEBHOOK INIT] Initializing Clerk webhook controller', initDebug);
    
    if (!clerkSecretKey) {
      const error = '❌ [WEBHOOK INIT] CLERK_SECRET_KEY is not configured';
      console.error(error);
      console.error('   Set CLERK_SECRET_KEY in your environment variables');
      this.logger.error(error);
      throw new Error('CLERK_SECRET_KEY is not configured');
    }
    if (!webhookSecret) {
      const error = '❌ [WEBHOOK INIT] CLERK_WEBHOOK_SECRET is not configured';
      console.error(error);
      console.error('   Set CLERK_WEBHOOK_SECRET in your environment variables');
      console.error('   Get this value from Clerk Dashboard > Webhooks > Signing Secret');
      this.logger.error(error);
      throw new Error('CLERK_WEBHOOK_SECRET is not configured');
    }
    
    this.clerk = createClerkClient({ secretKey: clerkSecretKey });
    this.webhookSecret = webhookSecret;
    
    console.log('✅ [WEBHOOK INIT] Clerk webhook controller initialized successfully');
    console.log('✅ [WEBHOOK INIT] Ready to receive webhooks at: POST /api/webhooks/clerk');
    console.log('='.repeat(80) + '\n');
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
    const startTime = Date.now();
    
    this.logger.debug(`
${'='.repeat(80)}
🔔 [WEBHOOK ${requestId}] NEW WEBHOOK REQUEST RECEIVED
${'='.repeat(80)}`);
    
    // Log ALL request details for debugging
    this.logger.debug(`📥 [WEBHOOK ${requestId}] Request Details:`, {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path,
      ip: req.ip,
      ips: req.ips,
    });
    
    // Log ALL headers (sanitized)
    this.logger.debug(`📋 [WEBHOOK ${requestId}] All Headers:`, {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'user-agent': req.headers['user-agent'],
      'host': req.headers['host'],
      'origin': req.headers['origin'],
      'referer': req.headers['referer'],
      'accept': req.headers['accept'],
      'accept-encoding': req.headers['accept-encoding'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-real-ip': req.headers['x-real-ip'],
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'] ? `present (length: ${String(req.headers['svix-signature']).length})` : '❌ MISSING',
      allHeaderKeys: Object.keys(req.headers),
    });
    
    // Log body details
    this.logger.debug(`📦 [WEBHOOK ${requestId}] Body Details:`, {
      bodyExists: !!req.body,
      bodyType: typeof req.body,
      bodyIsString: typeof req.body === 'string',
      bodyIsObject: typeof req.body === 'object',
      bodyLength: req.body ? (typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length) : 0,
      bodyConstructor: req.body?.constructor?.name,
      bodyPreview: req.body ? String(req.body).substring(0, 500) + '...' : '❌ EMPTY/NULL',
    });

    // Check webhook secret configuration
    this.logger.debug(`🔑 [WEBHOOK ${requestId}] Checking webhook secret configuration...`);
    if (!this.webhookSecret) {
      this.logger.error(`❌ [WEBHOOK ${requestId}] CRITICAL: CLERK_WEBHOOK_SECRET is not configured!`);
      this.logger.error(`❌ [WEBHOOK ${requestId}] Environment variable CLERK_WEBHOOK_SECRET must be set`);
      return res.status(500).send('Webhook secret not configured');
    }
    this.logger.debug(`✅ [WEBHOOK ${requestId}] Webhook secret is configured (length: ${this.webhookSecret.length})`);

    // Get Svix headers
    this.logger.debug(`🔍 [WEBHOOK ${requestId}] Extracting Svix headers...`);
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    this.logger.debug(`📝 [WEBHOOK ${requestId}] Svix Headers Extracted:`, {
      svixId: svixId || '❌ MISSING',
      svixIdLength: svixId?.length || 0,
      svixTimestamp: svixTimestamp || '❌ MISSING',
      svixTimestampParsed: svixTimestamp ? new Date(parseInt(svixTimestamp) * 1000).toISOString() : 'N/A',
      svixSignature: svixSignature ? `present (${svixSignature.substring(0, 20)}...)` : '❌ MISSING',
      svixSignatureLength: svixSignature?.length || 0,
    });

    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.error(`❌ [WEBHOOK ${requestId}] VALIDATION FAILED: Missing required Svix headers!`);
      this.logger.error(`❌ [WEBHOOK ${requestId}] Missing headers:`, {
        svixId: !svixId ? '❌ MISSING' : '✅ present',
        svixTimestamp: !svixTimestamp ? '❌ MISSING' : '✅ present',
        svixSignature: !svixSignature ? '❌ MISSING' : '✅ present',
        hint: 'Make sure Clerk webhook is configured correctly and sending all required headers',
      });
      return res.status(400).send('Missing Svix headers');
    }
    this.logger.debug(`✅ [WEBHOOK ${requestId}] All required Svix headers are present`);

    // Check idempotency
    this.logger.debug(`🔄 [WEBHOOK ${requestId}] Checking for duplicate event...`);
    if (processedEvents.has(svixId)) {
      this.logger.warn(`⏭️ [WEBHOOK ${requestId}] DUPLICATE EVENT DETECTED: ${svixId}`);
      this.logger.warn(`⏭️ [WEBHOOK ${requestId}] This event was already processed. Returning 204 (no-op)`);
      this.logger.debug(`⏭️ [WEBHOOK ${requestId}] Total processed events in memory: ${processedEvents.size}`);
      return res.status(204).end();
    }
    this.logger.debug(`✅ [WEBHOOK ${requestId}] Event is new, proceeding with verification`);

    // Verify webhook signature
    let event: ClerkWebhookEvent;
    try {
      this.logger.debug(`🔐 [WEBHOOK ${requestId}] Starting signature verification...`);
      this.logger.debug(`🔐 [WEBHOOK ${requestId}] Verification inputs:`, {
        secretConfigured: !!this.webhookSecret,
        secretLength: this.webhookSecret.length,
        secretPrefix: this.webhookSecret.substring(0, 12) + '...',
        secretSuffix: '...' + this.webhookSecret.substring(this.webhookSecret.length - 4),
        bodyExists: !!req.body,
        bodyType: typeof req.body,
        bodyLength: req.body ? (typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length) : 0,
        headersForVerification: {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature.substring(0, 30) + '...',
        },
      });

      const webhook = new Webhook(this.webhookSecret);
      this.logger.debug(`🔐 [WEBHOOK ${requestId}] Webhook verifier instantiated, calling verify()...`);
      
      event = webhook.verify(req.body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;

      this.logger.debug(`✅ [WEBHOOK ${requestId}] ✨ SIGNATURE VERIFICATION SUCCESSFUL! ✨`);
      this.logger.debug(`✅ [WEBHOOK ${requestId}] Verified event details:`, {
        eventType: event.type,
        eventDataKeys: event.data ? Object.keys(event.data) : [],
        eventDataId: event.data?.id,
        eventDataEmail: event.data?.email_addresses?.[0]?.email_address,
        eventDataFirstName: event.data?.first_name,
        eventDataLastName: event.data?.last_name,
        fullEventData: JSON.stringify(event, null, 2),
      });
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK ${requestId}] ⚠️ SIGNATURE VERIFICATION FAILED! ⚠️`);
      this.logger.error(`❌ [WEBHOOK ${requestId}] Error details:`, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        errorName: error.name,
        stack: error.stack,
      });
      this.logger.error(`❌ [WEBHOOK ${requestId}] Request details for failed verification:`, {
        bodyPreview: req.body ? String(req.body).substring(0, 200) : 'empty',
        bodyFullLength: req.body ? String(req.body).length : 0,
        svixId,
        svixTimestamp,
        signaturePrefix: svixSignature?.substring(0, 30),
      });
      this.logger.error(`❌ [WEBHOOK ${requestId}] Possible causes:`);
      this.logger.error(`   1. Webhook secret mismatch (verify CLERK_WEBHOOK_SECRET matches Clerk dashboard)`);
      this.logger.error(`   2. Body parsing issue (check Express body-parser middleware)`);
      this.logger.error(`   3. Request modification by proxy/middleware`);
      this.logger.error(`   4. Timestamp too old/new (check server time sync)`);
      return res.status(400).send('Invalid signature');
    }

    // Process event
    try {
      this.logger.debug(`🔄 [WEBHOOK ${requestId}] Starting event processing...`);
      this.logger.debug(`🔄 [WEBHOOK ${requestId}] Event summary:`, {
        type: event.type,
        userId: event.data?.id,
        email: event.data?.email_addresses?.[0]?.email_address,
        firstName: event.data?.first_name,
        lastName: event.data?.last_name,
        createdAt: event.data?.created_at,
        updatedAt: event.data?.updated_at,
        publicMetadata: event.data?.public_metadata,
        privateMetadata: event.data?.private_metadata,
        unsafeMetadata: event.data?.unsafe_metadata,
      });

      const processStartTime = Date.now();
      await this.processEvent(event);
      const processDuration = Date.now() - processStartTime;
      
      processedEvents.add(svixId);
      this.logger.debug(`✅ [WEBHOOK ${requestId}] Event added to processed events cache`);
      
      // Clean up old events (keep last 10000)
      if (processedEvents.size > 10000) {
        const firstKey = processedEvents.values().next().value;
        processedEvents.delete(firstKey);
        this.logger.debug(`🧹 [WEBHOOK ${requestId}] Cleaned up old event from cache`);
      }
      
      const totalDuration = Date.now() - startTime;
      this.logger.debug(`✅ [WEBHOOK ${requestId}] ✨ EVENT PROCESSED SUCCESSFULLY! ✨`);
      this.logger.debug(`⏱️ [WEBHOOK ${requestId}] Performance:`, {
        processingTime: `${processDuration}ms`,
        totalTime: `${totalDuration}ms`,
        overheadTime: `${totalDuration - processDuration}ms`,
      });
      this.logger.debug(`${'='.repeat(80)}\n`);
      
      return res.status(204).end();
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(`❌ [WEBHOOK ${requestId}] ⚠️ FAILED TO PROCESS WEBHOOK EVENT! ⚠️`);
      this.logger.error(`❌ [WEBHOOK ${requestId}] Error details:`, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        errorName: error.name,
        errorCode: error.code,
        stack: error.stack,
      });
      this.logger.error(`❌ [WEBHOOK ${requestId}] Event that failed:`, {
        eventType: event?.type,
        eventData: event?.data,
      });
      this.logger.error(`❌ [WEBHOOK ${requestId}] Total time before failure: ${totalDuration}ms`);
      this.logger.error(`${'='.repeat(80)}\n`);
      return res.status(500).send('Webhook processing failed');
    }
  }

  private async processEvent(event: ClerkWebhookEvent) {
    const { type, data } = event;
    
    this.logger.debug(`🎯 [processEvent] Routing event type: ${type}`);
    this.logger.debug(`🎯 [processEvent] Event data summary:`, {
      dataExists: !!data,
      dataKeys: data ? Object.keys(data) : [],
      userId: data?.id,
    });
    
    switch (type) {
      case 'user.created':
        this.logger.debug(`🆕 [processEvent] Routing to handleUserCreated()`);
        await this.handleUserCreated(data);
        break;
      case 'user.updated':
        this.logger.debug(`🔄 [processEvent] Routing to handleUserUpdated()`);
        await this.handleUserUpdated(data);
        break;
      case 'user.deleted':
        this.logger.debug(`🗑️ [processEvent] Routing to handleUserDeleted()`);
        await this.handleUserDeleted(data);
        break;
      default:
        this.logger.warn(`⚠️ [processEvent] Unhandled event type: ${type}`);
        this.logger.debug(`⚠️ [processEvent] If this event type should be handled, add a case for it`);
    }
    
    this.logger.debug(`✅ [processEvent] Event routing completed for type: ${type}`);
  }

  private async handleUserCreated(data: any) {
    const clerkId: string = data.id;
    
    this.logger.debug(`👤 [handleUserCreated] Starting user creation for clerkId: ${clerkId}`);
    this.logger.debug(`👤 [handleUserCreated] Full user data:`, JSON.stringify(data, null, 2));
    
    // Check for intended role in private metadata (from invitation flow)
    // or unsafe metadata (from signup flow)
    const intendedRole = 
      data.private_metadata?.intendedRole || 
      data.unsafe_metadata?.role ||
      data.unsafe_metadata?.pendingRole ||  // Also check pendingRole from signup
      data.unsafe_metadata?.signupType ||   // Also check signupType from signup
      'PARENT';
    
    this.logger.debug(`👤 [handleUserCreated] Role resolution:`, {
      privateMetadataRole: data.private_metadata?.intendedRole,
      unsafeMetadataRole: data.unsafe_metadata?.role,
      unsafeMetadataPendingRole: data.unsafe_metadata?.pendingRole,
      unsafeMetadataSignupType: data.unsafe_metadata?.signupType,
      resolvedIntendedRole: intendedRole,
    });
    
    // Validate role
    const validRole = this.isValidRole(intendedRole) ? intendedRole : 'PARENT';
    this.logger.debug(`👤 [handleUserCreated] Role validation:`, {
      intendedRole,
      isValid: this.isValidRole(intendedRole),
      finalRole: validRole,
      validRoles: Object.values(UserRole),
    });
    
    // Create user in our database
    const primaryEmail = data.email_addresses?.[0]?.email_address || `${clerkId}@missing-email.local`;
    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || 'User';

    this.logger.debug(`👤 [handleUserCreated] User details extracted:`, {
      clerkId,
      primaryEmail,
      firstName,
      lastName,
      role: validRole,
      emailAddresses: data.email_addresses,
    });

    this.logger.debug(`💾 [handleUserCreated] Upserting AppUser in database...`);
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
    this.logger.debug(`✅ [handleUserCreated] AppUser upserted:`, {
      appUserId: appUser.id,
      appUserRole: appUser.role,
    });

    this.logger.debug(`💾 [handleUserCreated] Upserting User in database...`);
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
    this.logger.debug(`✅ [handleUserCreated] User upserted successfully`);
    
    // Sync role to Clerk public metadata
    this.logger.debug(`🔄 [handleUserCreated] Fetching user from Clerk API to sync metadata...`);
    const clerkUser = await this.clerk.users.getUser(clerkId);
    this.logger.debug(`✅ [handleUserCreated] Fetched user from Clerk:`, {
      clerkId: clerkUser.id,
      publicMetadata: clerkUser.publicMetadata,
      unsafeMetadata: clerkUser.unsafeMetadata,
    });
    const currentPublicRole = (clerkUser.publicMetadata as any)?.role;
    
    this.logger.debug(`🔍 [handleUserCreated] Comparing roles:`, {
      currentPublicRole,
      appUserRole: appUser.role,
      needsUpdate: currentPublicRole !== appUser.role,
    });
    
    if (currentPublicRole !== appUser.role) {
      this.logger.debug(`🔄 [handleUserCreated] Updating Clerk user metadata...`);
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
      this.logger.debug(`✅ [handleUserCreated] Clerk metadata updated successfully`);
    } else {
      this.logger.debug(`⏭️ [handleUserCreated] No metadata update needed, roles already match`);
    }
    
    this.logger.log(`✅ [handleUserCreated] User creation complete: ${clerkId} with role ${appUser.role}`);
  }

  private async handleUserUpdated(data: any) {
    const clerkId: string = data.id;
    
    this.logger.debug(`🔄 [handleUserUpdated] Starting user update for clerkId: ${clerkId}`);
    this.logger.debug(`🔄 [handleUserUpdated] Full update data:`, JSON.stringify(data, null, 2));
    const unsafeRole = data.unsafe_metadata?.role;
    const publicRole = data.public_metadata?.role;
    const primaryEmail = data.email_addresses?.[0]?.email_address || `${clerkId}@missing-email.local`;
    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || 'User';

    this.logger.debug(`🔄 [handleUserUpdated] Extracted update details:`, {
      clerkId,
      unsafeRole,
      publicRole,
      primaryEmail,
      firstName,
      lastName,
    });

    // Get user from our database (source of truth)
    this.logger.debug(`🔍 [handleUserUpdated] Fetching AppUser from database...`);
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      this.logger.warn(`⚠️ [handleUserUpdated] AppUser not found in database, creating new user instead`);
      await this.handleUserCreated(data);
      return;
    }
    
    this.logger.debug(`✅ [handleUserUpdated] AppUser found:`, {
      appUserId: appUser.id,
      appUserRole: appUser.role,
      appUserEmail: appUser.email,
    });

    this.logger.debug(`💾 [handleUserUpdated] Updating AppUser email...`);
    await this.prisma.appUser.update({
      where: { id: appUser.id },
      data: { email: primaryEmail },
    });
    this.logger.debug(`✅ [handleUserUpdated] AppUser updated`);

    this.logger.debug(`💾 [handleUserUpdated] Updating User record...`);
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
    this.logger.debug(`✅ [handleUserUpdated] User record updated`);

    // If someone changed Clerk metadata outside our system, revert to DB truth
    this.logger.debug(`🔍 [handleUserUpdated] Checking for unauthorized role changes...`);
    if (publicRole && publicRole !== appUser.role) {
      this.logger.warn(`⚠️ [handleUserUpdated] Detected unauthorized role change!`, {
        clerkPublicRole: publicRole,
        dbRole: appUser.role,
        action: 'reverting to database role',
      });
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
      this.logger.debug(`✅ [handleUserUpdated] Reverted unauthorized role change`);
    } else {
      this.logger.debug(`✅ [handleUserUpdated] No unauthorized role changes detected`);
    }

    // Always scrub unsafe metadata role
    this.logger.debug(`🧹 [handleUserUpdated] Checking unsafe metadata...`);
    if (typeof unsafeRole !== 'undefined') {
      this.logger.debug(`🧹 [handleUserUpdated] Scrubbing unsafe metadata role...`);
      await this.clerk.users.updateUser(clerkId, {
        unsafeMetadata: {
          ...(data.unsafe_metadata ?? {}),
          role: undefined
        },
      });
      this.logger.debug(`✅ [handleUserUpdated] Unsafe metadata scrubbed`);
    } else {
      this.logger.debug(`⏭️ [handleUserUpdated] No unsafe metadata to scrub`);
    }
    
    this.logger.log(`✅ [handleUserUpdated] User update complete: ${clerkId}`);
  }

  private async handleUserDeleted(data: any) {
    const clerkId: string = data.id;
    
    this.logger.debug(`🗑️ [handleUserDeleted] Starting user deletion for clerkId: ${clerkId}`);
    this.logger.debug(`🗑️ [handleUserDeleted] Deletion data:`, JSON.stringify(data, null, 2));
    
    // Soft delete or hard delete based on your requirements
    // For now, we'll keep the user but mark as deleted
    this.logger.debug(`🔍 [handleUserDeleted] Fetching AppUser from database...`);
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });
    
    if (appUser) {
      this.logger.debug(`✅ [handleUserDeleted] AppUser found:`, {
        appUserId: appUser.id,
        appUserRole: appUser.role,
      });
      
      // Add a deletion record to history
      this.logger.debug(`💾 [handleUserDeleted] Creating deletion history record...`);
      await this.prisma.appUserRoleHistory.create({
        data: {
          userId: appUser.id,
          previousRole: appUser.role,
          newRole: appUser.role, // Same role, just marking deletion
          changedBy: 'system/webhook',
          reason: 'User deleted from Clerk',
        },
      });
      this.logger.debug(`✅ [handleUserDeleted] Deletion history record created`);
    } else {
      this.logger.warn(`⚠️ [handleUserDeleted] AppUser not found in database for clerkId: ${clerkId}`);
    }
    
    this.logger.log(`✅ [handleUserDeleted] User deletion complete: ${clerkId}`);
  }

  private isValidRole(role: any): boolean {
    return Object.values(UserRole).includes(role);
  }
}