import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { CsvProcessingService } from './csv-processing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, UploadModule, AuthModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, CsvProcessingService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}