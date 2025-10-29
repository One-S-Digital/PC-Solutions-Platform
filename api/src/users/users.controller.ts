import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      role,
      search,
    });
  }

  @Get('me')
  async getCurrentUser(@Request() request) {
    const user = await this.usersService.findByClerkId(request.user.clerkId);
    
    if (!user) {
      // User doesn't exist yet (webhook hasn't processed)
      // Return a temporary response indicating the user is being processed
      return {
        success: true,
        data: {
          id: 'pending',
          clerkId: request.user.clerkId,
          email: request.user.email,
          role: 'PENDING',
          isPending: true,
          message: 'User account is being processed. Please wait a moment and refresh.'
        },
      };
    }
    
    return {
      success: true,
      data: user,
    };
  }

  @Post('me/sync')
  async syncCurrentUser(@Request() request) {
    // Manual sync endpoint - creates user if webhook hasn't fired yet
    // This is the critical rescue route for when webhooks fail
    console.log('🔄 [SYNC] Manual sync requested for clerkId:', request.user.clerkId);
    
    try {
      // First check if user already exists
      let user = await this.usersService.findByClerkId(request.user.clerkId);
      
      if (user && !user.isPending) {
        console.log('✅ [SYNC] User already exists, returning existing record');
        return {
          success: true,
          data: user,
          synced: false,
          message: 'User already exists'
        };
      }
      
      // User doesn't exist or is pending - create via Clerk sync
      console.log('🔄 [SYNC] Fetching user from Clerk and creating record...');
      user = await this.usersService.syncUserFromClerk(request.user.clerkId);
      
      console.log('✅ [SYNC] User synced successfully:', user.id);
      return {
        success: true,
        data: user,
        synced: true,
        message: 'User synchronized from Clerk'
      };
    } catch (error) {
      console.error('❌ [SYNC] Failed to sync user:', error);
      return {
        success: false,
        error: error.message || 'Failed to synchronize user',
        clerkId: request.user.clerkId
      };
    }
  }

  @Get('webhook-status/:clerkId')
  async getWebhookStatus(@Param('clerkId') clerkId: string) {
    const appUser = await this.usersService.findAppUserByClerkId(clerkId);
    
    return {
      success: true,
      data: {
        exists: !!appUser,
        isPending: !appUser,
        clerkId,
        timestamp: new Date().toISOString()
      }
    };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  async updateCurrentUser(@Request() request, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.updateByClerkId(request.user.clerkId, updateUserDto);
    return { success: true, data: user };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: UserRole,
  ) {
    return this.usersService.assignRole(id, role);
  }

  @Delete(':id/roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: UserRole,
  ) {
    return this.usersService.removeRole(id, role);
  }

  @Get('search/email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findByEmail(@Query('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get('org/:orgId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findByOrganization(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.usersService.findByOrganization(orgId);
  }
}