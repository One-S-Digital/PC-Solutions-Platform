import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateCatalogDto, UpdateCatalogDto } from './dto/create-catalog.dto';
import { CsvProcessingService } from './csv-processing.service';

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private csvProcessingService: CsvProcessingService,
  ) {}

  // Product Management
  async createProduct(createProductDto: CreateProductDto, supplierId: string) {
    return this.prisma.product.create({
      data: {
        ...createProductDto,
        supplierId,
      },
      include: {
        supplier: true,
        imageAsset: true,
      },
    });
  }

  async findAllProducts(filters?: {
    category?: string;
    supplierId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        supplier: true,
        imageAsset: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProductById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        imageAsset: true,
        orders: {
          include: {
            order: true,
          },
        },
      },
    });
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        supplier: true,
        imageAsset: true,
      },
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Service Management
  async createService(createServiceDto: CreateServiceDto, providerId: string) {
    return this.prisma.service.create({
      data: {
        ...createServiceDto,
        providerId,
      },
      include: {
        provider: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async findAllServices(filters?: {
    category?: string;
    providerId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.providerId) {
      where.providerId = filters.providerId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.service.findMany({
      where,
      include: {
        provider: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findServiceById(id: string) {
    return this.prisma.service.findUnique({
      where: { id },
      include: {
        provider: {
          include: {
            organization: true,
          },
        },
        requests: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async updateService(id: string, updateServiceDto: UpdateServiceDto) {
    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
      include: {
        provider: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async deleteService(id: string) {
    return this.prisma.service.delete({
      where: { id },
    });
  }

  // Order Management
  async createOrder(createOrderDto: CreateOrderDto, organizationId: string) {
    const { items, ...orderData } = createOrderDto;

    // Calculate total amount
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: items.map(item => item.productId) },
      },
    });

    const totalAmount = items.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);

    return this.prisma.order.create({
      data: {
        ...orderData,
        organizationId,
        totalAmount,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: products.find(p => p.id === item.productId)?.price || 0,
          })),
        },
      },
      include: {
        organization: true,
        items: {
          include: {
            product: {
              include: {
                supplier: true,
                imageAsset: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllOrders(organizationId?: string) {
    const where = organizationId ? { organizationId } : {};

    return this.prisma.order.findMany({
      where,
      include: {
        organization: true,
        items: {
          include: {
            product: {
              include: {
                supplier: true,
                imageAsset: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOrderById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        organization: true,
        items: {
          include: {
            product: {
              include: {
                supplier: true,
                imageAsset: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        organization: true,
        items: {
          include: {
            product: {
              include: {
                supplier: true,
                imageAsset: true,
              },
            },
          },
        },
      },
    });
  }

  // Service Request Management
  async createServiceRequest(
    organizationId: string,
    serviceId: string,
    description?: string,
    scheduledAt?: Date,
  ) {
    return this.prisma.serviceRequest.create({
      data: {
        organizationId,
        serviceId,
        description,
        scheduledAt,
      },
      include: {
        organization: true,
        service: {
          include: {
            provider: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllServiceRequests(organizationId?: string) {
    const where = organizationId ? { organizationId } : {};

    return this.prisma.serviceRequest.findMany({
      where,
      include: {
        organization: true,
        service: {
          include: {
            provider: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateServiceRequestStatus(id: string, status: string) {
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status },
      include: {
        organization: true,
        service: {
          include: {
            provider: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });
  }

  // Catalog Management
  async createCatalog(createCatalogDto: CreateCatalogDto, supplierId: string) {
    return this.prisma.catalog.create({
      data: {
        ...createCatalogDto,
        supplierId,
      },
      include: {
        supplier: true,
        pdfAsset: true,
        csvAsset: true,
      },
    });
  }

  async findAllCatalogs(filters?: {
    supplierId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.catalog.findMany({
      where,
      include: {
        supplier: true,
        pdfAsset: true,
        csvAsset: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCatalogById(id: string) {
    return this.prisma.catalog.findUnique({
      where: { id },
      include: {
        supplier: true,
        pdfAsset: true,
        csvAsset: true,
      },
    });
  }

  async updateCatalog(id: string, updateCatalogDto: UpdateCatalogDto, supplierId: string) {
    // Verify ownership first
    const catalog = await this.prisma.catalog.findFirst({
      where: { id, supplierId },
    });

    if (!catalog) {
      throw new Error('Catalog not found or access denied');
    }

    return this.prisma.catalog.update({
      where: { id },
      data: updateCatalogDto,
      include: {
        supplier: true,
        pdfAsset: true,
        csvAsset: true,
      },
    });
  }

  async deleteCatalog(id: string, supplierId: string) {
    // Verify ownership first
    const catalog = await this.prisma.catalog.findFirst({
      where: { id, supplierId },
    });

    if (!catalog) {
      throw new Error('Catalog not found or access denied');
    }

    return this.prisma.catalog.delete({
      where: { id },
    });
  }

  async associateCatalogAssets(
    catalogId: string,
    pdfAssetId?: string,
    csvAssetId?: string,
    supplierId?: string,
  ) {
    // Verify ownership first
    const catalog = await this.prisma.catalog.findFirst({
      where: { id: catalogId, supplierId },
    });

    if (!catalog) {
      throw new Error('Catalog not found or access denied');
    }

    const updateData: any = {};
    
    if (pdfAssetId) {
      updateData.pdfAssetId = pdfAssetId;
    }
    
    if (csvAssetId) {
      updateData.csvAssetId = csvAssetId;
    }

    return this.prisma.catalog.update({
      where: { id: catalogId },
      data: updateData,
      include: {
        supplier: true,
        pdfAsset: true,
        csvAsset: true,
      },
    });
  }

  // CSV Processing
  async processCsvCatalog(csvAssetId: string, catalogId: string, supplierId: string) {
    return this.csvProcessingService.processCsvCatalog(csvAssetId, catalogId, supplierId);
  }

  // Get CSV template for suppliers
  getCsvTemplate() {
    return this.csvProcessingService.getCsvTemplate();
  }

  // Analytics
  async getMarketplaceStats() {
    const [
      totalProducts,
      totalServices,
      totalOrders,
      totalServiceRequests,
      totalCatalogs,
      activeSuppliers,
      activeServiceProviders,
    ] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.service.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.serviceRequest.count(),
      this.prisma.catalog.count({ where: { isActive: true } }),
      this.prisma.organization.count({
        where: { type: 'PRODUCT_SUPPLIER' },
      }),
      this.prisma.organization.count({
        where: { type: 'SERVICE_PROVIDER' },
      }),
    ]);

    return {
      totalProducts,
      totalServices,
      totalOrders,
      totalServiceRequests,
      totalCatalogs,
      activeSuppliers,
      activeServiceProviders,
    };
  }
}