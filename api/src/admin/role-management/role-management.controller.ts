import { 
  Body, 
  Controller, 
  Param, 
  Patch, 
  ForbiddenException, 
  Req, 
  HttpCode,
  Get,
  Query,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';

interface ChangeRoleDto {
  role: UserRole;
  reason?: string;
}

@Controller('admin/role-management')
export class RoleManagementController {
  constructor(private prisma: PrismaService) {}

  @Get('users/:clerkId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getUserRole(@Param('clerkId') clerkId: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkUserId: clerkId },
      include: {
        roleHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!appUser) {
      throw new BadRequestException('User not found');
    }

    const normalizedHistory = appUser.roleHistory.map((history: any) => ({
      ...history,
      user: history.user
        ? {
            ...history.user,
            clerkId: (history.user as any).clerkUserId,
          }
        : history.user,
    }));

    return {
      currentRole: appUser.role,
      roleHistory: normalizedHistory,
    };
  }

  @Patch('users/:clerkId/role')
  @HttpCode(204)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async changeUserRole(
    @Param('clerkId') targetClerkId: string,
    @Body() dto: ChangeRoleDto,
    @Req() req: any
  ) {
    // Validate role
    if (!Object.values(UserRole).includes(dto.role)) {
      throw new BadRequestException('Invalid role');
    }

    // Additional check: ADMIN cannot promote to SUPER_ADMIN
    if (req.context.role === UserRole.ADMIN && dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can promote to SUPER_ADMIN');
    }

    // Execute in transaction
    await this.prisma.$transaction(async (tx) => {
      // Get or create user
      let appUser = await tx.appUser.findUnique({
        where: { clerkUserId: targetClerkId },
      });

      if (!appUser) {
        // Create user if doesn't exist
        appUser = await tx.appUser.create({
          data: {
            clerkUserId: targetClerkId,
            role: dto.role,
          },
        });
      }

      const previousRole = appUser.role;

      // Update role
      if (previousRole !== dto.role) {
        await tx.appUser.update({
          where: { id: appUser.id },
          data: { role: dto.role },
        });

        // Create history entry
        await tx.appUserRoleHistory.create({
          data: {
            userId: appUser.id,
            previousRole,
            newRole: dto.role,
            changedBy: req.context.clerkUserId ?? req.context.userId,
            reason: dto.reason || 'Admin role change',
          },
        });

        // Create outbox entry for Clerk sync
        await tx.outbox.create({
          data: {
            topic: 'mirror.role',
            payload: { clerkUserId: targetClerkId, role: dto.role },
          },
        });
      }
    });

    return;
  }

  @Get('history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getRoleChangeHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = parseInt(limit || '50', 10);
    const skip = parseInt(offset || '0', 10);

    const [history, total] = await Promise.all([
      this.prisma.appUserRoleHistory.findMany({
        take,
        skip,
        orderBy: { changedAt: 'desc' },
        include: {
          user: {
            select: {
              clerkUserId: true,
            },
          },
        },
      }),
      this.prisma.appUserRoleHistory.count(),
    ]);

    const normalized = history.map((entry: any) => ({
      ...entry,
      user: entry.user
        ? {
            ...entry.user,
            clerkId: entry.user.clerkUserId,
          }
        : entry.user,
    }));

    return {
      data: normalized,
      total,
      limit: take,
      offset: skip,
    };
  }
}