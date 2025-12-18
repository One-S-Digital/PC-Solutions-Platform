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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AllowPending } from '../auth/decorators/allow-pending.decorator';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/clerk-sdk-node';

@Controller('users')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  private clerk: any;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (clerkSecretKey) {
      this.clerk = createClerkClient({ secretKey: clerkSecretKey });
    }
  }

  /**
   * Extract the changedBy identifier from a request object.
   * Used for audit trail when modifying user roles.
   */
  private getChangedBy(request: any): string {
    return request.user?.clerkId || request.context?.clerkUserId || 'system';
  }

  @Post('complete-profile')
  @AllowPending()  // Allow pending users (those whose webhook hasn't processed yet) to complete profile
  async completeProfile(@Request() request, @Body() completeProfileDto: CompleteProfileDto) {
    const clerkId = request.user.clerkId;
    // Get email from DTO (preferred) or fall back to request.user.email
    // For pending users, request.user.email may be undefined, so DTO email is essential
    const email = completeProfileDto.email || request.user?.email;
    
    if (!email) {
      throw new BadRequestException('Email is required to complete profile');
    }
    
    return this.usersService.completeProfile(clerkId, email, completeProfileDto);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Invite a user by email and pre-assign a role.
   *
   * Permission rules:
   * - SUPER_ADMIN can invite users with ANY role (including SUPER_ADMIN).
   * - ADMIN can invite users with any role EXCEPT SUPER_ADMIN.
   *
   * Note: This creates a Clerk invitation; the user will appear in the DB after signup + webhook processing.
   */
  @Post('invite')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async inviteUser(@Body() dto: InviteUserDto, @Request() request) {
    const callerRole = (request.context?.role || request.user?.role) as UserRole | undefined;

    if (callerRole === UserRole.ADMIN && dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can create SUPER_ADMIN users');
    }

    if (!this.clerk) {
      throw new BadRequestException('Clerk is not configured on the API');
    }

    // Clerk SDK (v5) invitation API.
    // We keep types loose here to avoid coupling to SDK internals.
    const invitation = await (this.clerk as any).invitations.createInvitation({
      emailAddress: dto.email,
      redirectUrl: dto.redirectUrl,
      publicMetadata: { role: dto.role },
    });

    return {
      success: true,
      message: 'Invitation created successfully',
      data: invitation,
      timestamp: new Date().toISOString(),
    };
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
    const clerkId = request.user.clerkId;
    let user = await this.usersService.findByClerkId(clerkId);
    
    // Check if we need to handle admin role sync from Clerk
    // This handles two cases:
    // 1. User doesn't exist in DB but has admin role in Clerk -> auto-create
    // 2. User exists in DB with wrong role but has admin role in Clerk -> auto-update
    if (this.clerk) {
      try {
        const clerkUser = await this.clerk.users.getUser(clerkId);
        const clerkRole = clerkUser.publicMetadata?.role as string;
        
        // Check if user has ADMIN or SUPER_ADMIN role in Clerk's publicMetadata
        if (clerkRole === UserRole.ADMIN || clerkRole === UserRole.SUPER_ADMIN) {
          
          if (!user) {
            // Case 1: User doesn't exist - auto-create admin user
            this.logger.log(`🔐 [AUTO-CREATE ADMIN] Detected admin user ${clerkId} with role ${clerkRole} in Clerk publicMetadata. Auto-creating...`);
            
            const email = clerkUser.emailAddresses?.[0]?.emailAddress || `${clerkId}@admin.local`;
            const firstName = clerkUser.firstName || 'Admin';
            const lastName = clerkUser.lastName || 'User';
            
            // Use completeProfile to create the user with admin role
            user = await this.usersService.completeProfile(clerkId, email, {
              role: clerkRole as UserRole,
              contactPerson: `${firstName} ${lastName}`.trim(),
            });
            
            this.logger.log(`✅ [AUTO-CREATE ADMIN] Successfully created admin user ${clerkId} with role ${clerkRole}`);
            
            // Fetch the full user data
            user = await this.usersService.findByClerkId(clerkId);
            
            if (user) {
              return {
                success: true,
                data: user,
              };
            }
          } else if (user.role !== clerkRole) {
            // Case 2: User exists but role doesn't match Clerk - sync the role
            this.logger.log(`🔄 [ADMIN ROLE SYNC] User ${clerkId} exists with role ${user.role} but Clerk has ${clerkRole}. Syncing...`);
            
            try {
              // Update the user's role to match Clerk
              await this.usersService.updateRoleByClerkId(clerkId, clerkRole as UserRole, 'system', 'Admin role sync from Clerk publicMetadata');
              
              // Refetch the user with updated role
              user = await this.usersService.findByClerkId(clerkId);
              
              this.logger.log(`✅ [ADMIN ROLE SYNC] Successfully synced role for user ${clerkId} to ${clerkRole}`);
              
              if (user) {
                return {
                  success: true,
                  data: user,
                };
              }
            } catch (syncError) {
              this.logger.warn(`⚠️ [ADMIN ROLE SYNC] Failed to sync role: ${syncError.message}`);
              // Continue with existing user if sync fails
            }
          }
        }
      } catch (error) {
        this.logger.warn(`⚠️ [AUTO-CREATE ADMIN] Failed to check/create admin user: ${error.message}`);
        // Continue to return pending response if auto-creation fails
      }
    }
    
    if (!user) {
      // User doesn't exist yet (webhook hasn't processed) and not an admin
      // Return a temporary response indicating the user is being processed
      return {
        success: true,
        data: {
          id: 'pending',
          clerkId: clerkId,
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() request,
  ) {
    const callerRole = request.context?.role || request.user?.role;
    return this.usersService.update(id, updateUserDto, this.getChangedBy(request), callerRole);
  }

  /**
   * Elevate a user to an admin role (ADMIN or SUPER_ADMIN).
   * Only SUPER_ADMIN can perform this action.
   * This endpoint ensures proper audit trail and syncs with Clerk.
   */
  @Post(':id/elevate-to-admin')
  @Roles(UserRole.SUPER_ADMIN)
  async elevateToAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { targetRole: UserRole; reason?: string },
    @Request() request,
  ) {
    this.logger.log(`🔺 [ELEVATE] Super admin ${this.getChangedBy(request)} elevating user ${id} to ${body.targetRole}`);
    
    const result = await this.usersService.elevateToAdmin(
      id,
      body.targetRole,
      this.getChangedBy(request),
      body.reason,
    );
    
    return {
      success: true,
      message: `User elevated to ${body.targetRole} successfully`,
      data: result,
    };
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
    @Request() request,
  ) {
    return this.usersService.assignRole(id, role, this.getChangedBy(request));
  }

  @Delete(':id/roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: UserRole,
    @Request() request,
  ) {
    return this.usersService.removeRole(id, role, this.getChangedBy(request));
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