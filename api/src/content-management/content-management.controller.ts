import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentManagementService } from './content-management.service';
import { CreateContentItemDto, UpdateContentItemDto, CreateContentCategoryDto } from './dto/content-management.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('content-management')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ContentManagementController {
  constructor(private readonly contentManagementService: ContentManagementService) {}

  @Get('items')
  async getContentItems(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    try {
      const items = await this.contentManagementService.getContentItems({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        category,
        status,
        search,
      });
      return {
        success: true,
        data: items,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch content items',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('items/:id')
  async getContentItem(@Param('id') id: string) {
    try {
      const item = await this.contentManagementService.getContentItem(id);
      return {
        success: true,
        data: item,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch content item',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('items')
  @UseInterceptors(FileInterceptor('file'))
  async createContentItem(
    @Body() createDto: CreateContentItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const item = await this.contentManagementService.createContentItem(createDto, file);
      return {
        success: true,
        data: item,
        message: 'Content item created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create content item',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('items/:id')
  @UseInterceptors(FileInterceptor('file'))
  async updateContentItem(
    @Param('id') id: string,
    @Body() updateDto: UpdateContentItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const item = await this.contentManagementService.updateContentItem(id, updateDto, file);
      return {
        success: true,
        data: item,
        message: 'Content item updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update content item',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('items/:id')
  async deleteContentItem(@Param('id') id: string) {
    try {
      await this.contentManagementService.deleteContentItem(id);
      return {
        success: true,
        message: 'Content item deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete content item',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('categories')
  async getContentCategories() {
    try {
      const categories = await this.contentManagementService.getContentCategories();
      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch content categories',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('categories')
  async createContentCategory(@Body() createDto: CreateContentCategoryDto) {
    try {
      const category = await this.contentManagementService.createContentCategory(createDto);
      return {
        success: true,
        data: category,
        message: 'Content category created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create content category',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('categories/:id')
  async updateContentCategory(
    @Param('id') id: string,
    @Body() updateDto: CreateContentCategoryDto,
  ) {
    try {
      const category = await this.contentManagementService.updateContentCategory(id, updateDto);
      return {
        success: true,
        data: category,
        message: 'Content category updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update content category',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('categories/:id')
  async deleteContentCategory(@Param('id') id: string) {
    try {
      await this.contentManagementService.deleteContentCategory(id);
      return {
        success: true,
        message: 'Content category deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete content category',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard')
  async getContentDashboard() {
    try {
      const dashboard = await this.contentManagementService.getContentDashboard();
      return {
        success: true,
        data: dashboard,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch content dashboard',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('items/:id/publish')
  async publishContentItem(@Param('id') id: string) {
    try {
      const item = await this.contentManagementService.publishContentItem(id);
      return {
        success: true,
        data: item,
        message: 'Content item published successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to publish content item',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('items/:id/archive')
  async archiveContentItem(@Param('id') id: string) {
    try {
      const item = await this.contentManagementService.archiveContentItem(id);
      return {
        success: true,
        data: item,
        message: 'Content item archived successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to archive content item',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}