import { Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PlatformSettingsService } from '../../platform-settings/platform-settings.service';

@Injectable()
export class MaintenanceModeMiddleware {
  constructor(private readonly platformSettingsService: PlatformSettingsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Always allow CORS preflight
    if (req.method === 'OPTIONS') return next();

    const url = req.originalUrl || req.url || '';

    // Always-allowed paths (must work even during maintenance)
    const allowList = [
      /^\/api\/health(\/|$)/,
      /^\/api\/maintenance(\/|$)/,
      /^\/api\/auth(\/|$)/,
      /^\/api\/webhooks(\/|$)/,
      /^\/api\/static-translations\/public(\/|$)/,
      /^\/api\/static-translations\/admin\/full-sync(\/|$)/,
      /^\/api\/docs(\/|$)/,
    ];

    if (allowList.some((re) => re.test(url))) return next();

    // Admin bypass (role is populated by RoleContextMiddleware)
    const role = (req as any)?.context?.role;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return next();

    try {
      const { enabled, message } = await this.platformSettingsService.getMaintenanceMode();
      if (!enabled) return next();

      res.setHeader('Retry-After', '60');
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: message || 'System is under maintenance',
      });
    } catch {
      // If we cannot determine maintenance mode, fail open to avoid taking the API down accidentally.
      return next();
    }
  }
}

