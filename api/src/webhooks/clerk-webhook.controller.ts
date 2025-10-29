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
    
    console.log('🏥 [E2E DEBUG] HEALTH CHECK REQUESTED', {
      hasWebhookSecret,
      hasClerkClient,
      timestamp: new Date().toISOString(),
      webhookSecretLength: this.webhookSecret?.length || 0,
      webhookSecretPrefix: this.webhookSecret ? this.webhookSecret.substring(0, 12) + '...' : 'MISSING',
      environmentCheck: {
        hasEnvVar: !!process.env.CLERK_WEBHOOK_SECRET,
        envVarLength: process.env.CLERK_WEBHOOK_SECRET?.length || 0,
        envVarPrefix: process.env.CLERK_WEBHOOK_SECRET ? process.env.CLERK_WEBHOOK_SECRET.substring(0, 12) + '...' : 'MISSING',
      }
    });
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      webhookConfigured: hasWebhookSecret,
      clerkClientConfigured: hasClerkClient,
      webhookSecretLength: this.webhookSecret?.length || 0,
      webhookSecretPrefix: this.webhookSecret ? this.webhookSecret.substring(0, 12) + '...' : 'MISSING',
      environmentCheck: {
        hasEnvVar: !!process.env.CLERK_WEBHOOK_SECRET,
        envVarLength: process.env.CLERK_WEBHOOK_SECRET?.length || 0,
        envVarPrefix: process.env.CLERK_WEBHOOK_SECRET ? process.env.CLERK_WEBHOOK_SECRET.substring(0, 12) + '...' : 'MISSING',
      },
      message: hasWebhookSecret && hasClerkClient 
        ? 'Webhook is properly configured' 
        : 'Webhook configuration issues detected',
    };
  }

  @Get('test')
  @Public()
  testWebhook() {
    console.log('🧪 [E2E DEBUG] WEBHOOK TEST ENDPOINT CALLED');
    return {
      message: 'Webhook test endpoint is working',
      timestamp: new Date().toISOString(),
      instructions: 'Use this endpoint to test webhook connectivity',
      webhookUrl: '/api/webhooks/clerk',
      healthUrl: '/api/webhooks/clerk/health',
    };
  }

  @Get('debug')
  @Public()
  debugEndpoint() {
    console.log(`\n${'='.repeat(100)}\n🐛 [DEBUG ENDPOINT] WEBHOOK DEBUG ENDPOINT CALLED\n${'='.repeat(100)}`);
    console.log(`🐛 [DEBUG ENDPOINT] Debug endpoint accessed at: ${new Date().toISOString()}`);
    console.log(`🐛 [DEBUG ENDPOINT] This should appear in Render logs!\n${'='.repeat(100)}\n`);
    
    return {
      status: 'success',
      message: 'Debug endpoint is working - check Render logs for console output',
      timestamp: new Date().toISOString(),
      webhookConfigured: !!this.webhookSecret,
      clerkClientConfigured: !!this.clerk,
    };
  }

  @Post()
  @Public()
  @HttpCode(204)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    // IMMEDIATE LOG - This should appear first in logs
    console.log(`\n🚨🚨🚨 WEBHOOK POST ENDPOINT CALLED - ${new Date().toISOString()} 🚨🚨🚨\n`);
    this.logger.log(`🚨🚨🚨 WEBHOOK POST ENDPOINT CALLED - ${new Date().toISOString()} 🚨🚨🚨`, 'ClerkWebhookController');
    
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    // E2E DEBUG: Comprehensive logging for webhook delivery issues
    console.log(`
${'='.repeat(100)}
🚨 [E2E DEBUG ${requestId}] WEBHOOK REQUEST RECEIVED - COMPREHENSIVE DEBUGGING
${'='.repeat(100)}`);
    
    // E2E DEBUG: Log ALL request details
    console.log(`🔍 [E2E DEBUG ${requestId}] REQUEST ANALYSIS:`, {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path,
      ip: req.ip,
      ips: req.ips,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      origin: req.headers['origin'],
    });
    
    // E2E DEBUG: Log ALL headers with detailed analysis
    console.log(`📋 [E2E DEBUG ${requestId}] HEADERS ANALYSIS:`, {
      totalHeaders: Object.keys(req.headers).length,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      svixHeaders: {
        'svix-id': req.headers['svix-id'] || '❌ MISSING',
        'svix-timestamp': req.headers['svix-timestamp'] || '❌ MISSING',
        'svix-signature': req.headers['svix-signature'] ? `present (${String(req.headers['svix-signature']).length} chars)` : '❌ MISSING',
      },
      allHeaders: Object.keys(req.headers).reduce((acc, key) => {
        acc[key] = req.headers[key];
        return acc;
      }, {}),
    });
    
    // E2E DEBUG: Log body details with comprehensive analysis
    console.log(`📦 [E2E DEBUG ${requestId}] BODY ANALYSIS:`, {
      bodyExists: !!req.body,
      bodyType: typeof req.body,
      bodyConstructor: req.body?.constructor?.name,
      bodyLength: req.body ? (typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length) : 0,
      bodyIsBuffer: Buffer.isBuffer(req.body),
      bodyIsString: typeof req.body === 'string',
      bodyPreview: req.body ? String(req.body).substring(0, 1000) : '❌ EMPTY/NULL',
      bodyFullLength: req.body ? String(req.body).length : 0,
    });

    // E2E DEBUG: Webhook secret configuration analysis (sanitized)
    console.log(`🔑 [E2E DEBUG ${requestId}] WEBHOOK SECRET ANALYSIS:`, {
      secretConfigured: !!this.webhookSecret,
      secretLength: this.webhookSecret?.length || 0,
      secretPrefix: this.webhookSecret ? this.webhookSecret.substring(0, 12) + '...' : '❌ MISSING',
      secretSuffix: this.webhookSecret ? '...' + this.webhookSecret.substring(this.webhookSecret.length - 4) : 'N/A',
      secretStartsWithWhsec: this.webhookSecret?.startsWith('whsec_') || false,
      environmentCheck: {
        hasEnvVar: !!process.env.CLERK_WEBHOOK_SECRET,
        envVarLength: process.env.CLERK_WEBHOOK_SECRET?.length || 0,
        envVarPrefix: process.env.CLERK_WEBHOOK_SECRET ? process.env.CLERK_WEBHOOK_SECRET.substring(0, 12) + '...' : '❌ MISSING',
      }
    });

    if (!this.webhookSecret) {
      console.error(`❌ [E2E DEBUG ${requestId}] CRITICAL: CLERK_WEBHOOK_SECRET is not configured!`);
      console.error(`❌ [E2E DEBUG ${requestId}] Environment variable CLERK_WEBHOOK_SECRET must be set`);
      return res.status(500).send('Webhook secret not configured');
    }

    // E2E DEBUG: Svix headers extraction and analysis
    console.log(`🔍 [E2E DEBUG ${requestId}] SVIX HEADERS ANALYSIS:`, {
      svixId: {
        present: !!req.headers['svix-id'],
        value: req.headers['svix-id'] || '❌ MISSING',
        length: req.headers['svix-id']?.length || 0,
      },
      svixTimestamp: {
        present: !!req.headers['svix-timestamp'],
        value: req.headers['svix-timestamp'] || '❌ MISSING',
        parsed: req.headers['svix-timestamp'] ? new Date(parseInt(String(req.headers['svix-timestamp'])) * 1000).toISOString() : 'N/A',
        age: req.headers['svix-timestamp'] ? Date.now() - (parseInt(String(req.headers['svix-timestamp'])) * 1000) : 'N/A',
      },
      svixSignature: {
        present: !!req.headers['svix-signature'],
        value: req.headers['svix-signature'] ? `${String(req.headers['svix-signature']).substring(0, 30)}...` : '❌ MISSING',
        length: String(req.headers['svix-signature'] || '').length,
        format: String(req.headers['svix-signature'] || '').includes('v1,') ? 'v1 format' : 'unknown format',
      }
    });

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    // E2E DEBUG: Missing headers check
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error(`❌ [E2E DEBUG ${requestId}] MISSING SVIX HEADERS:`, {
        svixId: !svixId ? '❌ MISSING' : '✅ present',
        svixTimestamp: !svixTimestamp ? '❌ MISSING' : '✅ present',
        svixSignature: !svixSignature ? '❌ MISSING' : '✅ present',
        allHeaders: Object.keys(req.headers),
        hint: 'Clerk webhook must send svix-id, svix-timestamp, and svix-signature headers'
      });
      return res.status(400).send('Missing Svix headers');
    }

    // E2E DEBUG: Idempotency check
    console.log(`🔄 [E2E DEBUG ${requestId}] IDEMPOTENCY CHECK:`, {
      svixId,
      alreadyProcessed: processedEvents.has(svixId),
      totalProcessedEvents: processedEvents.size,
      processedEventsList: Array.from(processedEvents).slice(-5), // Last 5 events
    });

    if (processedEvents.has(svixId)) {
      console.warn(`⏭️ [E2E DEBUG ${requestId}] DUPLICATE EVENT DETECTED: ${svixId}`);
      return res.status(204).end();
    }

    // E2E DEBUG: Signature verification with comprehensive analysis (sanitized)
    console.log(`🔐 [E2E DEBUG ${requestId}] SIGNATURE VERIFICATION ANALYSIS:`, {
      verificationInputs: {
        secretConfigured: !!this.webhookSecret,
        secretLength: this.webhookSecret.length,
        secretPrefix: this.webhookSecret.substring(0, 12) + '...',
        secretSuffix: '...' + this.webhookSecret.substring(this.webhookSecret.length - 4),
        bodyExists: !!req.body,
        bodyType: typeof req.body,
        bodyLength: req.body ? (typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length) : 0,
        bodyIsBuffer: Buffer.isBuffer(req.body),
        bodyIsString: typeof req.body === 'string',
        svixHeaders: {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature.substring(0, 50) + '...',
        },
      },
      timestampAnalysis: {
        timestamp: svixTimestamp,
        parsed: new Date(parseInt(svixTimestamp) * 1000).toISOString(),
        age: Date.now() - (parseInt(svixTimestamp) * 1000),
        isRecent: (Date.now() - (parseInt(svixTimestamp) * 1000)) < 300000, // 5 minutes
      }
    });

    let event: ClerkWebhookEvent;
    try {
      console.log(`🔐 [E2E DEBUG ${requestId}] Starting signature verification...`);
      
      const webhook = new Webhook(this.webhookSecret);
      console.log(`🔐 [E2E DEBUG ${requestId}] Webhook verifier instantiated`);
      
      event = webhook.verify(req.body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;

      console.log(`✅ [E2E DEBUG ${requestId}] ✨ SIGNATURE VERIFICATION SUCCESSFUL! ✨`);
      console.log(`✅ [E2E DEBUG ${requestId}] VERIFIED EVENT DETAILS:`, {
        eventType: event.type,
        eventDataKeys: event.data ? Object.keys(event.data) : [],
        eventDataId: event.data?.id,
        eventDataEmail: event.data?.email_addresses?.[0]?.email_address,
        eventDataFirstName: event.data?.first_name,
        eventDataLastName: event.data?.last_name,
        eventDataEmailAddresses: event.data?.email_addresses,
        eventDataPublicMetadata: event.data?.public_metadata,
        eventDataPrivateMetadata: event.data?.private_metadata,
        eventDataUnsafeMetadata: event.data?.unsafe_metadata,
        fullEventData: JSON.stringify(event, null, 2),
      });
    } catch (error) {
      console.error(`❌ [E2E DEBUG ${requestId}] ⚠️ SIGNATURE VERIFICATION FAILED! ⚠️`);
      console.error(`❌ [E2E DEBUG ${requestId}] ERROR ANALYSIS:`, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        errorName: error.name,
        errorCode: error.code,
        stack: error.stack,
      });
      console.error(`❌ [E2E DEBUG ${requestId}] REQUEST ANALYSIS FOR FAILED VERIFICATION:`, {
        bodyPreview: req.body ? String(req.body).substring(0, 500) : 'empty',
        bodyFullLength: req.body ? String(req.body).length : 0,
        bodyType: typeof req.body,
        bodyIsBuffer: Buffer.isBuffer(req.body),
        svixId,
        svixTimestamp,
        svixSignature: svixSignature?.substring(0, 50) + '...',
        secretPrefix: this.webhookSecret.substring(0, 12) + '...',
        secretLength: this.webhookSecret.length,
      });
      console.error(`❌ [E2E DEBUG ${requestId}] POSSIBLE CAUSES:`);
      console.error(`   1. Webhook secret mismatch (verify CLERK_WEBHOOK_SECRET matches Clerk dashboard)`);
      console.error(`   2. Body parsing issue (check Express body-parser middleware)`);
      console.error(`   3. Request modification by proxy/middleware`);
      console.error(`   4. Timestamp too old/new (check server time sync)`);
      console.error(`   5. Signature format issue (should start with 'v1,')`);
      return res.status(400).send('Invalid signature');
    }

    // E2E DEBUG: Event processing with comprehensive analysis
    try {
      console.log(`🔄 [E2E DEBUG ${requestId}] STARTING EVENT PROCESSING...`);
      console.log(`🔄 [E2E DEBUG ${requestId}] EVENT SUMMARY:`, {
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
        emailAddresses: event.data?.email_addresses,
        phoneNumbers: event.data?.phone_numbers,
        externalAccounts: event.data?.external_accounts,
        hasImage: event.data?.has_image,
        imageUrl: event.data?.image_url,
        profileImageUrl: event.data?.profile_image_url,
        username: event.data?.username,
        primaryEmailAddressId: event.data?.primary_email_address_id,
        primaryPhoneNumberId: event.data?.primary_phone_number_id,
        primaryWeb3WalletId: event.data?.primary_web3_wallet_id,
        backupCodeEnabled: event.data?.backup_code_enabled,
        mfaEnabled: event.data?.mfa_enabled_at,
        totpEnabled: event.data?.totp_enabled,
        twoFactorEnabled: event.data?.two_factor_enabled,
        passwordEnabled: event.data?.password_enabled,
        samlAccounts: event.data?.saml_accounts,
        web3Wallets: event.data?.web3_wallets,
        passkeys: event.data?.passkeys,
        enterpriseAccounts: event.data?.enterprise_accounts,
        createOrganizationEnabled: event.data?.create_organization_enabled,
        createOrganizationsLimit: event.data?.create_organizations_limit,
        deleteSelfEnabled: event.data?.delete_self_enabled,
        lastActiveAt: event.data?.last_active_at,
        lastSignInAt: event.data?.last_sign_in_at,
        legalAcceptedAt: event.data?.legal_accepted_at,
        locked: event.data?.locked,
        lockoutExpiresInSeconds: event.data?.lockout_expires_in_seconds,
        mfaDisabledAt: event.data?.mfa_disabled_at,
        verificationAttemptsRemaining: event.data?.verification_attempts_remaining,
        banned: event.data?.banned,
        externalId: event.data?.external_id,
        object: event.data?.object,
        fullEventData: JSON.stringify(event, null, 2),
      });

      const processStartTime = Date.now();
      console.log(`🔄 [E2E DEBUG ${requestId}] Calling processEvent()...`);
      await this.processEvent(event);
      const processDuration = Date.now() - processStartTime;
      
      processedEvents.add(svixId);
      console.log(`✅ [E2E DEBUG ${requestId}] Event added to processed events cache`);
      
      // Clean up old events (keep last 10000)
      if (processedEvents.size > 10000) {
        const firstKey = processedEvents.values().next().value;
        processedEvents.delete(firstKey);
        console.log(`🧹 [E2E DEBUG ${requestId}] Cleaned up old event from cache`);
      }
      
      const totalDuration = Date.now() - startTime;
      console.log(`✅ [E2E DEBUG ${requestId}] ✨ EVENT PROCESSED SUCCESSFULLY! ✨`);
      console.log(`⏱️ [E2E DEBUG ${requestId}] PERFORMANCE METRICS:`, {
        processingTime: `${processDuration}ms`,
        totalTime: `${totalDuration}ms`,
        overheadTime: `${totalDuration - processDuration}ms`,
        eventsInCache: processedEvents.size,
      });
      console.log(`${'='.repeat(100)}\n`);
      
      return res.status(204).end();
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`❌ [E2E DEBUG ${requestId}] ⚠️ FAILED TO PROCESS WEBHOOK EVENT! ⚠️`);
      console.error(`❌ [E2E DEBUG ${requestId}] ERROR ANALYSIS:`, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        errorName: error.name,
        errorCode: error.code,
        stack: error.stack,
      });
      console.error(`❌ [E2E DEBUG ${requestId}] EVENT THAT FAILED:`, {
        eventType: event?.type,
        eventData: event?.data,
        eventDataKeys: event?.data ? Object.keys(event.data) : [],
      });
      console.error(`❌ [E2E DEBUG ${requestId}] TIMING ANALYSIS:`, {
        totalTimeBeforeFailure: `${totalDuration}ms`,
        startTime: new Date(startTime).toISOString(),
        failureTime: new Date().toISOString(),
      });
      console.error(`${'='.repeat(100)}\n`);
      return res.status(500).send('Webhook processing failed');
    }
  }

  private async processEvent(event: ClerkWebhookEvent) {
    const { type, data } = event;
    
    console.log(`🎯 [E2E DEBUG] PROCESSING EVENT:`, {
      eventType: type,
      dataExists: !!data,
      dataKeys: data ? Object.keys(data) : [],
      userId: data?.id,
      email: data?.email_addresses?.[0]?.email_address,
      firstName: data?.first_name,
      lastName: data?.last_name,
    });
    
    switch (type) {
      case 'user.created':
        console.log(`🆕 [E2E DEBUG] ROUTING TO handleUserCreated()`);
        await this.handleUserCreated(data);
        break;
      case 'user.updated':
        console.log(`🔄 [E2E DEBUG] ROUTING TO handleUserUpdated()`);
        await this.handleUserUpdated(data);
        break;
      case 'user.deleted':
        console.log(`🗑️ [E2E DEBUG] ROUTING TO handleUserDeleted()`);
        await this.handleUserDeleted(data);
        break;
      default:
        console.warn(`⚠️ [E2E DEBUG] UNHANDLED EVENT TYPE: ${type}`);
        console.warn(`⚠️ [E2E DEBUG] If this event type should be handled, add a case for it`);
    }
    
    console.log(`✅ [E2E DEBUG] EVENT ROUTING COMPLETED FOR TYPE: ${type}`);
  }

  private async handleUserCreated(data: any) {
    const clerkId: string = data.id;
    
    console.log(`👤 [E2E DEBUG] STARTING USER CREATION FOR clerkId: ${clerkId}`);
    console.log(`👤 [E2E DEBUG] FULL USER DATA:`, JSON.stringify(data, null, 2));
    
    // E2E DEBUG: Role resolution analysis
    const intendedRole = 
      data.private_metadata?.intendedRole || 
      data.unsafe_metadata?.role ||
      data.unsafe_metadata?.pendingRole ||  // Also check pendingRole from signup
      data.unsafe_metadata?.signupType ||   // Also check signupType from signup
      'PARENT';
    
    console.log(`👤 [E2E DEBUG] ROLE RESOLUTION ANALYSIS:`, {
      privateMetadata: data.private_metadata,
      unsafeMetadata: data.unsafe_metadata,
      publicMetadata: data.public_metadata,
      roleResolution: {
        privateMetadataRole: data.private_metadata?.intendedRole,
        unsafeMetadataRole: data.unsafe_metadata?.role,
        unsafeMetadataPendingRole: data.unsafe_metadata?.pendingRole,
        unsafeMetadataSignupType: data.unsafe_metadata?.signupType,
        resolvedIntendedRole: intendedRole,
      },
      allMetadataKeys: {
        private: data.private_metadata ? Object.keys(data.private_metadata) : [],
        unsafe: data.unsafe_metadata ? Object.keys(data.unsafe_metadata) : [],
        public: data.public_metadata ? Object.keys(data.public_metadata) : [],
      }
    });
    
    // E2E DEBUG: Role validation
    const validRole = this.isValidRole(intendedRole) ? intendedRole : 'PARENT';
    console.log(`👤 [E2E DEBUG] ROLE VALIDATION:`, {
      intendedRole,
      isValid: this.isValidRole(intendedRole),
      finalRole: validRole,
      validRoles: Object.values(UserRole),
      roleValidationDetails: {
        intendedRoleType: typeof intendedRole,
        intendedRoleValue: intendedRole,
        isValidRoleResult: this.isValidRole(intendedRole),
        fallbackRole: 'PARENT',
      }
    });
    
    // E2E DEBUG: User details extraction
    const primaryEmail = data.email_addresses?.[0]?.email_address || `${clerkId}@missing-email.local`;
    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || 'User';

    console.log(`👤 [E2E DEBUG] USER DETAILS EXTRACTED:`, {
      clerkId,
      primaryEmail,
      firstName,
      lastName,
      role: validRole,
      emailAddresses: data.email_addresses,
      emailAddressesLength: data.email_addresses?.length || 0,
      emailExtraction: {
        hasEmailAddresses: !!data.email_addresses,
        emailAddressesArray: data.email_addresses,
        firstEmailAddress: data.email_addresses?.[0],
        primaryEmailId: data.primary_email_address_id,
        fallbackEmail: `${clerkId}@missing-email.local`,
        finalEmail: primaryEmail,
      },
      nameExtraction: {
        firstName: data.first_name,
        lastName: data.last_name,
        finalFirstName: firstName,
        finalLastName: lastName,
      }
    });

    // E2E DEBUG: Database operations with comprehensive logging
    console.log(`💾 [E2E DEBUG] STARTING DATABASE OPERATIONS...`);
    
    let appUser: any;
    
    try {
      console.log(`💾 [E2E DEBUG] UPSERTING APPUSER IN DATABASE...`);
      appUser = await this.prisma.appUser.upsert({
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
      console.log(`✅ [E2E DEBUG] APPUSER UPSERTED SUCCESSFULLY:`, {
        appUserId: appUser.id,
        appUserRole: appUser.role,
        clerkId,
        email: primaryEmail,
        role: validRole,
      });
    } catch (error) {
      console.error(`❌ [E2E DEBUG] FAILED TO UPSERT APPUSER:`, {
        error: error.message,
        errorType: error.constructor.name,
        clerkId,
        email: primaryEmail,
        role: validRole,
        stack: error.stack,
      });
      throw error;
    }

    try {
      console.log(`💾 [E2E DEBUG] UPSERTING USER IN DATABASE...`);
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
      console.log(`✅ [E2E DEBUG] USER UPSERTED SUCCESSFULLY:`, {
        userId: appUser.id,
        clerkId,
        email: primaryEmail,
        firstName,
        lastName,
        role: validRole,
      });
    } catch (error) {
      console.error(`❌ [E2E DEBUG] FAILED TO UPSERT USER:`, {
        error: error.message,
        errorType: error.constructor.name,
        clerkId,
        email: primaryEmail,
        firstName,
        lastName,
        role: validRole,
        stack: error.stack,
      });
      throw error;
    }
    
    // E2E DEBUG: Clerk API sync with comprehensive logging
    try {
      console.log(`🔄 [E2E DEBUG] FETCHING USER FROM CLERK API TO SYNC METADATA...`);
      const clerkUser = await this.clerk.users.getUser(clerkId);
      console.log(`✅ [E2E DEBUG] FETCHED USER FROM CLERK:`, {
        clerkId: clerkUser.id,
        publicMetadata: clerkUser.publicMetadata,
        unsafeMetadata: clerkUser.unsafeMetadata,
        privateMetadata: clerkUser.privateMetadata,
        emailAddresses: clerkUser.emailAddresses,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        createdAt: clerkUser.createdAt,
        updatedAt: clerkUser.updatedAt,
      });
      
      const currentPublicRole = (clerkUser.publicMetadata as any)?.role;
      
      console.log(`🔍 [E2E DEBUG] ROLE COMPARISON:`, {
        currentPublicRole,
        appUserRole: appUser.role,
        needsUpdate: currentPublicRole !== appUser.role,
        roleComparison: {
          currentPublicRole,
          appUserRole: appUser.role,
          areEqual: currentPublicRole === appUser.role,
          currentPublicRoleType: typeof currentPublicRole,
          appUserRoleType: typeof appUser.role,
        }
      });
      
      if (currentPublicRole !== appUser.role) {
        console.log(`🔄 [E2E DEBUG] UPDATING CLERK USER METADATA...`);
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
        console.log(`✅ [E2E DEBUG] CLERK METADATA UPDATED SUCCESSFULLY:`, {
          clerkId,
          newPublicRole: appUser.role,
          previousPublicRole: currentPublicRole,
        });
      } else {
        console.log(`⏭️ [E2E DEBUG] NO METADATA UPDATE NEEDED, ROLES ALREADY MATCH:`, {
          clerkId,
          currentPublicRole,
          appUserRole: appUser.role,
        });
      }
    } catch (error) {
      console.error(`❌ [E2E DEBUG] FAILED TO SYNC WITH CLERK API:`, {
        error: error.message,
        errorType: error.constructor.name,
        clerkId,
        appUserRole: appUser.role,
        stack: error.stack,
      });
      // Don't throw here, user creation was successful
    }
    
    console.log(`✅ [E2E DEBUG] USER CREATION COMPLETE: ${clerkId} with role ${appUser.role}`);
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