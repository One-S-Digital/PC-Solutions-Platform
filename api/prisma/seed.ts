import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed process...');

  // 1. Create Plans and Prices
  console.log('📋 Creating plans and prices...');
  await seedPlansAndPrices();

  // 2. Create Subscription Plans (for admin subscription management)
  console.log('📋 Creating subscription plans...');
  await seedSubscriptionPlans();

  // 3. Test users removed for production

  // 4. Create Enterprise Tenant Structure
  console.log('🏢 Creating enterprise tenant structure...');
  await seedEnterpriseStructure();

  // 5. Create Sample Content
  console.log('📄 Creating sample content...');
  await seedSampleContent();

  // 6. Create Feature Flags
  console.log('🚩 Setting up feature flags...');
  await seedFeatureFlags();

  console.log('✅ Seeding completed successfully!');
}

async function seedPlansAndPrices() {
  // Create plans
  const basicPlan = await prisma.plan.upsert({
    where: { code: 'BASIC' },
    update: {},
    create: {
      code: 'BASIC',
      name: 'Basic Plan',
      description: 'Perfect for small foundations getting started',
      features: [
        'Up to 10 children',
        'Basic reporting',
        'Email support',
        'Standard marketplace access',
      ],
    },
  });

  const essentialPlan = await prisma.plan.upsert({
    where: { code: 'ESSENTIAL' },
    update: {},
    create: {
      code: 'ESSENTIAL',
      name: 'Essential Plan',
      description: 'Ideal for growing foundations',
      features: [
        'Up to 50 children',
        'Advanced reporting',
        'Priority support',
        'Full marketplace access',
        'Team management',
        'Custom branding',
      ],
    },
  });

  const professionalPlan = await prisma.plan.upsert({
    where: { code: 'PROFESSIONAL' },
    update: {},
    create: {
      code: 'PROFESSIONAL',
      name: 'Professional Plan',
      description: 'For established foundations and organizations',
      features: [
        'Unlimited children',
        'Advanced analytics',
        '24/7 support',
        'Full marketplace access',
        'Advanced team management',
        'Custom branding',
        'API access',
        'White-label options',
      ],
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: {
      code: 'ENTERPRISE',
      name: 'Enterprise Plan',
      description: 'For large organizations with custom needs',
      features: [
        'Unlimited everything',
        'Custom analytics',
        'Dedicated support',
        'Full marketplace access',
        'Advanced team management',
        'Custom branding',
        'Full API access',
        'White-label options',
        'Custom integrations',
        'SLA guarantee',
      ],
    },
  });

  // Create plan prices (these would be set to actual Stripe price IDs in production)
  const plans = [basicPlan, essentialPlan, professionalPlan, enterprisePlan];
  
  for (const plan of plans) {
    // Monthly recurring prices
    await prisma.planPrice.upsert({
      where: { 
        planId_cadence_kind: {
          planId: plan.id,
          cadence: 'monthly',
          kind: 'recurring',
        }
      },
      update: {},
      create: {
        planId: plan.id,
        cadence: 'monthly',
        kind: 'recurring',
        stripePriceId: `price_monthly_${plan.code.toLowerCase()}_recurring`,
        amount: getMonthlyPrice(plan.code),
      },
    });

    // Annual recurring prices
    await prisma.planPrice.upsert({
      where: { 
        planId_cadence_kind: {
          planId: plan.id,
          cadence: 'annual',
          kind: 'recurring',
        }
      },
      update: {},
      create: {
        planId: plan.id,
        cadence: 'annual',
        kind: 'recurring',
        stripePriceId: `price_annual_${plan.code.toLowerCase()}_recurring`,
        amount: getAnnualRecurringPrice(plan.code),
      },
    });

    // Annual one-time prices
    await prisma.planPrice.upsert({
      where: { 
        planId_cadence_kind: {
          planId: plan.id,
          cadence: 'annual',
          kind: 'one_time',
        }
      },
      update: {},
      create: {
        planId: plan.id,
        cadence: 'annual',
        kind: 'one_time',
        stripePriceId: `price_annual_${plan.code.toLowerCase()}_onetime`,
        amount: getAnnualOnetimePrice(plan.code),
      },
    });
  }
}

// Test users seeding removed for production - users should be created through Clerk authentication

async function seedSubscriptionPlans() {
  // Create subscription plans for the admin subscription management system
  // These are separate from Plan/PlanPrice used for Stripe billing

  // Foundation Subscription Plans
  await prisma.subscriptionPlan.upsert({
    where: { code: 'FOUNDATION_BASIC' },
    update: {},
    create: {
      name: 'Foundation Basic',
      code: 'FOUNDATION_BASIC',
      description: 'Basic subscription for small foundations getting started with the platform.',
      price: 29.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Up to 10 parent enquiries per month',
        'Basic marketplace access',
        'Standard support',
        'Job posting (1 active)',
      ],
      limits: {
        parentEnquiries: 10,
        activeJobListings: 1,
        teamMembers: 2,
        storage: '1GB',
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'FOUNDATION_ESSENTIAL' },
    update: {},
    create: {
      name: 'Foundation Essential',
      code: 'FOUNDATION_ESSENTIAL',
      description: 'Essential subscription for growing foundations with expanded features.',
      price: 79.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Up to 50 parent enquiries per month',
        'Full marketplace access',
        'Priority support',
        'Job posting (5 active)',
        'Team management',
        'Analytics dashboard',
      ],
      limits: {
        parentEnquiries: 50,
        activeJobListings: 5,
        teamMembers: 10,
        storage: '5GB',
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'FOUNDATION_PROFESSIONAL' },
    update: {},
    create: {
      name: 'Foundation Professional',
      code: 'FOUNDATION_PROFESSIONAL',
      description: 'Professional subscription for established foundations with advanced features.',
      price: 149.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Unlimited parent enquiries',
        'Full marketplace access',
        '24/7 priority support',
        'Unlimited job postings',
        'Advanced team management',
        'Advanced analytics',
        'API access',
        'Custom branding',
      ],
      limits: {
        parentEnquiries: -1,
        activeJobListings: -1,
        teamMembers: 50,
        storage: '25GB',
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 3,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'FOUNDATION_ENTERPRISE' },
    update: {},
    create: {
      name: 'Foundation Enterprise',
      code: 'FOUNDATION_ENTERPRISE',
      description: 'Enterprise subscription for large foundations with custom needs and dedicated support.',
      price: 299.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Unlimited everything',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options',
        'SLA guarantee',
        'On-site training',
        'Custom analytics',
        'Multi-branch management',
      ],
      limits: {
        parentEnquiries: -1,
        activeJobListings: -1,
        teamMembers: -1,
        storage: 'unlimited',
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 30,
      isActive: true,
      isPopular: false,
      displayOrder: 4,
    },
  });

  // Product Supplier Subscription Plans
  await prisma.subscriptionPlan.upsert({
    where: { code: 'SUPPLIER_BASIC' },
    update: {},
    create: {
      name: 'Supplier Basic',
      code: 'SUPPLIER_BASIC',
      description: 'Basic subscription for product suppliers to list products.',
      price: 49.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Up to 20 product listings',
        'Basic storefront',
        'Standard support',
        'Order management',
      ],
      limits: {
        productListings: 20,
        featuredProducts: 0,
        storage: '2GB',
      },
      allowedRoles: ['PRODUCT_SUPPLIER'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'SUPPLIER_PROFESSIONAL' },
    update: {},
    create: {
      name: 'Supplier Professional',
      code: 'SUPPLIER_PROFESSIONAL',
      description: 'Professional subscription for established product suppliers.',
      price: 129.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Unlimited product listings',
        'Premium storefront',
        'Priority support',
        'Advanced analytics',
        'Featured products (5)',
        'Bulk upload',
      ],
      limits: {
        productListings: -1,
        featuredProducts: 5,
        storage: '20GB',
      },
      allowedRoles: ['PRODUCT_SUPPLIER'],
      trialDays: 14,
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
  });

  // Service Provider Subscription Plans
  await prisma.subscriptionPlan.upsert({
    where: { code: 'SERVICE_BASIC' },
    update: {},
    create: {
      name: 'Service Provider Basic',
      code: 'SERVICE_BASIC',
      description: 'Basic subscription for service providers.',
      price: 39.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Up to 5 service listings',
        'Basic profile',
        'Standard support',
        'Booking management',
      ],
      limits: {
        serviceListings: 5,
        featuredServices: 0,
        storage: '1GB',
      },
      allowedRoles: ['SERVICE_PROVIDER'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'SERVICE_PROFESSIONAL' },
    update: {},
    create: {
      name: 'Service Provider Professional',
      code: 'SERVICE_PROFESSIONAL',
      description: 'Professional subscription for established service providers.',
      price: 99.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Unlimited service listings',
        'Premium profile',
        'Priority support',
        'Advanced scheduling',
        'Featured services (3)',
        'Analytics dashboard',
      ],
      limits: {
        serviceListings: -1,
        featuredServices: 3,
        storage: '10GB',
      },
      allowedRoles: ['SERVICE_PROVIDER'],
      trialDays: 14,
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
  });

  console.log('✅ Subscription plans created successfully');
}

async function seedEnterpriseStructure() {
  // Create Sunrise Group enterprise
  const sunriseGroup = await prisma.organization.upsert({
    where: { name: 'Sunrise Group' },
    update: {},
    create: {
      name: 'Sunrise Group',
      type: 'FOUNDATION',
      region: 'Vaud',
      description: 'Leading childcare enterprise with multiple branches',
      canton: 'VD',
      languages: ['French', 'English'],
      capacity: 200,
      pedagogy: ['Montessori', 'Reggio Emilia'],
    },
  });

  // Create branches
  const pullyBranch = await prisma.organization.upsert({
    where: { name: 'Sunrise Group - Pully' },
    update: {},
    create: {
      name: 'Sunrise Group - Pully',
      type: 'FOUNDATION',
      region: 'Vaud',
      description: 'Pully branch of Sunrise Group',
      canton: 'VD',
      languages: ['French'],
      capacity: 50,
      pedagogy: ['Montessori'],
    },
  });

  const lausanneBranch = await prisma.organization.upsert({
    where: { name: 'Sunrise Group - Lausanne' },
    update: {},
    create: {
      name: 'Sunrise Group - Lausanne',
      type: 'FOUNDATION',
      region: 'Vaud',
      description: 'Lausanne branch of Sunrise Group',
      canton: 'VD',
      languages: ['French', 'English'],
      capacity: 75,
      pedagogy: ['Reggio Emilia'],
    },
  });

  // Create Fribourg branch for testing
  const fribourgBranch = await prisma.organization.upsert({
    where: { name: 'Sunrise Group - Fribourg' },
    update: {},
    create: {
      name: 'Sunrise Group - Fribourg',
      type: 'FOUNDATION',
      region: 'Fribourg',
      description: 'Fribourg branch of Sunrise Group',
      canton: 'FR',
      languages: ['French', 'German'],
      capacity: 40,
      pedagogy: ['Montessori'],
    },
  });

  // Note: Users should be created through Clerk authentication and manually assigned to organizations
  // via the admin interface or a separate onboarding process.
}

async function seedSampleContent() {
  // Create sample products
  const supplierOrg = await prisma.organization.findFirst({ where: { type: 'PRODUCT_SUPPLIER' } });
  if (supplierOrg) {
    await prisma.product.upsert({
      where: { title: 'Educational Toys Set' },
      update: {},
      create: {
        title: 'Educational Toys Set',
        description: 'High-quality educational toys for early childhood development',
        price: 89.90,
        category: 'Educational Materials',
        tags: ['toys', 'education', 'children'],
        supplierId: supplierOrg.id,
      },
    });
  }

  // Create sample job listings
  const foundationOrg = await prisma.organization.findFirst({ where: { type: 'FOUNDATION' } });
  if (foundationOrg) {
    await prisma.jobListing.upsert({
      where: { title: 'Early Childhood Educator' },
      update: {},
      create: {
        title: 'Early Childhood Educator',
        description: 'We are looking for a passionate educator to join our team',
        requirements: ['Early childhood education degree', 'French language proficiency'],
        responsibilities: ['Plan and deliver engaging activities', 'Collaborate with parents and caregivers'],
        qualifications: ['Bachelor’s degree in Early Childhood Education or equivalent'],
        location: 'Lausanne, Vaud',
        salaryRange: 'CHF 4,500 - CHF 5,500',
        contractType: 'FULL_TIME',
        startDate: new Date(),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        foundationId: foundationOrg.id,
      },
    });
  }

  // Note: Sample conversations should be created after users authenticate through Clerk
  // and can be set up via the application UI or a separate demo data script.
}

async function seedFeatureFlags() {
  // Create system configuration entries for feature flags
  const featureFlags = [
    { key: 'FEATURE_I18N_ENABLED', value: 'true', description: 'Enable internationalization' },
    { key: 'FEATURE_CLAMAV_ENABLED', value: 'true', description: 'Enable ClamAV virus scanning' },
    { key: 'FEATURE_GATED_CONTENT_ENABLED', value: 'true', description: 'Enable gated content features' },
  ];

  for (const flag of featureFlags) {
    await prisma.systemConfiguration.upsert({
      where: { key: flag.key },
      update: { value: flag.value },
      create: {
        key: flag.key,
        value: flag.value,
        description: flag.description,
        category: 'FEATURE_FLAGS',
      },
    });
  }
}

function getMonthlyPrice(planCode: string): number {
  switch (planCode) {
    case 'BASIC': return 2900; // CHF 29.00
    case 'ESSENTIAL': return 5900; // CHF 59.00
    case 'PROFESSIONAL': return 9900; // CHF 99.00
    case 'ENTERPRISE': return 19900; // CHF 199.00
    default: return 0;
  }
}

function getAnnualRecurringPrice(planCode: string): number {
  // 20% discount for annual recurring
  const monthlyPrice = getMonthlyPrice(planCode);
  return Math.round(monthlyPrice * 12 * 0.8);
}

function getAnnualOnetimePrice(planCode: string): number {
  // 25% discount for annual one-time
  const monthlyPrice = getMonthlyPrice(planCode);
  return Math.round(monthlyPrice * 12 * 0.75);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });