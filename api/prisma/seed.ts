import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed process...');

  // 1. Create Plans and Prices
  console.log('📋 Creating plans and prices...');
  await seedPlansAndPrices();

  // 2. Create Test Users
  console.log('👥 Creating test users...');
  await seedTestUsers();

  // 3. Create Enterprise Tenant Structure
  console.log('🏢 Creating enterprise tenant structure...');
  await seedEnterpriseStructure();

  // 4. Create Sample Content
  console.log('📄 Creating sample content...');
  await seedSampleContent();

  // 5. Create Feature Flags
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

async function seedTestUsers() {
  const testUsers = [
    {
      clerkId: 'user_superadmin_demo',
      email: 'superadmin@demo.ch',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN' as const,
    },
    {
      clerkId: 'user_admin_foundationA',
      email: 'admin@foundationA.ch',
      firstName: 'Foundation',
      lastName: 'Admin',
      role: 'ADMIN' as const,
    },
    {
      clerkId: 'user_manager_branchA',
      email: 'manager@branchA.ch',
      firstName: 'Branch',
      lastName: 'Manager',
      role: 'FOUNDATION' as const,
    },
    {
      clerkId: 'user_educator_branchA',
      email: 'educator@branchA.ch',
      firstName: 'Educator',
      lastName: 'Alice',
      role: 'EDUCATOR' as const,
    },
    {
      clerkId: 'user_supplier_vendor',
      email: 'supplier@vendor.ch',
      firstName: 'Product',
      lastName: 'Supplier',
      role: 'PRODUCT_SUPPLIER' as const,
    },
    {
      clerkId: 'user_service_vendor',
      email: 'service@vendor.ch',
      firstName: 'Service',
      lastName: 'Provider',
      role: 'SERVICE_PROVIDER' as const,
    },
    {
      clerkId: 'user_parent_demo',
      email: 'parent@demo.ch',
      firstName: 'Parent',
      lastName: 'User',
      role: 'PARENT' as const,
    },
  ];

  for (const userData of testUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }
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

  // Assign users to organizations
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@foundationA.ch' } });
  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@branchA.ch' } });
  const educatorUser = await prisma.user.findUnique({ where: { email: 'educator@branchA.ch' } });

  if (adminUser && sunriseGroup) {
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: adminUser.id, organizationId: sunriseGroup.id } },
      update: {},
      create: {
        userId: adminUser.id,
        organizationId: sunriseGroup.id,
        role: 'ADMIN',
      },
    });
  }

  if (managerUser && pullyBranch) {
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: managerUser.id, organizationId: pullyBranch.id } },
      update: {},
      create: {
        userId: managerUser.id,
        organizationId: pullyBranch.id,
        role: 'FOUNDATION',
      },
    });
  }

  if (educatorUser && pullyBranch) {
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: educatorUser.id, organizationId: pullyBranch.id } },
      update: {},
      create: {
        userId: educatorUser.id,
        organizationId: pullyBranch.id,
        role: 'EDUCATOR',
      },
    });
  }
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
        location: 'Lausanne, Vaud',
        salaryMin: 4500,
        salaryMax: 5500,
        status: 'PUBLISHED',
        organizationId: foundationOrg.id,
      },
    });
  }

  // Create sample messages
  const educatorUser = await prisma.user.findUnique({ where: { email: 'educator@branchA.ch' } });
  const parentUser = await prisma.user.findUnique({ where: { email: 'parent@demo.ch' } });

  if (educatorUser && parentUser) {
    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        title: 'Child Progress Discussion',
      },
    });

    // Add participants
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: educatorUser.id },
        { conversationId: conversation.id, userId: parentUser.id },
      ],
    });

    // Create sample message
    await prisma.message.create({
      data: {
        content: 'Hello! I wanted to update you on your child\'s progress this week.',
        type: 'TEXT',
        conversationId: conversation.id,
        senderId: educatorUser.id,
      },
    });
  }
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