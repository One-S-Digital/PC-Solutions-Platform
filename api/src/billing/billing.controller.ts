import { Controller, Post, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '@repo/types';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@ApiTags('billing')
@Controller('billing')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  @Post('checkout/monthly')
  @Roles(UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Create monthly subscription checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session created successfully' })
  async createMonthlyCheckout(@Request() req, @Body() createCheckoutDto: CreateCheckoutSessionDto) {
    const userId = req.user.id;
    return this.billingService.createCheckoutSession(userId, 'monthly', 'recurring', createCheckoutDto.planCode);
  }

  @Post('checkout/annual/recurring')
  @Roles(UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Create annual recurring subscription checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session created successfully' })
  async createAnnualRecurringCheckout(@Request() req, @Body() createCheckoutDto: CreateCheckoutSessionDto) {
    const userId = req.user.id;
    return this.billingService.createCheckoutSession(userId, 'annual', 'recurring', createCheckoutDto.planCode);
  }

  @Post('checkout/annual/onetime')
  @Roles(UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Create annual one-time payment checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session created successfully' })
  async createAnnualOnetimeCheckout(@Request() req, @Body() createCheckoutDto: CreateCheckoutSessionDto) {
    const userId = req.user.id;
    return this.billingService.createCheckoutSession(userId, 'annual', 'one_time', createCheckoutDto.planCode);
  }

  @Get('subscription')
  @Roles(UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get user subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription status retrieved successfully' })
  async getSubscriptionStatus(@Request() req) {
    const userId = req.user.id;
    return this.billingService.getSubscriptionStatus(userId);
  }

  @Get('portal')
  @Roles(UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Create Stripe customer portal session' })
  @ApiResponse({ status: 200, description: 'Portal session created successfully' })
  async createPortalSession(@Request() req) {
    const userId = req.user.id;
    return this.billingService.createPortalSession(userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    return this.billingService.getPlans();
  }
}