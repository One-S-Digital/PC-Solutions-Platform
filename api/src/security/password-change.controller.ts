import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { PrismaService } from '../prisma/prisma.service'
import { PasswordChangeEventDto } from './dto/password-change-event.dto'

@ApiTags('security')
@ApiBearerAuth()
@Controller('security/password-change')
export class PasswordChangeController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Record a password change event for auditing purposes' })
  @ApiResponse({ status: 201, description: 'Event recorded successfully' })
  async recordEvent(@Req() req: Request, @Body() body: PasswordChangeEventDto) {
    const clerkUserId = (req as any)?.context?.userId || (req as any)?.clerk?.userId

    if (!clerkUserId) {
      throw new HttpException('Authenticated user context missing', HttpStatus.UNAUTHORIZED)
    }

    const user = await this.prisma.user.findUnique({ where: { clerkId: clerkUserId } })

    if (!user) {
      throw new HttpException('User not found for password change event', HttpStatus.NOT_FOUND)
    }

    const occurredAtValid = body.occurredAt && !Number.isNaN(Date.parse(body.occurredAt))
    const createdAt = occurredAtValid ? new Date(body.occurredAt as string) : new Date()

    let metadata: Record<string, unknown> | undefined

    if (body.metadata) {
      try {
        metadata = JSON.parse(body.metadata)
      } catch {
        metadata = { raw: body.metadata }
      }
    }

    try {
      await this.prisma.userActivity.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_CHANGE',
          details: {
            source: body.method || 'clerk',
            metadata,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          createdAt,
        },
      })

      return {
        success: true,
        message: 'Password change recorded',
      }
    } catch (error) {
      throw new HttpException('Failed to record password change event', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
