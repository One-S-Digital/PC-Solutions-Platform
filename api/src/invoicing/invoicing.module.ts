/**
 * Invoicing Module
 *
 * Swiss QR-Bill compliant invoicing system module.
 * Provides settings management, bank accounts, and document numbering.
 */

import { Module } from '@nestjs/common';
import { InvoicingSettingsController } from './invoicing-settings.controller';
import { InvoicingSettingsService } from './invoicing-settings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InvoicingSettingsController],
  providers: [InvoicingSettingsService],
  exports: [InvoicingSettingsService],
})
export class InvoicingModule {}
