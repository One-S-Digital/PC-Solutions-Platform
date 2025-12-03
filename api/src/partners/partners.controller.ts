import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto, PartnerQueryDto } from './dto/partners.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  // Admin endpoints (protected)
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createPartnerDto: CreatePartnerDto) {
    return this.partnersService.create(createPartnerDto);
  }

  // Public endpoint for frontend to get active partners
  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('search') search?: string,
  ) {
    const query: PartnerQueryDto = {};
    
    if (type) {
      query.type = type as any;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }
    if (search) {
      query.search = search;
    }

    return this.partnersService.findAll(query);
  }

  // Public endpoint for active partners only
  @Get('active')
  findActive() {
    return this.partnersService.findActive();
  }

  // Public endpoint for featured partners
  @Get('featured')
  findFeatured() {
    return this.partnersService.findFeatured();
  }

  // Admin endpoint for statistics
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.partnersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updatePartnerDto: UpdatePartnerDto) {
    return this.partnersService.update(id, updatePartnerDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.partnersService.remove(id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.partnersService.toggleActive(id);
  }

  @Patch(':id/toggle-featured')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  toggleFeatured(@Param('id') id: string) {
    return this.partnersService.toggleFeatured(id);
  }

  @Patch(':id/display-order')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateDisplayOrder(
    @Param('id') id: string,
    @Body('displayOrder') displayOrder: number,
  ) {
    return this.partnersService.updateDisplayOrder(id, displayOrder);
  }
}
