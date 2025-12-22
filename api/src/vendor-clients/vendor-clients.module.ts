import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorClientsController } from './vendor-clients.controller';
import { VendorClientsService } from './vendor-clients.service';

@Module({
  imports: [PrismaModule],
  controllers: [VendorClientsController],
  providers: [VendorClientsService],
  exports: [VendorClientsService],
})
export class VendorClientsModule {}

