import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SignupLogService } from './signup-log.service';
import { SignupLogController, SignupLogAdminController } from './signup-log.controller';
import { SignupLogScheduler } from './signup-log.scheduler';

/**
 * Global, because the signup trace is written from five modules that have no
 * business depending on each other (webhooks, users, settings, admin, and the
 * sweeper). Making the recorder ambient keeps the instrumentation to a single
 * injected field per call site instead of a web of module imports.
 */
@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SignupLogController, SignupLogAdminController],
  providers: [SignupLogService, SignupLogScheduler],
  exports: [SignupLogService],
})
export class SignupLogModule {}
