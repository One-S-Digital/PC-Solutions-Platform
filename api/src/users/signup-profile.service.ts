import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

/**
 * Everything the signup wizard collects on step 2, in one shape.
 *
 * Why this exists: there are two paths that create an account, and they used to
 * persist DIFFERENT subsets of the signup form.
 *
 *   - email/password  -> Clerk `user.created` webhook (clerk-webhook.controller)
 *   - OAuth / recovery -> POST /users/complete-profile (users.service)
 *
 * The webhook path only ever read `organisationName` and `canton`, so a
 * Foundation that signed up with Google kept its capacity while the same
 * Foundation signing up with email/password silently lost it. Phone, supplier
 * category, service type and the parent's child details were dropped the same
 * way, and `childAge`/`childStartDate`/`termsAccepted` were never persisted by
 * either path.
 *
 * Both paths now build a `SignupIntent` and hand it to `applySignupIntent`, so
 * the two can no longer drift apart.
 */
export interface SignupIntent {
  organisationName?: string;
  contactPerson?: string;
  phone?: string;
  canton?: string;
  /** FOUNDATION - number of childcare places. */
  capacity?: number;
  /** PRODUCT_SUPPLIER - product category. */
  category?: string;
  /** SERVICE_PROVIDER - type of service offered. */
  serviceType?: string;
  /** PARENT - age of the child. */
  childAge?: number;
  /** PARENT - desired start date. */
  childStartDate?: Date;
  /** When the user ticked the terms checkbox during signup. */
  termsAcceptedAt?: Date;
}

export const ORGANIZATION_ROLES: UserRole[] = [
  UserRole.FOUNDATION,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
];

const ORGANIZATION_TYPE_BY_ROLE: Record<string, 'FOUNDATION' | 'PRODUCT_SUPPLIER' | 'SERVICE_PROVIDER'> = {
  [UserRole.FOUNDATION]: 'FOUNDATION',
  [UserRole.PRODUCT_SUPPLIER]: 'PRODUCT_SUPPLIER',
  [UserRole.SERVICE_PROVIDER]: 'SERVICE_PROVIDER',
};

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toPositiveInt(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Build a `SignupIntent` from untrusted input.
 *
 * The email/password path carries this through Clerk `unsafe_metadata`, which is
 * writable from the browser. Every value is therefore whitelisted and coerced
 * before it can reach Prisma, and unknown keys are dropped. These are all
 * self-asserted profile fields the user could equally edit in settings later, so
 * there is no privilege concern — but `role` is deliberately NOT read here:
 * the role stays resolved and scrubbed server-side, exactly as before.
 */
export function parseSignupIntent(raw: unknown): SignupIntent {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  return {
    organisationName: toTrimmedString(source.organisationName),
    contactPerson: toTrimmedString(source.contactPerson),
    phone: toTrimmedString(source.phone),
    canton: toTrimmedString(source.canton),
    capacity: toPositiveInt(source.capacity),
    category: toTrimmedString(source.category),
    serviceType: toTrimmedString(source.serviceType),
    childAge: toPositiveInt(source.childAge),
    childStartDate: toDate(source.childStartDate),
    termsAcceptedAt: toDate(source.termsAcceptedAt),
  };
}

export interface ApplySignupIntentArgs {
  /** `User.id` (profile id) of the freshly created/updated user. */
  userId: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  /** Phone already known from the identity provider, if any; takes precedence. */
  phoneNumber?: string | null;
  intent: SignupIntent;
}

@Injectable()
export class SignupProfileService {
  private readonly logger = new Logger(SignupProfileService.name);

  /**
   * Persist the signup form onto the profile, and create + link the
   * organization for organization-based roles.
   *
   * Must be called inside the same transaction that creates the user so a
   * failure here cannot leave a half-provisioned account behind.
   */
  async applySignupIntent(
    tx: Prisma.TransactionClient,
    { userId, role, firstName, lastName, phoneNumber, intent }: ApplySignupIntentArgs,
  ): Promise<void> {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    const resolvedPhone = phoneNumber || intent.phone || null;

    const profileData: Prisma.UserUpdateInput = {};
    if (resolvedPhone) profileData.phoneNumber = resolvedPhone;
    if (intent.termsAcceptedAt) profileData.termsAcceptedAt = intent.termsAcceptedAt;
    if (role === UserRole.PARENT) {
      if (intent.childAge !== undefined) profileData.childAge = intent.childAge;
      if (intent.childStartDate) profileData.childStartDate = intent.childStartDate;
    }

    if (Object.keys(profileData).length > 0) {
      await tx.user.update({ where: { id: userId }, data: profileData });
    }

    if (!ORGANIZATION_ROLES.includes(role)) {
      return;
    }

    // Avoid duplicating the organization when this runs again for an existing
    // user (webhook redelivery, or completeProfile after a partial signup).
    const existingLink = await tx.userOrganization.findFirst({ where: { userId } });
    if (existingLink) {
      this.logger.log(`User ${userId} already linked to an organization, skipping creation`);
      return;
    }

    const organization = await tx.organization.create({
      data: {
        name: intent.organisationName || fullName || 'New Organization',
        type: ORGANIZATION_TYPE_BY_ROLE[role as string],
        contactPerson: intent.contactPerson || fullName || null,
        phoneNumber: resolvedPhone,
        canton: intent.canton || null,
        region: intent.canton || null,
        ...(role === UserRole.FOUNDATION && intent.capacity !== undefined
          ? { capacity: intent.capacity }
          : {}),
        ...(role === UserRole.PRODUCT_SUPPLIER && intent.category
          ? { productCategory: intent.category }
          : {}),
        ...(role === UserRole.SERVICE_PROVIDER && intent.serviceType
          ? { serviceType: intent.serviceType }
          : {}),
        isActive: true,
      },
    });

    await tx.userOrganization.create({
      data: { userId, organizationId: organization.id, role },
    });

    this.logger.log(
      `Created organization "${organization.name}" (${organization.type}) and linked it to user ${userId}`,
    );
  }
}
