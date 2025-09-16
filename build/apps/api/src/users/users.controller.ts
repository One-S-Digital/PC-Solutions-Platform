import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getCurrentUser(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    return {
      success: true,
      data: user,
    };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync user from Clerk webhook' })
  @ApiResponse({ status: 200, description: 'User synced successfully' })
  async syncUser(@Body() clerkUser: any) {
    await this.authService.syncUserFromClerk(clerkUser);
    return {
      success: true,
      message: 'User synced successfully',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    return {
      success: true,
      data: users,
    };
  }
}