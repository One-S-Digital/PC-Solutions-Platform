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
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AllowPending } from '../auth/decorators/allow-pending.decorator';

@Controller('users')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post('complete-profile')
  async completeProfile(@Request() request, @Body() completeProfileDto: CompleteProfileDto) {
    const clerkId = request.user.clerkId;
    const email = request.user.email;
    
    return this.usersService.completeProfile(clerkId, email, completeProfileDto);
  }

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

  /**
   * Check webhook processing status for the current authenticated user.
   * Used during signup to poll whether the user.created webhook has completed.
   * 
   * Security: Uses authenticated user's clerkId from session, not from URL params.
   * This prevents user enumeration and parameter tampering.
   * 
   * @AllowPending - Accessible to pending users (those whose webhook is still processing)
   */
  @Get('webhook-status')
  @AllowPending()
  async getWebhookStatus(@Request() request) {
    const clerkId = request.user?.clerkId || request.context?.clerkUserId;
    
    if (!clerkId) {
      this.logger.warn(`⚠️ [WEBHOOK-STATUS] No clerkId found in request context`);
      return {
        success: false,
        error: 'Unauthorized - no user session found',
        data: {
          exists: false,
          isPending: true,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    this.logger.log(`🔍 [WEBHOOK-STATUS] Checking status for ClerkId: ${clerkId}`);
    const appUser = await this.usersService.findAppUserByClerkId(clerkId);
    
    if (appUser) {
      this.logger.log(`✅ [WEBHOOK-STATUS] User exists! AppUserId: ${appUser.id}`);
    } else {
      this.logger.log(`⏳ [WEBHOOK-STATUS] User not yet created (still waiting for webhook)`);
    }
    
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