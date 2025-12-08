import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateCatalogDto, UpdateCatalogDto } from './dto/create-catalog.dto';
import { CsvProcessingService } from './csv-processing.service';
import { Prisma, $Enums } from '@prisma/client';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private csvProcessingService: CsvProcessingService,
    private translationService: TranslationService,
  ) {}

  // Product Management
  async createProduct(createProductDto: CreateProductDto, supplierId: string) {
    const {
      imageAssetId,
      deliveryFees,
      volumePricing,
      variants,
      ...productData
    } = createProductDto;

    const toJsonValue = <T>(value: T | undefined) =>
      value === undefined ? undefined : (value as unknown as Prisma.InputJsonValue);

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        ...(toJsonValue(deliveryFees) !== undefined && {
          deliveryFees: toJsonValue(deliveryFees),
        }),
        ...(toJsonValue(volumePricing) !== undefined && {
          volumePricing: toJsonValue(volumePricing),
        }),
        ...(toJsonValue(variants) !== undefined && {
          variants: toJsonValue(variants),
        }),
        supplier: {
          connect: { id: supplierId },
        },
        ...(imageAssetId
          ? {
              imageAsset: {
                connect: { id: imageAssetId },
              },
            }
          : {}),
      },
      include: {
        supplier: true,
        imageAsset: true,
      },
    });

    // Save translatable fields and trigger translation
    const translatableFields = FIELDS_BY_ENTITY.product || ['title', 'description'];
    const translationPayload: Record<string, any> = {
      title: product.title,
      description: product.description || '',
    };

    if (translationPayload.title || translationPayload.description) {
      await this.translationService.saveEntityWithTranslations(
        'product',
        product.id,
        translationPayload,
        translatableFields,
      );
    }

    return product;
  }

  async findAllProducts(filters?: {
    category?: string;
    supplierId?: string;
    isActive?: boolean;
    search?: string;
    lang?: string;
  }) {
    const where: Prisma.ProductWhereInput = {};
    const andClauses: Prisma.ProductWhereInput[] = [];

    if (filters?.category) {
      andClauses.push({
        OR: [
          { category: filters.category },
          { primaryCategory: filters.category },
          { categories: { has: filters.category } },
        ],
      });
    }

    if (filters?.supplierId) {
      andClauses.push({ supplierId: filters.supplierId });
    }

    if (filters?.isActive !== undefined) {
      andClauses.push({ isActive: filters.isActive });
    }

    if (filters?.search) {
      andClauses.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { vendorSku: { contains: filters.search, mode: 'insensitive' } },
          { tags: { has: filters.search } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        supplier: true,
        imageAsset: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Resolve translations if language is specified
    if (filters?.lang && filters.lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.product || ['title', 'description'];

      const productsWithTranslations = await Promise.all(
        products.map(async (product) => {
          const translatedFields = await this.translationService.resolveEntity(
            'product',
            product.id,
            translatableFields,
            filters.lang!,
          );

          return {
            ...product,
            title: translatedFields.title || product.title,
            description: translatedFields.description || product.description,
          };
        }),
      );

      return productsWithTranslations;
    }

    return products;
  }

  async findProductById(id: string, lang?: string) {
    const product = await this.prisma.product.findUnique({
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

    if (!product) {
      return null;
    }

    if (lang && lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.product || ['title', 'description'];
      const translatedFields = await this.translationService.resolveEntity(
        'product',
        product.id,
        translatableFields,
        lang,
      );

      return {
        ...product,
        title: translatedFields.title || product.title,
        description: translatedFields.description || product.description,
      };
    }

    return product;
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        supplier: true,
        imageAsset: true,
      },
    });

    // Update translations if translatable fields changed
    const translatableFields = FIELDS_BY_ENTITY.product || ['title', 'description'];
    const hasTranslatableChanges =
      updateProductDto.title !== undefined ||
      updateProductDto.description !== undefined;

    if (hasTranslatableChanges) {
      const translationPayload: Record<string, any> = {
        title: product.title,
        description: product.description || '',
      };

      await this.translationService.saveEntityWithTranslations(
        'product',
        product.id,
        translationPayload,
        translatableFields,
      );
    }

    return product;
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Service Management
  async createService(createServiceDto: CreateServiceDto, providerId: string) {
    const service = await this.prisma.service.create({
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

    const translatableFields = FIELDS_BY_ENTITY.service || ['title', 'description'];
    const translationPayload: Record<string, any> = {
      title: service.title,
      description: service.description || '',
    };

    if (translationPayload.title || translationPayload.description) {
      await this.translationService.saveEntityWithTranslations(
        'service',
        service.id,
        translationPayload,
        translatableFields,
      );
    }

    return service;
  }

  async findAllServices(filters?: {
    category?: string;
    providerId?: string;
    isActive?: boolean;
    search?: string;
    lang?: string;
  }) {
    const where: Prisma.ServiceWhereInput = {};
    const andClauses: Prisma.ServiceWhereInput[] = [];

    if (filters?.category) {
      andClauses.push({
    category: filters.category as $Enums.ServiceCategory,});
    }

    if (filters?.providerId) {
      andClauses.push({ providerId: filters.providerId });
    }

    if (filters?.isActive !== undefined) {
      andClauses.push({ isActive: filters.isActive });
    }

    if (filters?.search) {
      andClauses.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const services = await this.prisma.service.findMany({
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

    if (filters?.lang && filters.lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.service || ['title', 'description'];

      const servicesWithTranslations = await Promise.all(
        services.map(async (service) => {
          const translatedFields = await this.translationService.resolveEntity(
            'service',
            service.id,
            translatableFields,
            filters.lang!,
          );

          return {
            ...service,
            title: translatedFields.title || service.title,
            description: translatedFields.description || service.description,
          };
        }),
      );

      return servicesWithTranslations;
    }

    return services;
  }

  async findServiceById(id: string, lang?: string) {
    const service = await this.prisma.service.findUnique({
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

    if (!service) {
      return null;
    }

    if (lang && lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.service || ['title', 'description'];
      const translatedFields = await this.translationService.resolveEntity(
        'service',
        service.id,
        translatableFields,
        lang,
      );

      return {
        ...service,
        title: translatedFields.title || service.title,
        description: translatedFields.description || service.description,
      };
    }

    return service;
  }

  async updateService(id: string, updateServiceDto: UpdateServiceDto) {
    const service = await this.prisma.service.update({
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

    const translatableFields = FIELDS_BY_ENTITY.service || ['title', 'description'];
    const hasTranslatableChanges =
      updateServiceDto.title !== undefined ||
      updateServiceDto.description !== undefined;

    if (hasTranslatableChanges) {
      const translationPayload: Record<string, any> = {
        title: service.title,
        description: service.description || '',
      };

      await this.translationService.saveEntityWithTranslations(
        'service',
        service.id,
        translationPayload,
        translatableFields,
      );
    }

    return service;
  }

  async deleteService(id: string) {
    return this.prisma.service.delete({
      where: { id },
    });
  }

  // Order Management
  async createOrder(createOrderDto: CreateOrderDto, organizationId: string) {
    const { items, ...orderData } = createOrderDto;

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: items.map((item) => item.productId) },
      },
    });

    const totalAmount = items.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);

    return this.prisma.order.create({
      data: {
        ...orderData,
        organizationId,
        totalAmount,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: products.find((p) => p.id === item.productId)?.price || 0,
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

    try {
      const orders = await this.prisma.order.findMany({
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

      // Transform orders to include supplierId and supplierName at the root level
      // These are derived from the first order item's product supplier
      return orders.map((order) => {
        const firstItem = order.items[0];
        const supplier = firstItem?.product?.supplier;

        return {
          ...order,
          // Add supplier info at root level for frontend compatibility
          supplierId: supplier?.id ?? null,
          supplierName: supplier?.name ?? null,
          // Also add foundationOrgId for frontend compatibility (alias for organizationId)
          foundationOrgId: order.organizationId,
          foundationId: order.organizationId,
          // Map requestDate from createdAt for frontend compatibility
          requestDate: order.createdAt.toISOString(),
          // Transform items to match frontend LineItem type
          items: order.items.map((item) => ({
            productId: item.productId,
            productName: item.product?.title ?? 'Unknown Product',
            quantity: item.quantity,
            unitPrice: item.price,
            imageUrl: item.product?.imageAsset?.publicUrl ?? null,
          })),
        };
      });
    } catch (error: unknown) {
      // Handle case where orders table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('Orders table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  async findOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
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

    if (!order) {
      return null;
    }

    // Transform order to include supplierId and supplierName at the root level
    const firstItem = order.items[0];
    const supplier = firstItem?.product?.supplier;

    return {
      ...order,
      supplierId: supplier?.id ?? null,
      supplierName: supplier?.name ?? null,
      foundationOrgId: order.organizationId,
      foundationId: order.organizationId,
      requestDate: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.title ?? 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.price,
        imageUrl: item.product?.imageAsset?.publicUrl ?? null,
      })),
    };
  }

  async updateOrderStatus(id: string, status: string) {
    const order = await this.prisma.order.update({
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

    // Transform order to include supplierId and supplierName at the root level
    const firstItem = order.items[0];
    const supplier = firstItem?.product?.supplier;

    return {
      ...order,
      supplierId: supplier?.id ?? null,
      supplierName: supplier?.name ?? null,
      foundationOrgId: order.organizationId,
      foundationId: order.organizationId,
      requestDate: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.title ?? 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.price,
        imageUrl: item.product?.imageAsset?.publicUrl ?? null,
      })),
    };
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

    try {
      return await this.prisma.serviceRequest.findMany({
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
    } catch (error: unknown) {
      // Handle case where service_requests table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('Service requests table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
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
    const where: Prisma.CatalogWhereInput = {};

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
    // Helper to safely execute queries that might fail due to missing tables
    const safeCount = async (query: Promise<number>): Promise<number> => {
      try {
        return await query;
      } catch (error: unknown) {
        // Handle case where table doesn't exist (P2021)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
          console.warn('Table does not exist, returning 0 for count');
          return 0;
        }
        throw error;
      }
    };

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
      safeCount(this.prisma.order.count()),
      safeCount(this.prisma.serviceRequest.count()),
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
