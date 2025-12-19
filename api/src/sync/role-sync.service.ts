import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, Prisma } from '@prisma/client';

/**
 * Outbox topic constants for message queue processing
 */
export const OUTBOX_TOPICS = {
  MIRROR_ROLE: 'mirror.role',
} as const;

export interface RoleChangeOptions {
  /** The AppUser ID (UUID) */
  appUserId: string;
  /** The new role to assign */
  newRole: UserRole;
  /** Who initiated the change (clerkId or 'system') */
  changedBy: string;
  /** Reason for the change */
  reason?: string;
  /** Optional transaction client for atomic operations */
  tx?: Prisma.TransactionClient;
}

export interface RoleChangeByClerkIdOptions {
  /** The Clerk user ID */
  clerkId: string;
  /** The new role to assign */
  newRole: UserRole;
  /** Who initiated the change (clerkId or 'system') */
  changedBy: string;
  /** Reason for the change */
  reason?: string;
  /** Optional transaction client for atomic operations */
  tx?: Prisma.TransactionClient;
}

/**
 * Centralized service for all role changes.
 * Ensures consistency across:
 * - Database updates (AppUser + User tables)
 * - Audit trail (AppUserRoleHistory)
 * - Clerk synchronization (Outbox)
 */
@Injectable()
export class RoleSyncService {
  private readonly logger = new Logger(RoleSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Change a user's role by AppUser ID.
   * This is the primary method for role changes - ensures DB + Clerk sync.
   */
  async changeRole(options: RoleChangeOptions): Promise<void> {
    const { appUserId, newRole, changedBy, reason = 'Role change', tx } = options;
    const prismaClient = tx || this.prisma;

    const appUser = await prismaClient.appUser.findUnique({
      where: { id: appUserId },
    });

    if (!appUser) {
      throw new NotFoundException(`User not found: ${appUserId}`);
    }

    // No change needed
    if (appUser.role === newRole) {
      this.logger.log(`Role unchanged for user ${appUserId}: already ${newRole}`);
      return;
    }

    const previousRole = appUser.role;

    this.logger.log(
      `Changing role for user ${appUserId}: ${previousRole} -> ${newRole} (by: ${changedBy})`
    );

    // 1. Update AppUser table
    await prismaClient.appUser.update({
      where: { id: appUserId },
      data: { role: newRole },
    });

    // 2. Update User table if exists (profile data)
    await prismaClient.user.updateMany({
      where: { clerkId: appUser.clerkId },
      data: { role: newRole },
    });

    // 3. Create audit history entry
    await prismaClient.appUserRoleHistory.create({
      data: {
        userId: appUserId,
        previousRole,
        newRole,
        changedBy,
        reason,
      },
    });

    // 4. Create Outbox entry for Clerk sync
    await prismaClient.outbox.create({
      data: {
        topic: OUTBOX_TOPICS.MIRROR_ROLE,
        payload: { clerkUserId: appUser.clerkId, role: newRole },
      },
    });

    this.logger.log(
      `Role change complete for user ${appUserId}: ${previousRole} -> ${newRole}`
    );
  }

  /**
   * Change a user's role by Clerk ID.
   * Convenience method that looks up the AppUser first.
   */
  async changeRoleByClerkId(options: RoleChangeByClerkIdOptions): Promise<void> {
    const { clerkId, newRole, changedBy, reason, tx } = options;
    const prismaClient = tx || this.prisma;

    const appUser = await prismaClient.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      throw new NotFoundException(`User not found for clerkId: ${clerkId}`);
    }

    await this.changeRole({
      appUserId: appUser.id,
      newRole,
      changedBy,
      reason,
      tx,
    });
  }

  /**
   * Execute a role change within a transaction.
   * Use this when the role change is part of a larger atomic operation.
   */
  async changeRoleInTransaction(
    options: Omit<RoleChangeOptions, 'tx'>,
    callback?: (tx: Prisma.TransactionClient) => Promise<void>
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.changeRole({ ...options, tx });
      if (callback) {
        await callback(tx);
      }
    });
  }
}
