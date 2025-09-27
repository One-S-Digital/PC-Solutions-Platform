import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name);
  private clerk: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!clerkSecretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }
    this.clerk = createClerkClient({ secretKey: clerkSecretKey });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async reconcileRoles() {
    this.logger.log('Starting role reconciliation');
    
    const batchSize = 100;
    let processed = 0;
    let hasMore = true;
    
    while (hasMore) {
      const users = await this.prisma.appUser.findMany({
        take: batchSize,
        skip: processed,
        orderBy: { createdAt: 'asc' },
      });
      
      if (users.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const user of users) {
        try {
          await this.reconcileUser({ clerkUserId: user.clerkUserId, role: user.role });
        } catch (error) {
          this.logger.error(
            `Failed to reconcile user ${user.clerkUserId}: ${error?.message || error}`,
          );

          // Could enqueue to outbox for retry
          await this.prisma.outbox.create({
            data: {
              topic: 'mirror.role',
              payload: { clerkUserId: user.clerkUserId, role: user.role },
            },
          }).catch(() => {}); // Best effort
        }
      }
      
      processed += users.length;
      hasMore = users.length === batchSize;
    }
    
    this.logger.log(`Reconciliation complete. Processed ${processed} users`);
  }

  private async reconcileUser(user: { clerkUserId: string; role: string }) {
    const clerkUser = await this.clerk.users.getUser(user.clerkUserId);
    const publicRole = (clerkUser.publicMetadata as any)?.role;

    if (publicRole !== user.role) {
      this.logger.log(
        `Reconciling role mismatch for ${user.clerkUserId}: ` +
        `Clerk=${publicRole}, DB=${user.role}`
      );

      // Update Clerk to match DB (DB is source of truth)
      await this.clerk.users.updateUser(user.clerkUserId, {
        publicMetadata: {
          ...(clerkUser.publicMetadata as any),
          role: user.role
        },
        unsafeMetadata: { 
          ...(clerkUser.unsafeMetadata as any), 
          role: undefined 
        },
      });
    }
  }
}