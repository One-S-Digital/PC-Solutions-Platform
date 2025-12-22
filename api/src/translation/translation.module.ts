import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TranslationQueueModule } from './translation-queue.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TranslationQueueModule.register(),
  ],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {
  
}