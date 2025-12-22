import { BadRequestException, Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VendorClientReason, UserRole } from '@prisma/client';
import { wrapResponse } from '../common/utils/response.util';
import { VendorClientsService } from './vendor-clients.service';
import { UpsertVendorClientDto } from './dto/vendor-client.dto';

@Controller('admin/vendor-clients')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class VendorClientsController {
  constructor(private readonly vendorClientsService: VendorClientsService) {}

  @Get()
  async list(
    @Query('vendorId') vendorId?: string,
    @Query('orgId') orgId?: string,
    @Query('isActive') isActive?: string,
    @Query('reason') reason?: VendorClientReason,
  ) {
    const parsedIsActive = isActive === undefined ? undefined : isActive === 'true';
    const data = await this.vendorClientsService.list({
      vendorId,
      orgId,
      isActive: parsedIsActive,
      reason,
    });
    return wrapResponse(data);
  }

  @Post()
  async upsert(@Body() body: UpsertVendorClientDto, @Request() req: any) {
    const markedByUserId = req.context?.profileUserId || req.user?.id;
    if (!markedByUserId) {
      throw new BadRequestException('Missing profile user id in request context');
    }
    const data = await this.vendorClientsService.upsert({
      ...body,
      markedByUserId,
    });
    return wrapResponse(data, 'Vendor client updated');
  }
}

