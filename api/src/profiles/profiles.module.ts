import { Module } from '@nestjs/common';
import { ProfileController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PrincipalModule } from '../principal/principal.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, PrincipalModule],
  controllers: [ProfileController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}