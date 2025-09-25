/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

async function main() {
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
          // accent color might be present depending on schema; use any cast
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
        where: { clerkUserId: seedClerkUserId },
        create: { clerkUserId: seedClerkUserId, role: 'SUPER_ADMIN' },
        update: { role: 'SUPER_ADMIN' },
      });
      console.log('🌱 Seed: AppUser upserted to SUPER_ADMIN for', seedClerkUserId);
    } else {
      console.log('ℹ️ Seed: SEED_CLERK_USER_ID not provided, skipping AppUser seeding');
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

