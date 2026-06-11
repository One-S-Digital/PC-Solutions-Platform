import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@workspace/types';
import { FeatureFlagService } from './feature-flag.service';
import { wrapResponse } from '../common/utils/response.util';

/**
 * User-facing feature flag evaluation. The frontend calls GET /feature-flags/me
 * once per session to decide flag-gated experiences (e.g. v2_assistant_dashboard
 * routing Foundation users to the assistant workspace).
 *
 * Admin CRUD for flags lives in SubscriptionManagementController.
 */
@Controller('feature-flags')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class FeatureFlagsController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get('me')
  @Roles(
    UserRole.FOUNDATION,
    UserRole.EDUCATOR,
    UserRole.PARENT,
    UserRole.PRODUCT_SUPPLIER,
    UserRole.SERVICE_PROVIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async getMyFeatureFlags(@Request() req: any) {
    const userId: string = req.context?.profileUserId ?? req.user?.id ?? '';
    const userRole = (req.context?.role ?? req.user?.role) as string | undefined;
    const organizationId: string | undefined =
      req.context?.organizationId ?? req.user?.organizationId;

    const userFlags = await this.featureFlagService.getUserFeatureFlags(userId, {
      userRole,
      organizationId,
    });

    const flags: Record<string, boolean> = {};
    for (const flag of userFlags) {
      flags[flag.key] = flag.hasAccess;
    }

    return wrapResponse({ flags });
  }
}
