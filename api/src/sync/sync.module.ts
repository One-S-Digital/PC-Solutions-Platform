import { Module } from '@nestjs/common';
import { OutboxWorker } from './outbox.worker';
import { ReconcileService } from './reconcile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [OutboxWorker, ReconcileService],
})
export class SyncModule {}