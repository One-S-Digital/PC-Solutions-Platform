import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BuildInfoMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    const buildCommit =
      process.env.RENDER_GIT_COMMIT ||
      process.env.SOURCE_VERSION ||
      process.env.GIT_SHA ||
      process.env.BUILD_COMMIT;

    if (buildCommit) {
      res.setHeader('x-build-commit', buildCommit);
    }

    next();
  }
}

