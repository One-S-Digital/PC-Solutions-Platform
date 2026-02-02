import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get(':kind')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PRODUCT_SUPPLIER,
    UserRole.SERVICE_PROVIDER,
    UserRole.FOUNDATION,
    UserRole.EDUCATOR,
    UserRole.PARENT,
  )
  async getCategories(@Param('kind') kind: string) {
    const values = await this.categories.getCategories(kind);
    return { success: true, data: values };
  }

  @Post(':kind')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PRODUCT_SUPPLIER,
    UserRole.SERVICE_PROVIDER,
  )
  async addCategory(@Param('kind') kind: string, @Body() body: CreateCategoryDto) {
    const values = await this.categories.addCategory(kind, body.name);
    return { success: true, data: values };
  }
}

