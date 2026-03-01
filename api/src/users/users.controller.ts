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
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { BulkInviteDto } from './dto/bulk-invite.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AssignUserOrganizationDto } from './dto/assign-user-organization.dto';
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
    const maskedEmail = dto.email ? `${dto.email.substring(0, 3)}***@${dto.email.split('@')[1] || '***'}` : '***';
    let invitation: any;
    try {
      invitation = await (this.clerk as any).invitations.createInvitation({
        emailAddress: dto.email,
        redirectUrl: dto.redirectUrl,
        publicMetadata: { role: dto.role },
      });
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const code = error?.errors?.[0]?.code ?? error?.code;
      const message = error?.message ?? error?.errors?.[0]?.message ?? 'Unknown Clerk error';

      this.logger.error('Failed to create Clerk invitation', {
        maskedEmail,
        role: dto.role,
        status,
        code,
        message,
        errors: error?.errors,
      });

      // Common cases: already invited / duplicate, validation, rate limiting
      if (status === 429 || code === 'rate_limited') {
        throw new BadRequestException('Invitation rate limit exceeded. Please try again later.');
      }

      if (status === 422 || code === 'duplicate_record' || code === 'form_identifier_exists') {
        throw new BadRequestException('An invitation has already been sent to this email');
      }

      if (status >= 400 && status < 500) {
        throw new BadRequestException('Failed to send invitation. Please check the email and try again.');
      }

      throw new InternalServerErrorException('Failed to send invitation. Please try again later.');
    }

    return {
      success: true,
      message: 'Invitation created successfully',
      data: invitation,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * List pending Clerk invitations.
   * Returns up to 100 invitations with email, role, and sent date.
   */
  @Get('invitations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async listInvitations(@Query('status') status = 'pending') {
    if (!this.clerk) {
      throw new BadRequestException('Clerk is not configured on the API');
    }
    try {
      const result = await (this.clerk as any).invitations.getInvitationList({
        status,
        limit: 100,
      });
      const items: any[] = result?.data ?? result ?? [];
      return {
        success: true,
        data: items.map((inv: any) => ({
          id: inv.id,
          emailAddress: inv.emailAddress,
          role: inv.publicMetadata?.role ?? null,
          status: inv.status,
          createdAt: inv.createdAt,
        })),
      };
    } catch (error: any) {
      this.logger.error('Failed to list Clerk invitations', error?.message);
      throw new InternalServerErrorException('Failed to list invitations');
    }
  }

  /**
   * Resend a pending invitation by revoking the old one and creating a new one.
   * Preserves the original email and role from the existing invitation.
   */
  @Post('invitations/:id/resend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async resendInvitation(@Param('id') invitationId: string, @Request() request) {
    if (!this.clerk) {
      throw new BadRequestException('Clerk is not configured on the API');
    }

    // Fetch invitation list to get full details
    let existing: any;
    try {
      const result = await (this.clerk as any).invitations.getInvitationList({
        status: 'pending',
        limit: 500,
      });
      const items: any[] = result?.data ?? result ?? [];
      existing = items.find((inv: any) => inv.id === invitationId);
    } catch (err: any) {
      this.logger.error('Failed to fetch invitation for resend', err?.message);
      throw new InternalServerErrorException('Failed to fetch invitation details');
    }

    if (!existing) {
      throw new BadRequestException('Invitation not found or already accepted/revoked');
    }

    const callerRole = (request.context?.role || request.user?.role) as UserRole | undefined;
    const invitedRole = existing.publicMetadata?.role as UserRole | undefined;
    if (callerRole === UserRole.ADMIN && invitedRole === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can resend SUPER_ADMIN invitations');
    }

    // Revoke the old invitation
    try {
      await (this.clerk as any).invitations.revokeInvitation(invitationId);
    } catch (err: any) {
      this.logger.warn('Failed to revoke old invitation before resend', err?.message);
    }

    // Create new invitation with same details (preserve original redirect URL if present)
    const newInvitation = await (this.clerk as any).invitations.createInvitation({
      emailAddress: existing.emailAddress,
      ...(existing.redirectUrl ? { redirectUrl: existing.redirectUrl } : {}),
      publicMetadata: existing.publicMetadata ?? {},
    });

    return {
      success: true,
      message: 'Invitation resent successfully',
      data: newInvitation,
    };
  }

  /**
   * Bulk invite users by email and pre-assign roles.
   * Accepts up to 50 invitations per request. Each entry is processed independently;
   * partial failures are returned in the response rather than aborting the batch.
   */
  @Post('invite/bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async bulkInviteUsers(@Body() dto: BulkInviteDto, @Request() request) {
    if (!this.clerk) {
      throw new BadRequestException('Clerk is not configured on the API');
    }

    const callerRole = (request.context?.role || request.user?.role) as UserRole | undefined;

    const settled = await Promise.allSettled(
      dto.invitations.map(async (inv) => {
        if (callerRole === UserRole.ADMIN && inv.role === UserRole.SUPER_ADMIN) {
          return { email: inv.email, success: false, error: 'Only SUPER_ADMIN can create SUPER_ADMIN users' };
        }
        try {
          const invitation = await (this.clerk as any).invitations.createInvitation({
            emailAddress: inv.email,
            redirectUrl: inv.redirectUrl,
            publicMetadata: { role: inv.role },
          });
          return { email: inv.email, success: true, invitationId: invitation.id };
        } catch (error: any) {
          const code = error?.errors?.[0]?.code ?? error?.code;
          const message =
            code === 'duplicate_record' || code === 'form_identifier_exists'
              ? 'Invitation already sent to this email'
              : (error?.message ?? 'Failed to send invitation');
          return { email: inv.email, success: false, error: message };
        }
      }),
    );

    const results = settled.map((r) =>
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message ?? 'Unexpected error' },
    );
    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.length - successCount;

    return {
      success: true,
      message: `${successCount} invitation(s) sent${failCount > 0 ? `, ${failCount} failed` : ''}`,
      data: results,
    };
  }

  /**
   * Directly create a user account in Clerk and the database.
   * The email is pre-verified; the account is usable immediately without the user
   * clicking a confirmation link. Restricted to SUPER_ADMIN only.
   */
  @Post('admin-create')
  @Roles(UserRole.SUPER_ADMIN)
  async adminCreateUser(@Body() dto: AdminCreateUserDto, @Request() request) {
    const result = await this.usersService.adminCreateUser(dto, this.getChangedBy(request));
    return { success: true, data: result };
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
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
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
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hard') hard?: string,
    @Query('force') force?: string,
  ) {
    if ((hard || '').toLowerCase() === 'true') {
      return this.usersService.hardRemove(id, { force: (force || '').toLowerCase() === 'true' });
    }
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

  @Get(':id/organizations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getUserOrganizations(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.getUserOrganizations(id);
    return { success: true, data };
  }

  @Post(':id/organizations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async assignUserToOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignUserOrganizationDto,
  ) {
    await this.usersService.assignUserToOrganization(id, dto);
    return { success: true };
  }

  @Delete(':id/organizations/:orgId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async removeUserFromOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ) {
    await this.usersService.removeUserFromOrganization(id, orgId);
    return { success: true };
  }
}
