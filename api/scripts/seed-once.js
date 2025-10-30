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

    console.log('✅ Seed: completed');
  } catch (err) {
    console.error('❌ Seed failed:', err?.message || err);
    // Do not block build on seed failure
  } finally {
    await prisma.$disconnect();
  }
}

main();

