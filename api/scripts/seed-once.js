/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

async function main() {
  // Skip seeding during build - database may not be available
  if (process.env.SKIP_SEED === 'true') {
    console.log('ℹ️  Seed: Skipped (SKIP_SEED=true)');
    return;
  }

  const prisma = new PrismaClient();
  try {
    const seedClerkUserId = process.env.SEED_CLERK_USER_ID || '';
    console.log('🌱 Seed: starting (SEED_CLERK_USER_ID set:', !!seedClerkUserId, ')');

    // 1) Ensure frontend_settings exists (idempotent)
    const settingsCount = await prisma.frontendSettings.count();
    if (settingsCount === 0) {
      await prisma.frontendSettings.create({
        data: {
          siteName: 'Pro Crèche Solutions',
          siteDescription: 'Leading childcare solutions platform in Switzerland',
          siteKeywords: 'childcare, daycare, switzerland, education',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          accentColor: '#F59E0B',
          adminPrimaryColor: '#1F2937',
          adminSecondaryColor: '#374151',
          adminAccentColor: '#3B82F6',
          enableDarkMode: true,
          defaultTheme: 'light',
          mainAppCustomization: {},
          adminCustomization: {},
        },
      });
      console.log('🌱 Seed: frontend_settings created');
    } else {
      console.log('ℹ️ Seed: frontend_settings already present');
    }

    // 2) Seed SUPER_ADMIN AppUser if SEED_CLERK_USER_ID provided
    if (seedClerkUserId) {
      await prisma.appUser.upsert({
        where: { clerkId: seedClerkUserId },
        create: { clerkId: seedClerkUserId, role: 'SUPER_ADMIN' },
        update: { role: 'SUPER_ADMIN' },
      });
      console.log('🌱 Seed: AppUser upserted to SUPER_ADMIN for', seedClerkUserId);
    } else {
      console.log('ℹ️ Seed: SEED_CLERK_USER_ID not provided, skipping AppUser seeding');
    }

    // 3) Seed sample catalog data if empty (products, services, job listings, orders)
    const [productCount, serviceCount, jobCount, orgCount] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.service.count().catch(() => 0),
      prisma.jobListing.count().catch(() => 0),
      prisma.organization.count().catch(() => 0),
    ]);

    let orgId;
    if (orgCount === 0) {
      const org = await prisma.organization.create({
        data: { name: 'Sample Organization', type: 'SERVICE_PROVIDER' },
        select: { id: true },
      });
      orgId = org.id;
      console.log('🌱 Seed: organization created');
    } else {
      const first = await prisma.organization.findFirst({ select: { id: true } });
      orgId = first?.id;
    }

    if (productCount === 0 && orgId) {
      try {
        await prisma.product.create({
          data: {
            title: 'Sample Product',
            description: 'Demo product',
            category: 'general',
            supplierId: orgId,
          },
        });
        console.log('🌱 Seed: product created');
      } catch (err) {
        console.log('⚠️ Seed: product creation skipped (schema mismatch)');
      }
    }

    if (serviceCount === 0 && orgId) {
      try {
        await prisma.service.create({
          data: {
            title: 'Sample Service',
            description: 'Demo service',
            category: 'CLEANING',
            providerId: orgId,
          },
        });
        console.log('🌱 Seed: service created');
      } catch (err) {
        console.log('⚠️ Seed: service creation skipped (schema mismatch)');
      }
    }

    if (jobCount === 0 && orgId) {
      await prisma.jobListing.create({
        data: {
          title: 'Sample Job',
          description: 'Demo job listing',
          foundationId: orgId,
        },
      });
      console.log('🌱 Seed: job listing created');
    }

    // 4) Seed subscription plans (5 plans matching pricing page)
    const subscriptionPlanCount = await prisma.subscriptionPlan.count().catch(() => 0);
    if (subscriptionPlanCount === 0) {
      const subscriptionPlans = [
        {
          name: 'Basic',
          code: 'BASIC',
          description: 'Perfect for small daycares who want essential tools without complexity.',
          price: 69.00,
          currency: 'CHF',
          billingPeriod: 'monthly',
          features: [
            'Supplier & service provider marketplace',
            'State policy hub (by canton)',
            'Multilingual interface (EN/FR/DE)',
            'Email support',
          ],
          limits: { parentEnquiries: 0, marketplace: true, policyHub: true, multiLanguage: true },
          allowedRoles: ['FOUNDATION'],
          trialDays: 14,
          isActive: true,
          isPopular: false,
          displayOrder: 1,
        },
        {
          name: 'Essential',
          code: 'ESSENTIAL',
          description: 'Perfect for single-site daycares who want to save time with parent leads and compliant HR tools.',
          price: 129.00,
          currency: 'CHF',
          billingPeriod: 'monthly',
          features: [
            'Everything in Basic',
            'Parent leads inbox + auto-matching system',
            'HR & compliance document library (Swiss-validated)',
            'Parent enquiry tracker with quick replies',
          ],
          limits: { parentEnquiries: 15, marketplace: true, policyHub: true, multiLanguage: true, hrLibrary: true, parentLeads: true },
          allowedRoles: ['FOUNDATION'],
          trialDays: 14,
          isActive: true,
          isPopular: true,
          displayOrder: 2,
        },
        {
          name: 'Professional',
          code: 'PROFESSIONAL',
          description: 'Perfect for medium-sized daycares ready to grow and professionalize operations.',
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
          limits: { parentEnquiries: -1, marketplace: true, policyHub: true, multiLanguage: true, hrLibrary: true, parentLeads: true, recruitment: true, eLearning: true, teamManagement: true },
          allowedRoles: ['FOUNDATION'],
          trialDays: 14,
          isActive: true,
          isPopular: false,
          displayOrder: 3,
        },
        {
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
          limits: { productListings: -1, marketplace: true, leadManagement: true, orderTracking: true, analytics: true },
          allowedRoles: ['PRODUCT_SUPPLIER'],
          trialDays: 0,
          isActive: true,
          isPopular: false,
          displayOrder: 4,
        },
        {
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
          limits: { serviceListings: -1, marketplace: true, scheduling: true, crm: true, revenueTracking: true },
          allowedRoles: ['SERVICE_PROVIDER'],
          trialDays: 0,
          isActive: true,
          isPopular: false,
          displayOrder: 5,
        },
      ];

      for (const plan of subscriptionPlans) {
        await prisma.subscriptionPlan.upsert({
          where: { code: plan.code },
          update: plan,
          create: plan,
        });
      }
      console.log('🌱 Seed: 5 subscription plans created (matching pricing page)');
    } else {
      console.log('ℹ️ Seed: subscription plans already present');
    }

    console.log('✅ Seed: completed');
  } catch (err) {
    console.error('❌ Seed failed:', err?.message || err);
    // Do not block build on seed failure
  } finally {
    await prisma.$disconnect();
  }
}

main();

