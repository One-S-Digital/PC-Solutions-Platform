/**
 * Marketplace Visibility Diagnostic Script (Prisma-based)
 * 
 * Run this script to diagnose why suppliers/service providers are not visible on marketplace.
 * 
 * Usage:
 *   cd api
 *   npx ts-node scripts/diagnose-marketplace-prisma.ts
 * 
 * Or with environment:
 *   DATABASE_URL=your_database_url npx ts-node scripts/diagnose-marketplace-prisma.ts
 */

import { PrismaClient, OrganizationType, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('===========================================');
  console.log('Marketplace Visibility Diagnostic');
  console.log('===========================================\n');

  // 1. Count organizations by type
  console.log('1. Organizations by Type:');
  console.log('------------------------');
  const orgsByType = await prisma.organization.groupBy({
    by: ['type'],
    _count: { id: true },
  });
  orgsByType.forEach(g => console.log(`   ${g.type}: ${g._count.id}`));

  // 2. Count subscriptions by status
  console.log('\n2. Subscriptions by Status:');
  console.log('---------------------------');
  const subsByStatus = await prisma.subscription.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  subsByStatus.forEach(g => console.log(`   ${g.status}: ${g._count.id}`));

  // 3. Find suppliers/providers WITHOUT any subscription linked via organizationId
  console.log('\n3. Suppliers/Providers WITHOUT subscription (via organizationId):');
  console.log('----------------------------------------------------------------');
  const orgsWithoutSub = await prisma.organization.findMany({
    where: {
      type: { in: [OrganizationType.PRODUCT_SUPPLIER, OrganizationType.SERVICE_PROVIDER] },
      subscriptions: { none: {} },
    },
    select: { id: true, name: true, type: true, isActive: true },
  });
  if (orgsWithoutSub.length === 0) {
    console.log('   ✓ All suppliers/providers have subscriptions linked');
  } else {
    console.log(`   ⚠ Found ${orgsWithoutSub.length} organizations without subscriptions:`);
    orgsWithoutSub.slice(0, 10).forEach(o => console.log(`     - ${o.name} (${o.type})`));
    if (orgsWithoutSub.length > 10) console.log(`     ... and ${orgsWithoutSub.length - 10} more`);
  }

  // 4. Find subscriptions with userId but NO organizationId
  console.log('\n4. Subscriptions linked to User but NOT Organization:');
  console.log('-----------------------------------------------------');
  const subsUserOnly = await prisma.subscription.findMany({
    where: {
      userId: { not: null },
      organizationId: null,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.GRACE_PERIOD] },
    },
    include: {
      user: { select: { email: true, role: true } },
    },
  });
  if (subsUserOnly.length === 0) {
    console.log('   ✓ No active subscriptions with userId-only (all linked to organizations)');
  } else {
    console.log(`   ⚠ Found ${subsUserOnly.length} subscriptions linked to users but NOT organizations:`);
    subsUserOnly.slice(0, 10).forEach(s => {
      console.log(`     - Sub ${s.id.slice(0, 8)}... | Status: ${s.status} | User: ${s.user?.email || 'N/A'} (${s.user?.role || 'N/A'})`);
    });
    if (subsUserOnly.length > 10) console.log(`     ... and ${subsUserOnly.length - 10} more`);
    console.log('\n   THIS IS LIKELY THE ISSUE! These subscriptions need organizationId set.');
  }

  // 5. Find organizations that SHOULD be visible (have proper subscription)
  console.log('\n5. Suppliers/Providers that SHOULD be visible:');
  console.log('----------------------------------------------');
  const now = new Date();
  const visibleOrgs = await prisma.organization.findMany({
    where: {
      type: { in: [OrganizationType.PRODUCT_SUPPLIER, OrganizationType.SERVICE_PROVIDER] },
      isActive: true,
      subscriptions: {
        some: {
          OR: [
            {
              status: SubscriptionStatus.ACTIVE,
              OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
            },
            {
              status: SubscriptionStatus.TRIAL,
              OR: [{ trialEnd: null }, { trialEnd: { gt: now } }],
            },
            {
              status: SubscriptionStatus.GRACE_PERIOD,
              OR: [{ gracePeriodEnd: null }, { gracePeriodEnd: { gt: now } }],
            },
          ],
        },
      },
    },
    select: { id: true, name: true, type: true },
  });
  console.log(`   Found ${visibleOrgs.length} organizations that should be visible:`);
  visibleOrgs.forEach(o => console.log(`     ✓ ${o.name} (${o.type})`));

  // 6. Find suppliers/providers with subscriptions that have WRONG status
  console.log('\n6. Suppliers/Providers with subscriptions in WRONG status:');
  console.log('----------------------------------------------------------');
  const orgsWrongStatus = await prisma.organization.findMany({
    where: {
      type: { in: [OrganizationType.PRODUCT_SUPPLIER, OrganizationType.SERVICE_PROVIDER] },
      subscriptions: {
        some: {
          status: { notIn: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.GRACE_PERIOD] },
        },
        none: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.GRACE_PERIOD] },
        },
      },
    },
    include: {
      subscriptions: { select: { id: true, status: true } },
    },
  });
  if (orgsWrongStatus.length === 0) {
    console.log('   ✓ No organizations with only wrong-status subscriptions');
  } else {
    console.log(`   ⚠ Found ${orgsWrongStatus.length} organizations with wrong subscription status:`);
    orgsWrongStatus.forEach(o => {
      const statuses = o.subscriptions.map(s => s.status).join(', ');
      console.log(`     - ${o.name}: ${statuses}`);
    });
  }

  // 7. Check for user-organization links that could help fix the issue
  console.log('\n7. Can we link subscriptions to organizations?');
  console.log('----------------------------------------------');
  const fixable = await prisma.$queryRaw<Array<{ subscription_id: string; user_email: string; org_name: string; org_type: string }>>`
    SELECT 
      s.id as subscription_id,
      u.email as user_email,
      o.name as org_name,
      o.type as org_type
    FROM subscriptions s
    JOIN users u ON u.id = s."userId"
    JOIN user_organizations uo ON uo."userId" = u.id
    JOIN organizations o ON o.id = uo."organizationId"
    WHERE s."organizationId" IS NULL
      AND s.status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD')
      AND o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
    LIMIT 20
  `;
  
  if (fixable.length === 0) {
    console.log('   No subscriptions can be automatically linked.');
  } else {
    console.log(`   ✓ Found ${fixable.length} subscriptions that can be linked to organizations:`);
    fixable.forEach(f => {
      console.log(`     - Sub ${f.subscription_id.slice(0, 8)}... → ${f.org_name} (${f.org_type})`);
    });
    console.log('\n   To fix, run the SQL update command in the documentation.');
  }

  console.log('\n===========================================');
  console.log('Diagnostic Complete');
  console.log('===========================================');
}

main()
  .catch((e) => {
    console.error('Error running diagnostic:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
