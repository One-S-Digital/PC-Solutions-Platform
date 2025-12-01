import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationType } from '@prisma/client';

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
      const orgs = await this.prisma.organization.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
      return { success: true, message: 'OK', data: orgs, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('organizations/:id')
  @Public()
  async getOrganizationById(@Param('id') id: string) {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id } });
      if (!org) {
        return { success: false, message: 'Organization not found', timestamp: new Date().toISOString() };
      }
      return { success: true, message: 'OK', data: org, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Post('organizations')
  @Public()
  async createOrganization(@Body() data: any) {
    try {
      // Map type string to OrganizationType enum
      const orgType = this.mapToOrganizationType(data.type);
      
      const org = await this.prisma.organization.create({
        data: {
          name: data.name,
          type: orgType,
          description: data.description,
          region: data.region,
          phoneNumber: data.phone,
          canton: data.region, // Map region to canton as well
          languages: data.languagesSpoken || [],
          capacity: data.capacity,
          pedagogy: data.pedagogy || [],
          contactPerson: data.contactPerson,
          directOrderLink: data.directOrderLink,
          catalogUrl: data.catalogUrl,
          serviceCategories: data.serviceCategories || [],
          deliveryType: data.deliveryType,
          bookingLink: data.bookingLink,
        },
      });
      return { success: true, message: 'Organization created successfully', data: org, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to create organization', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Put('organizations/:id')
  @Public()
  async updateOrganization(@Param('id') id: string, @Body() data: any) {
    try {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = this.mapToOrganizationType(data.type);
      if (data.description !== undefined) updateData.description = data.description;
      if (data.region !== undefined) {
        updateData.region = data.region;
        updateData.canton = data.region;
      }
      if (data.phone !== undefined) updateData.phoneNumber = data.phone;
      if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
      if (data.languagesSpoken !== undefined) updateData.languages = data.languagesSpoken;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.pedagogy !== undefined) updateData.pedagogy = data.pedagogy;
      if (data.website !== undefined) updateData.catalogUrl = data.website;
      if (data.catalogUrl !== undefined) updateData.catalogUrl = data.catalogUrl;
      if (data.directOrderLink !== undefined) updateData.directOrderLink = data.directOrderLink;
      if (data.serviceCategories !== undefined) updateData.serviceCategories = data.serviceCategories;
      if (data.deliveryType !== undefined) updateData.deliveryType = data.deliveryType;
      if (data.bookingLink !== undefined) updateData.bookingLink = data.bookingLink;

      const org = await this.prisma.organization.update({
        where: { id },
        data: updateData,
      });
      return { success: true, message: 'Organization updated successfully', data: org, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to update organization', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Delete('organizations/:id')
  @Public()
  async deleteOrganization(@Param('id') id: string) {
    try {
      // First check if organization exists
      const org = await this.prisma.organization.findUnique({ where: { id } });
      if (!org) {
        return { success: false, message: 'Organization not found', timestamp: new Date().toISOString() };
      }

      // Delete the organization (cascades should handle related records)
      await this.prisma.organization.delete({ where: { id } });
      return { success: true, message: 'Organization deleted successfully', timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to delete organization', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  private mapToOrganizationType(type: string): OrganizationType {
    switch (type?.toUpperCase()) {
      case 'FOUNDATION':
        return OrganizationType.FOUNDATION;
      case 'SERVICE_PROVIDER':
        return OrganizationType.SERVICE_PROVIDER;
      case 'PRODUCT_SUPPLIER':
        return OrganizationType.PRODUCT_SUPPLIER;
      default:
        console.warn(`Unknown organization type: ${type}, defaulting to FOUNDATION`);
        return OrganizationType.FOUNDATION;
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

