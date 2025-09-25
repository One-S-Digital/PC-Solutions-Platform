import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class CompatController {
  constructor(private prisma: PrismaService) {}

  @Get('products')
  async getProducts() {
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, message: 'OK', data: products, timestamp: new Date().toISOString() };
  }

  @Get('services')
  async getServices() {
    const services = await this.prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, message: 'OK', data: services, timestamp: new Date().toISOString() };
  }

  @Get('job-listings')
  async getJobListings() {
    const jobs = await this.prisma.jobListing.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, message: 'OK', data: jobs, timestamp: new Date().toISOString() };
  }

  @Get('orders')
  async getOrders() {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, message: 'OK', data: orders, timestamp: new Date().toISOString() };
  }

  @Get('order-requests')
  async getOrderRequests() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('candidates')
  async getCandidates() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('policy-documents')
  async getPolicyDocuments() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('policy-alerts')
  async getPolicyAlerts() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }
}

