import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EmailChangeEventDto } from './dto/email-change-event.dto';

@ApiTags('security')
@ApiBearerAuth()
@Controller('security/email-change')
export class EmailChangeController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Record an email change event for auditing purposes' })
  @ApiResponse({ status: 201, description: 'Event recorded successfully' })
  async recordEvent(@Req() req: Request, @Body() body: EmailChangeEventDto) {
    const clerkUserId = (req as any)?.context?.userId || (req as any)?.clerk?.userId;

    if (!clerkUserId) {
      throw new HttpException('Authenticated user context missing', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({ where: { clerkId: clerkUserId } });

    if (!user) {
      throw new HttpException('User not found for email change event', HttpStatus.NOT_FOUND);
    }

    const occurredAtValid = body.occurredAt && !Number.isNaN(Date.parse(body.occurredAt));
    const createdAt = occurredAtValid ? new Date(body.occurredAt as string) : new Date();

    let metadata: Prisma.JsonValue | null = null;

    if (body.metadata) {
      try {
        metadata = JSON.parse(body.metadata) as Prisma.JsonValue;
      } catch {
        metadata = {
          raw: body.metadata,
        } as Prisma.JsonObject;
      }
    }

    const details: Prisma.JsonObject = {
      source: body.method || 'clerk',
      previousEmail: body.previousEmail || user.email || 'unknown',
      newEmail: body.newEmail || 'unknown',
    };

    if (metadata !== null) {
      details.metadata = metadata;
    }

    try {
      // Update the user's email in the database
      if (body.newEmail) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { email: body.newEmail },
        });

        // Also update AppUser if exists
        const appUser = await this.prisma.appUser.findUnique({ where: { clerkId: clerkUserId } });
        if (appUser) {
          await this.prisma.appUser.update({
            where: { id: appUser.id },
            data: { email: body.newEmail },
          });
        }
      }

      // Record the activity
      await this.prisma.userActivity.create({
        data: {
          userId: user.id,
          action: 'EMAIL_CHANGE',
          details,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          createdAt,
        },
      });

      return {
        success: true,
        message: 'Email change recorded',
      };
    } catch (error) {
      console.error('Failed to record email change event:', error);
      console.error('Error details:', {
        userId: user.id,
        action: 'EMAIL_CHANGE',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof Error) {
        throw new HttpException(
          `Failed to record email change event: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      throw new HttpException('Failed to record email change event', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
