import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrincipalService } from './principal.service';

@Injectable()
export class EnsureProfileInterceptor implements NestInterceptor {
  private readonly logger = new Logger(EnsureProfileInterceptor.name);

  constructor(private readonly principal: PrincipalService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    // Skip OPTIONS requests (CORS preflight) - they don't have auth headers
    if (req.method === 'OPTIONS') {
      return next.handle();
    }

    const clerkUserId: string | undefined = req?.context?.clerkUserId ?? req?.context?.userId ?? req?.user?.clerkId;

    if (!clerkUserId) {
      this.logger.error('EnsureProfileInterceptor: missing clerkUserId in request context', {
        path: req?.url,
        hasContext: !!req?.context,
      });
      throw new UnauthorizedException('Missing user authentication');
    }

    const { appUser, user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId);

    req.context = {
      ...(req.context ?? {}),
      accountId: appUser.id,
      profileId: user.id,
      clerkUserId: appUser.clerkId,
      userId: appUser.clerkId,
      role: user.role,
    };

    req.user = {
      ...(req.user ?? {}),
      id: appUser.id,
      clerkId: appUser.clerkId,
      role: user.role,
      isPending: false,
    };

    return next.handle();
  }
}
