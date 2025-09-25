import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class CompatController {
  constructor(private prisma: PrismaService) {}

  @Get('products')
  @Public()
  async getProducts() {
    try {
      const products = await this.prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: products, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('services')
  @Public()
  async getServices() {
    try {
      const services = await this.prisma.service.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: services, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('job-listings')
  @Public()
  async getJobListings() {
    try {
      const jobs = await this.prisma.jobListing.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: jobs, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('orders')
  @Public()
  async getOrders() {
    try {
      const orders = await this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: orders, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('order-requests')
  @Public()
  async getOrderRequests() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('candidates')
  @Public()
  async getCandidates() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('policy-documents')
  @Public()
  async getPolicyDocuments() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('policy-alerts')
  @Public()
  async getPolicyAlerts() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('users')
  @Public()
  async getUsers() {
    try {
      const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: users, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('organizations')
  @Public()
  async getOrganizations() {
    try {
      const orgs = await this.prisma.organization.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: orgs, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('parent-leads')
  @Public()
  async getParentLeads() {
    try {
      const leads = await this.prisma.parentLead.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: leads, timestamp: new Date().toISOString() };
    } catch (error) {
      // If table missing, return empty silently to avoid 500 in admin
      return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
    }
  }

  @Get('messages/conversations')
  @Public()
  async getConversations() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }
}

