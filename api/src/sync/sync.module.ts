import { Module } from '@nestjs/common';
import { OutboxWorker } from './outbox.worker';
import { ReconcileService } from './reconcile.service';
import { RoleSyncService } from './role-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [OutboxWorker, ReconcileService, RoleSyncService],
  exports: [RoleSyncService],
})
export class SyncModule {}