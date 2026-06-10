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
import { UserRole, EducatorApprovalStatus } from '@prisma/client';
import { EmailNotificationService } from '../email-notification/email-notification.service';

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
  private webhookSecret: string = '';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailNotificationService: EmailNotificationService,
  ) {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

    // Disable the noisy startup-time "configuration check" logging and avoid crashing the
    // entire API when webhooks aren't configured. If secrets are missing, the webhook
    // endpoints will respond with an error, but the service will still start.
    if (!clerkSecretKey || !webhookSecret) {
      this.clerk = null;
      this.webhookSecret = '';
      this.logger.warn(
        '[WEBHOOK INIT] Clerk webhook is not configured (missing CLERK_SECRET_KEY and/or CLERK_WEBHOOK_SECRET). Webhook endpoints are disabled.',
      );
      return;
    }

    this.clerk = createClerkClient({ secretKey: clerkSecretKey });
    this.webhookSecret = webhookSecret;
    this.logger.log('[WEBHOOK INIT] Clerk webhook controller initialized');
  }

  @Post()
  @Public()
  @HttpCode(204)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    this.logger.log(`[WEBHOOK] Received event (requestId=${requestId})`);

    if (!this.webhookSecret) {
      this.logger.error('[WEBHOOK] CLERK_WEBHOOK_SECRET is not configured');
      return res.status(500).send('Webhook secret not configured');
    }

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.warn(`[WEBHOOK] Missing Svix headers (requestId=${requestId})`);
      return res.status(400).send('Missing Svix headers');
    }

    if (processedEvents.has(svixId)) {
      return res.status(204).end();
    }

    let event: ClerkWebhookEvent;
    try {
      const webhook = new Webhook(this.webhookSecret);
      event = webhook.verify(req.body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (error) {
      this.logger.warn(`[WEBHOOK] Signature verification failed (requestId=${requestId}): ${error.message}`);
      return res.status(400).send('Invalid signature');
    }

    try {
      await this.processEvent(event);

      processedEvents.add(svixId);
      // Keep cache bounded
      if (processedEvents.size > 10000) {
        processedEvents.delete(processedEvents.values().next().value);
      }

      this.logger.log(`[WEBHOOK] ${event.type} processed in ${Date.now() - startTime}ms (requestId=${requestId})`);
      return res.status(204).end();
    } catch (error) {
      this.logger.error(
        `[WEBHOOK] Failed to process ${event?.type} (requestId=${requestId}): ${error.message}`,
        error.stack,
      );
      return res.status(500).send('Webhook processing failed');
    }
  }

  private async processEvent(event: ClerkWebhookEvent) {
    const { type, data } = event;
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
        this.logger.warn(`[WEBHOOK] Unhandled event type: ${type}`);
    }
  }

  private parseClerkTimestamp(value: unknown): Date | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'number') {
      const ms = value < 1e12 ? value * 1000 : value;
      const parsed = new Date(ms);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        const ms = numeric < 1e12 ? numeric * 1000 : numeric;
        const parsed = new Date(ms);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
      }

      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    return undefined;
  }

  private resolveLastActiveAt(data: any): Date | undefined {
    return this.parseClerkTimestamp(data?.last_active_at ?? data?.last_sign_in_at);
  }

  private async handleUserCreated(data: any) {
    const clerkId: string = data.id;

    const rawIntendedRole =
      data.private_metadata?.intendedRole ||
      data.unsafe_metadata?.role ||
      data.unsafe_metadata?.pendingRole ||
      data.unsafe_metadata?.signupType ||
      data.public_metadata?.role ||
      null;

    // If no role is specified (e.g. Google Sign Up), skip automatic creation.
    // The user will be redirected to the signup page to complete their profile.
    if (!rawIntendedRole) {
      this.logger.log(`[USER CREATION] No role for ${clerkId} (likely OAuth) — skipping, waiting for role selection`);
      return;
    }

    const intendedRole = this.mapSignupRoleToUserRole(rawIntendedRole);
    const validRole = this.isValidRole(intendedRole) ? intendedRole : UserRole.PARENT;

    // Handle test webhooks from Clerk Dashboard (empty email_addresses array)
    let primaryEmail: string;
    if (data.email_addresses && data.email_addresses.length > 0) {
      primaryEmail = data.email_addresses[0]?.email_address;
    } else if (data.primary_email_address_id) {
      this.logger.warn(`[USER CREATION] Clerk test webhook detected for ${clerkId} — using placeholder email`);
      primaryEmail = `test-${clerkId}@clerk-test-webhook.local`;
    } else {
      primaryEmail = `${clerkId}@missing-email.local`;
    }

    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || 'User';
    const phoneNumber = data.phone_numbers?.[0]?.phone_number || null;
    const lastActiveAt = this.resolveLastActiveAt(data);

    // Gate profile creation on email verification.
    // Clerk fires user.created as soon as the account is created — BEFORE the user
    // has clicked the verification link. If the primary email is not yet verified we
    // bail out here. When the user verifies their email, Clerk fires user.updated;
    // handleUserUpdated will detect the missing AppUser and call handleUserCreated
    // again at that point, when verification.status === 'verified'.
    const isTestWebhook =
      !!(data.primary_email_address_id && (!data.email_addresses || data.email_addresses.length === 0));

    const primaryEmailObj = data.email_addresses?.find(
      (e: any) => e.id === data.primary_email_address_id,
    ) ?? data.email_addresses?.[0];

    const isEmailVerified = isTestWebhook || primaryEmailObj?.verification?.status === 'verified';

    if (!isEmailVerified) {
      this.logger.log(
        `⏳ [USER CREATION] Email not yet verified for ${clerkId} (status: ` +
        `${primaryEmailObj?.verification?.status ?? 'unknown'}). ` +
        `Profile creation deferred — will proceed on user.updated once verified.`,
      );
      return;
    }

    // Extract organization data from unsafe_metadata (set during signup)
    const organisationName = data.unsafe_metadata?.organisationName;
    const signupCanton = data.unsafe_metadata?.canton;

    let appUser: any;
    let profileUserId: string | null = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        appUser = await tx.appUser.upsert({
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
          select: { id: true, role: true, email: true },
        });

        const userUpdateData: any = {
          email: primaryEmail,
          firstName,
          lastName,
          role: validRole as UserRole,
          phoneNumber,
          isActive: true,
        };

        const userCreateData: any = {
          clerkId,
          email: primaryEmail,
          firstName,
          lastName,
          role: validRole as UserRole,
          phoneNumber,
          isActive: true,
          ...(validRole === UserRole.EDUCATOR && {
            approvalStatus: EducatorApprovalStatus.PENDING_REVIEW,
          }),
        };

        if (lastActiveAt !== undefined) {
          userUpdateData.lastActiveAt = lastActiveAt;
          userCreateData.lastActiveAt = lastActiveAt;
        }

        const user = await tx.user.upsert({
          where: { clerkId },
          update: userUpdateData,
          create: userCreateData,
        });
        profileUserId = user.id;

        // Create organization and link user for organization-based roles
        const orgBasedRoles: UserRole[] = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER];
        if (orgBasedRoles.includes(validRole as UserRole)) {
          // Check if user already has an organization link (to avoid duplicates on updates)
          const existingOrgLink = await tx.userOrganization.findFirst({
            where: { userId: user.id },
          });

          if (!existingOrgLink) {
            // Determine organization type from user role
            const orgTypeMap: Record<string, 'FOUNDATION' | 'PRODUCT_SUPPLIER' | 'SERVICE_PROVIDER'> = {
              [UserRole.FOUNDATION]: 'FOUNDATION',
              [UserRole.PRODUCT_SUPPLIER]: 'PRODUCT_SUPPLIER',
              [UserRole.SERVICE_PROVIDER]: 'SERVICE_PROVIDER',
            };
            const orgType = orgTypeMap[validRole as string];

            // Create the organization with signup data
            const organization = await tx.organization.create({
              data: {
                name: organisationName || `${firstName} ${lastName}`.trim() || 'New Organization',
                type: orgType,
                contactPerson: `${firstName} ${lastName}`.trim() || null,
                phoneNumber: phoneNumber || null,
                canton: signupCanton || null,
                region: signupCanton || null,
                isActive: true,
              },
            });

            // Link user to organization
            await tx.userOrganization.create({
              data: {
                userId: user.id,
                organizationId: organization.id,
                role: validRole as UserRole,
              },
            });

          } else {
            // org already linked — no-op
          }
        }
      });

    } catch (error) {
      this.logger.error(`[USER CREATION] DB transaction failed for ${clerkId}: ${error.message}`, error.stack);
      throw error;
    }

    // Systematically attach historical parent leads to newly created parent accounts.
    try {
      await this.linkParentLeadsToUser(profileUserId, primaryEmail, validRole as UserRole);
    } catch (error: any) {
      this.logger.error(
        `Failed to link parent leads for user ${profileUserId ?? 'unknown'} (${primaryEmail || 'no-email'}): ${error?.message || String(error)}`,
        error?.stack,
      );
      // Do not throw; user creation should remain successful.
    }

    // Send welcome email — fire-and-forget, never block user creation.
    if (primaryEmail && !primaryEmail.endsWith('@missing-email.local') && !primaryEmail.endsWith('@clerk-test-webhook.local')) {
      this.emailNotificationService.sendNotification({
        event: 'welcome_email',
        recipient: primaryEmail,
        recipientName: firstName,
        payload: {
          firstName,
          role: validRole,
          dashboardUrl: `${this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL') || ''}/login`,
        },
        bypassPreferences: true,
        allowUnknownRecipient: false,
      }).catch((err: any) => {
        this.logger.warn(`Welcome email failed for ${primaryEmail}: ${err?.message || err}`);
      });
    }
    
    // Sync role into Clerk public metadata so the frontend can read it immediately.
    try {
      const clerkUser = await this.clerk.users.getUser(clerkId);
      const currentPublicRole = (clerkUser.publicMetadata as any)?.role;
      if (currentPublicRole !== appUser.role) {
        await this.clerk.users.updateUser(clerkId, {
          publicMetadata: { ...(clerkUser.publicMetadata as any), role: appUser.role },
          unsafeMetadata: { ...(clerkUser.unsafeMetadata as any), role: undefined },
        });
      }
    } catch (error) {
      this.logger.warn(`[USER CREATION] Clerk metadata sync failed for ${clerkId}: ${error.message}`);
    }

    this.logger.log(`[USER CREATION] Profile created for ${clerkId} with role ${appUser.role}`);
  }

  private async handleUserUpdated(data: any) {
    const clerkId: string = data.id;
    const unsafeRole = data.unsafe_metadata?.role;
    const publicRole = data.public_metadata?.role;
    const primaryEmail = data.email_addresses?.[0]?.email_address || `${clerkId}@missing-email.local`;
    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || 'User';
    const lastActiveAt = this.resolveLastActiveAt(data);

    // AppUser not found means profile creation was deferred (email unverified at user.created).
    // Now that the email is verified, proceed with full profile creation.
    const appUser = await this.prisma.appUser.findUnique({ where: { clerkId } });
    if (!appUser) {
      this.logger.log(`[USER UPDATED] AppUser not found for ${clerkId} — running deferred profile creation`);
      await this.handleUserCreated(data);
      return;
    }

    await this.prisma.appUser.update({
      where: { id: appUser.id },
      data: { email: primaryEmail },
    });

    const userUpdateData: any = {
      email: primaryEmail,
      firstName,
      lastName,
    };

    if (lastActiveAt !== undefined) {
      userUpdateData.lastActiveAt = lastActiveAt;
    }

    await this.prisma.user.update({
      where: { clerkId },
      data: userUpdateData,
    }).catch(async () => {
      const userCreateData: any = {
        id: appUser.id,
        clerkId,
        email: primaryEmail,
        firstName,
        lastName,
        role: appUser.role,
      };

      if (lastActiveAt !== undefined) {
        userCreateData.lastActiveAt = lastActiveAt;
      }

      await this.prisma.user.create({
        data: userCreateData,
      });
    });
    // If someone changed Clerk metadata outside our system, revert to DB truth
    if (publicRole && publicRole !== appUser.role) {
      this.logger.warn(`[USER UPDATED] Unauthorized role change detected for ${clerkId}: ${publicRole} → ${appUser.role} — reverting`);
      await this.clerk.users.updateUser(clerkId, {
        publicMetadata: { ...(data.public_metadata ?? {}), role: appUser.role },
      });
    }

    // Scrub unsafe metadata role if present
    if (typeof unsafeRole !== 'undefined') {
      await this.clerk.users.updateUser(clerkId, {
        unsafeMetadata: { ...(data.unsafe_metadata ?? {}), role: undefined },
      });
    }

    this.logger.log(`[USER UPDATED] Profile synced for ${clerkId}`);
  }

  private async handleUserDeleted(data: any) {
    const clerkId: string = data.id;
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });
    
    if (appUser) {
      await this.prisma.appUserRoleHistory.create({
        data: {
          userId: appUser.id,
          previousRole: appUser.role,
          newRole: appUser.role,
          changedBy: 'system/webhook',
          reason: 'User deleted from Clerk',
        },
      });
    } else {
      this.logger.warn(`[USER DELETED] AppUser not found for clerkId: ${clerkId}`);
    }

    this.logger.log(`[USER DELETED] Deletion recorded for ${clerkId}`);
  }

  /**
   * Systematically links historical parent lead submissions to the newly created parent account.
   * Safe to run multiple times and only links currently unowned leads.
   */
  private async linkParentLeadsToUser(
    profileUserId: string | null,
    email: string | null | undefined,
    role: UserRole,
  ) {
    if (role !== UserRole.PARENT || !profileUserId || !email) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    const result = await this.prisma.parentLead.updateMany({
      where: {
        parentUserId: null,
        parentEmail: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      data: {
        parentUserId: profileUserId,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `✅ [LEAD LINK] Linked ${result.count} lead(s) to parent account ${profileUserId}`,
      );
    }
  }

  private isValidRole(role: any): boolean {
    return Object.values(UserRole).includes(role);
  }

  /**
   * Maps frontend SignupRole values (human-readable) to backend UserRole enum values
   * Frontend sends values like "Foundation (Daycare)", "Product Supplier", etc.
   * Backend expects FOUNDATION, PRODUCT_SUPPLIER, etc.
   */
  private mapSignupRoleToUserRole(signupRole: string | null | undefined): UserRole {
    if (!signupRole) {
      return UserRole.PARENT;
    }

    // Mapping table from frontend SignupRole to backend UserRole
    const roleMap: Record<string, UserRole> = {
      'Foundation (Daycare)': UserRole.FOUNDATION,
      'Product Supplier': UserRole.PRODUCT_SUPPLIER,
      'Service Provider': UserRole.SERVICE_PROVIDER,
      'Educator/Candidate': UserRole.EDUCATOR,
      'Parent': UserRole.PARENT,
      // Also support already-mapped values (in case they come pre-converted)
      'FOUNDATION': UserRole.FOUNDATION,
      'PRODUCT_SUPPLIER': UserRole.PRODUCT_SUPPLIER,
      'SERVICE_PROVIDER': UserRole.SERVICE_PROVIDER,
      'EDUCATOR': UserRole.EDUCATOR,
      'PARENT': UserRole.PARENT,
      // Fallbacks
      'Educator': UserRole.EDUCATOR,
    };

    const mappedRole = roleMap[signupRole];
    
    if (mappedRole) {
      console.log(`✅ [ROLE MAPPING] Successfully mapped "${signupRole}" to ${mappedRole}`);
      return mappedRole;
    }

    console.warn(`⚠️ [ROLE MAPPING] Unknown role "${signupRole}", falling back to PARENT`);
    return UserRole.PARENT;
  }
}