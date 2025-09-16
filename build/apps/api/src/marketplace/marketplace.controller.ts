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
  Request,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateCatalogDto, UpdateCatalogDto } from './dto/create-catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@repo/types';

@Controller('marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // Product endpoints
  @Post('products')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createProduct(@Body() createProductDto: CreateProductDto, @Request() req) {
    const supplierId = req.user.organizationId;
    return this.marketplaceService.createProduct(createProductDto, supplierId);
  }

  @Get('products')
  findAllProducts(
    @Query('category') category?: string,
    @Query('supplierId') supplierId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.marketplaceService.findAllProducts({
      category,
      supplierId,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('products/:id')
  findProductById(@Param('id') id: string) {
    return this.marketplaceService.findProductById(id);
  }

  @Patch('products/:id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.marketplaceService.updateProduct(id, updateProductDto);
  }

  @Delete('products/:id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteProduct(@Param('id') id: string) {
    return this.marketplaceService.deleteProduct(id);
  }

  // Service endpoints
  @Post('services')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createService(@Body() createServiceDto: CreateServiceDto, @Request() req) {
    const providerId = req.user.serviceProviderId;
    return this.marketplaceService.createService(createServiceDto, providerId);
  }

  @Get('services')
  findAllServices(
    @Query('category') category?: string,
    @Query('providerId') providerId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.marketplaceService.findAllServices({
      category,
      providerId,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('services/:id')
  findServiceById(@Param('id') id: string) {
    return this.marketplaceService.findServiceById(id);
  }

  @Patch('services/:id')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateService(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.marketplaceService.updateService(id, updateServiceDto);
  }

  @Delete('services/:id')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteService(@Param('id') id: string) {
    return this.marketplaceService.deleteService(id);
  }

  // Order endpoints
  @Post('orders')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    const organizationId = req.user.organizationId;
    return this.marketplaceService.createOrder(createOrderDto, organizationId);
  }

  @Get('orders')
  findAllOrders(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.marketplaceService.findAllOrders(organizationId);
  }

  @Get('orders/:id')
  findOrderById(@Param('id') id: string) {
    return this.marketplaceService.findOrderById(id);
  }

  @Patch('orders/:id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.marketplaceService.updateOrderStatus(id, status);
  }

  // Service Request endpoints
  @Post('service-requests')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createServiceRequest(
    @Request() req,
    @Body('serviceId') serviceId: string,
    @Body('description') description?: string,
    @Body('scheduledAt') scheduledAt?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.marketplaceService.createServiceRequest(
      organizationId,
      serviceId,
      description,
      scheduledAt ? new Date(scheduledAt) : undefined,
    );
  }

  @Get('service-requests')
  findAllServiceRequests(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.marketplaceService.findAllServiceRequests(organizationId);
  }

  @Patch('service-requests/:id/status')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateServiceRequestStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.marketplaceService.updateServiceRequestStatus(id, status);
  }

  // Catalog endpoints
  @Post('catalogs')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createCatalog(@Body() createCatalogDto: CreateCatalogDto, @Request() req) {
    const supplierId = req.user.organizationId;
    return this.marketplaceService.createCatalog(createCatalogDto, supplierId);
  }

  @Get('catalogs')
  findAllCatalogs(
    @Query('supplierId') supplierId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.marketplaceService.findAllCatalogs({
      supplierId,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('catalogs/:id')
  findCatalogById(@Param('id') id: string) {
    return this.marketplaceService.findCatalogById(id);
  }

  @Patch('catalogs/:id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateCatalog(@Param('id') id: string, @Body() updateCatalogDto: UpdateCatalogDto, @Request() req) {
    const supplierId = req.user.organizationId;
    return this.marketplaceService.updateCatalog(id, updateCatalogDto, supplierId);
  }

  @Delete('catalogs/:id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteCatalog(@Param('id') id: string, @Request() req) {
    const supplierId = req.user.organizationId;
    return this.marketplaceService.deleteCatalog(id, supplierId);
  }

  @Patch('catalogs/:id/assets')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  associateCatalogAssets(
    @Param('id') id: string,
    @Request() req,
    @Body('pdfAssetId') pdfAssetId?: string,
    @Body('csvAssetId') csvAssetId?: string,
  ) {
    const supplierId = req.user.organizationId;
    return this.marketplaceService.associateCatalogAssets(id, pdfAssetId, csvAssetId, supplierId);
  }

  @Post('catalogs/:id/process-csv')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  processCsvCatalog(
    @Param('id') id: string,
    @Body('csvAssetId') csvAssetId: string,
    @Request() req,
  ) {
    const supplierId = req.user.organizationId;
    return this.marketplaceService.processCsvCatalog(csvAssetId, id, supplierId);
  }

  @Get('catalogs/csv-template')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getCsvTemplate() {
    return {
      template: this.marketplaceService.getCsvTemplate(),
      instructions: [
        'Download this CSV template',
        'Fill in your product information',
        'Upload the CSV file as a catalog asset',
        'Process the CSV to create products automatically',
      ],
    };
  }

  // Analytics endpoints
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getMarketplaceStats() {
    return this.marketplaceService.getMarketplaceStats();
  }
}