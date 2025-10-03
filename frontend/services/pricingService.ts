import { PricingPlan, UserRole } from '../types';
import { MOCK_PRICING_PLANS } from '../constants';

// Centralized pricing service that handles both public pricing page and subscription settings
export class PricingService {
  private static instance: PricingService;
  private pricingPlans: PricingPlan[];

  private constructor() {
    this.pricingPlans = MOCK_PRICING_PLANS;
  }

  static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  // Get all pricing plans grouped by role
  getPlansByRole() {
    return {
      foundation: this.pricingPlans.filter(p => p.role === UserRole.FOUNDATION),
      supplier: this.pricingPlans.find(p => p.role === UserRole.PRODUCT_SUPPLIER),
      serviceProvider: this.pricingPlans.find(p => p.role === UserRole.SERVICE_PROVIDER),
    };
  }

  // Get foundation plans for subscription settings
  getFoundationPlans(): PricingPlan[] {
    return this.pricingPlans.filter(p => p.role === UserRole.FOUNDATION);
  }

  // Get suppliers and service providers plans for public pricing page
  getSuppliersAndServiceProviderPlans() {
    return {
      supplier: this.pricingPlans.find(p => p.role === UserRole.PRODUCT_SUPPLIER),
      serviceProvider: this.pricingPlans.find(p => p.role === UserRole.SERVICE_PROVIDER),
    };
  }

  // Get a specific plan by name
  getPlanByName(name: string): PricingPlan | undefined {
    return this.pricingPlans.find(p => p.name === name);
  }

  // Update pricing plans (for future maintenance)
  updatePricingPlans(plans: PricingPlan[]) {
    this.pricingPlans = plans;
  }

  // Get all plans (for admin purposes)
  getAllPlans(): PricingPlan[] {
    return [...this.pricingPlans];
  }
}

// Export singleton instance
export const pricingService = PricingService.getInstance();
