import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';

interface MirrorRolePayload {
  clerkUserId: string;
  role: string;
}

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
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

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox() {
    try {
      // Use raw query with FOR UPDATE SKIP LOCKED for concurrent safety
      const jobs = await this.prisma.$queryRaw<
        { id: bigint; topic: string; payload: any; attempts: number }[]
      >`
        SELECT id, topic, payload, attempts 
        FROM "Outbox" 
        WHERE "nextRunAt" <= NOW() 
        ORDER BY id 
        LIMIT 50 
        FOR UPDATE SKIP LOCKED
      `;

      for (const job of jobs) {
        try {
          await this.processJob(job);
          
          // Delete successful job
          await this.prisma.outbox.delete({
            where: { id: Number(job.id) },
          });
        } catch (error) {
          await this.handleJobError(job, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process outbox', error);
    }
  }

  private async processJob(job: { topic: string; payload: any }) {
    if (job.topic === 'mirror.role') {
      await this.mirrorRoleToClerk(job.payload as MirrorRolePayload);
    } else {
      this.logger.warn(`Unknown outbox topic: ${job.topic}`);
    }
  }

  private async mirrorRoleToClerk(payload: MirrorRolePayload) {
    const { clerkUserId, role } = payload;
    
    this.logger.log(`Mirroring role to Clerk: ${clerkUserId} -> ${role}`);
    
    // Update Clerk user metadata
    await this.clerk.users.updateUser(clerkUserId, {
      publicMetadata: { role },
      unsafeMetadata: { role: undefined }, // Clear unsafe metadata
    });
  }

  private async handleJobError(
    job: { id: bigint; attempts: number }, 
    error: any
  ) {
    const errorMessage = error?.message || String(error);
    const attempts = Number(job.attempts) + 1;
    
    // Calculate next retry with exponential backoff (max 60 seconds)
    const delaySeconds = Math.min(60, Math.pow(2, Math.min(6, attempts)) * 1);
    const nextRunAt = new Date(Date.now() + delaySeconds * 1000);
    
    this.logger.error(
      `Outbox job ${job.id} failed (attempt ${attempts}): ${errorMessage}`
    );
    
    // Update job with retry info
    await this.prisma.outbox.update({
      where: { id: Number(job.id) },
      data: {
        attempts,
        lastError: errorMessage.substring(0, 500), // Limit error message length
        nextRunAt,
      },
    });
  }
}