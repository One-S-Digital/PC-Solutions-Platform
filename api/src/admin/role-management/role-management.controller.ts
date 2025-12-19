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
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RoleSyncService } from '../../sync/role-sync.service';

interface ChangeRoleDto {
  role: UserRole;
  reason?: string;
}

@Controller('admin/role-management')
export class RoleManagementController {
  private readonly logger = new Logger(RoleManagementController.name);

  constructor(
    private prisma: PrismaService,
    private roleSyncService: RoleSyncService,
  ) {}

  @Get('users/:clerkId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getUserRole(@Param('clerkId') clerkId: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
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

    return {
      currentRole: appUser.role,
      roleHistory: appUser.roleHistory,
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

    const changedBy = req.context.clerkUserId ?? req.context.userId ?? 'system';

    // Check if user exists, create if not
    let appUser = await this.prisma.appUser.findUnique({
      where: { clerkId: targetClerkId },
    });

    if (!appUser) {
      // Create user if doesn't exist - wrap in transaction for atomicity
      this.logger.log(`Creating new user for clerkId: ${targetClerkId} with role ${dto.role}`);
      await this.prisma.$transaction(async (tx) => {
        appUser = await tx.appUser.create({
          data: {
            clerkId: targetClerkId,
            role: dto.role,
          },
        });

        // Create role history for audit trail
        await tx.appUserRoleHistory.create({
          data: {
            userId: appUser.id,
            previousRole: null as any, // No previous role for new user
            newRole: dto.role,
            changedBy,
            reason: dto.reason || 'Initial user creation',
          },
        });

        // Create outbox entry for Clerk sync
        await tx.outbox.create({
          data: {
            topic: 'mirror.role',
            payload: { clerkUserId: targetClerkId, role: dto.role },
          },
        });
      });
    } else {
      // Use RoleSyncService for existing user role change
      await this.roleSyncService.changeRoleByClerkId({
        clerkId: targetClerkId,
        newRole: dto.role,
        changedBy,
        reason: dto.reason || 'Admin role change',
      });
    }

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
              clerkId: true,
            },
          },
        },
      }),
      this.prisma.appUserRoleHistory.count(),
    ]);

    return {
      data: history,
      total,
      limit: take,
      offset: skip,
    };
  }
}