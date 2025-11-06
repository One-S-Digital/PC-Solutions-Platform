import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrincipalService } from './principal.service';
import { EnsureProfileInterceptor } from './ensure-profile.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [PrincipalService, EnsureProfileInterceptor],
  exports: [PrincipalService, EnsureProfileInterceptor],
})
export class PrincipalModule {}
