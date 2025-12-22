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
  // Create subscription plans matching the 5 plans on the pricing page
  // These are used by the admin subscription management system

  // 1. Foundation Basic - CHF 69/month
  await prisma.subscriptionPlan.upsert({
    where: { code: 'BASIC' },
    update: {
      name: 'Basic',
      description: 'Perfect for small daycares who want essential tools without complexity. Get immediate access to suppliers, compliance info, and support.',
      price: 69.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Supplier & service provider marketplace',
        'State policy hub (by canton)',
        'Multilingual interface (EN/FR/DE)',
        'Email support',
      ],
      limits: {
        parentEnquiries: 0,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
    create: {
      name: 'Basic',
      code: 'BASIC',
      description: 'Perfect for small daycares who want essential tools without complexity. Get immediate access to suppliers, compliance info, and support.',
      price: 69.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Supplier & service provider marketplace',
        'State policy hub (by canton)',
        'Multilingual interface (EN/FR/DE)',
        'Email support',
      ],
      limits: {
        parentEnquiries: 0,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
  });

  // 2. Foundation Essential - CHF 129/month (Popular)
  await prisma.subscriptionPlan.upsert({
    where: { code: 'ESSENTIAL' },
    update: {
      name: 'Essential',
      description: 'Perfect for single-site daycares who want to save time with parent leads and compliant HR tools. Win parents faster, stay compliant, and manage enquiries with ease.',
      price: 129.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Everything in Basic',
        'Parent leads inbox + auto-matching system',
        'HR & compliance document library (Swiss-validated)',
        'Parent enquiry tracker with quick replies',
      ],
      limits: {
        parentEnquiries: 15,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
    create: {
      name: 'Essential',
      code: 'ESSENTIAL',
      description: 'Perfect for single-site daycares who want to save time with parent leads and compliant HR tools. Win parents faster, stay compliant, and manage enquiries with ease.',
      price: 129.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Everything in Basic',
        'Parent leads inbox + auto-matching system',
        'HR & compliance document library (Swiss-validated)',
        'Parent enquiry tracker with quick replies',
      ],
      limits: {
        parentEnquiries: 15,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
  });

  // 3. Foundation Professional - CHF 259/month
  await prisma.subscriptionPlan.upsert({
    where: { code: 'PROFESSIONAL' },
    update: {
      name: 'Professional',
      description: 'Perfect for medium-sized daycares ready to grow and professionalize operations. Recruit and train staff, handle unlimited parent enquiries, and deliver excellence.',
      price: 259.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Everything in Essential',
        'Recruitment module',
        'Unlimited parent enquiries',
        'E-learning for staff',
        'Team management & tools',
        'Priority support',
      ],
      limits: {
        parentEnquiries: -1,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
        recruitment: true,
        eLearning: true,
        teamManagement: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 3,
    },
    create: {
      name: 'Professional',
      code: 'PROFESSIONAL',
      description: 'Perfect for medium-sized daycares ready to grow and professionalize operations. Recruit and train staff, handle unlimited parent enquiries, and deliver excellence.',
      price: 259.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Everything in Essential',
        'Recruitment module',
        'Unlimited parent enquiries',
        'E-learning for staff',
        'Team management & tools',
        'Priority support',
      ],
      limits: {
        parentEnquiries: -1,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
        recruitment: true,
        eLearning: true,
        teamManagement: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 3,
    },
  });

  // 4. Suppliers - Enquiry-based pricing
  await prisma.subscriptionPlan.upsert({
    where: { code: 'SUPPLIERS' },
    update: {
      name: 'Suppliers',
      description: 'Perfect for suppliers focused on daycare market growth. Pricing based on enquiry.',
      price: 0,
      currency: 'CHF',
      billingPeriod: 'enquiry',
      features: [
        'Product listings & marketplace access',
        'Lead management system',
        'Order tracking & fulfillment',
        'Multi-language support',
        'Sales analytics dashboard',
        'Email support',
      ],
      limits: {
        productListings: -1,
        marketplace: true,
        leadManagement: true,
        orderTracking: true,
        analytics: true,
      },
      allowedRoles: ['PRODUCT_SUPPLIER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 4,
    },
    create: {
      name: 'Suppliers',
      code: 'SUPPLIERS',
      description: 'Perfect for suppliers focused on daycare market growth. Pricing based on enquiry.',
      price: 0,
      currency: 'CHF',
      billingPeriod: 'enquiry',
      features: [
        'Product listings & marketplace access',
        'Lead management system',
        'Order tracking & fulfillment',
        'Multi-language support',
        'Sales analytics dashboard',
        'Email support',
      ],
      limits: {
        productListings: -1,
        marketplace: true,
        leadManagement: true,
        orderTracking: true,
        analytics: true,
      },
      allowedRoles: ['PRODUCT_SUPPLIER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 4,
    },
  });

  // 5. Service Providers - Enquiry-based pricing
  await prisma.subscriptionPlan.upsert({
    where: { code: 'SERVICE_PROVIDERS' },
    update: {
      name: 'Service Providers',
      description: 'Perfect for service providers targeting professional daycare partnerships. Pricing based on enquiry.',
      price: 0,
      currency: 'CHF',
      billingPeriod: 'enquiry',
      features: [
        'Service listings & marketplace access',
        'Appointment scheduling system',
        'Client relationship management',
        'Revenue tracking & reporting',
        'Multi-language support',
        'Priority support',
      ],
      limits: {
        serviceListings: -1,
        marketplace: true,
        scheduling: true,
        crm: true,
        revenueTracking: true,
      },
      allowedRoles: ['SERVICE_PROVIDER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 5,
    },
    create: {
      name: 'Service Providers',
      code: 'SERVICE_PROVIDERS',
      description: 'Perfect for service providers targeting professional daycare partnerships. Pricing based on enquiry.',
      price: 0,
      currency: 'CHF',
      billingPeriod: 'enquiry',
      features: [
        'Service listings & marketplace access',
        'Appointment scheduling system',
        'Client relationship management',
        'Revenue tracking & reporting',
        'Multi-language support',
        'Priority support',
      ],
      limits: {
        serviceListings: -1,
        marketplace: true,
        scheduling: true,
        crm: true,
        revenueTracking: true,
      },
      allowedRoles: ['SERVICE_PROVIDER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 5,
    },
  });

  console.log('✅ Subscription plans created successfully (5 plans matching pricing page)');
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