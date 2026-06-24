import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@workspace/types';
import { FeatureFlagService } from './feature-flag.service';
import { wrapResponse } from '../common/utils/response.util';

/**
 * User-facing feature flag evaluation. The frontend calls GET /feature-flags/me
 * once per session to decide flag-gated experiences.
 *
 * ai_assistant_enabled is driven by the AI_ASSISTANT_ENABLED environment variable
 * (set in Render → Environment) rather than the database, so it can be toggled
 * without a deploy. DB flags are still evaluated for everything else.
 * If AI_ASSISTANT_ENABLED is not set the DB value is used as a fallback.
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

    // AI_ASSISTANT_ENABLED env var overrides the DB for the master kill switch.
    // Set to 'false' in Render → Environment to disable globally. If unset and
    // the DB has no explicit value, the assistant defaults to ON (kill-switch pattern).
    const envOverride = process.env.AI_ASSISTANT_ENABLED;
    if (envOverride !== undefined) {
      flags['ai_assistant_enabled'] = envOverride === 'true' || envOverride === '1';
    } else if (flags['ai_assistant_enabled'] == null) {
      flags['ai_assistant_enabled'] = true;
    }

    return wrapResponse({ flags });
  }
}
