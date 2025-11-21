import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TranslationQueueModule } from './translation-queue.module';
import { BullModule } from '@nestjs/bull';
import { TranslationQueueProcessor } from './translation-queue.processor';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TranslationQueueModule, 
     BullModule.registerQueue({
      name: 'translations', }),
  ],
  controllers: [TranslationController],
  providers: [TranslationService,TranslationQueueProcessor],
  exports: [TranslationService],
})
export class TranslationModule {
  
}