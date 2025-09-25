import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

interface TestUser {
  clerkUserId: string;
  role: UserRole;
  email: string;
}

const testUsers: TestUser[] = [
  {
    clerkUserId: 'user_test_super_admin',
    role: UserRole.SUPER_ADMIN,
    email: 'super.admin@test.com',
  },
  {
    clerkUserId: 'user_test_admin',
    role: UserRole.ADMIN,
    email: 'admin@test.com',
  },
  {
    clerkUserId: 'user_test_foundation',
    role: UserRole.FOUNDATION,
    email: 'foundation@test.com',
  },
  {
    clerkUserId: 'user_test_supplier',
    role: UserRole.PRODUCT_SUPPLIER,
    email: 'supplier@test.com',
  },
  {
    clerkUserId: 'user_test_service',
    role: UserRole.SERVICE_PROVIDER,
    email: 'service@test.com',
  },
  {
    clerkUserId: 'user_test_educator',
    role: UserRole.EDUCATOR,
    email: 'educator@test.com',
  },
  {
    clerkUserId: 'user_test_parent',
    role: UserRole.PARENT,
    email: 'parent@test.com',
  },
];

async function seedTestData() {
  console.log('🌱 Seeding test users...');

  // Clear existing test data
  await prisma.appUserRoleHistory.deleteMany({
    where: {
      user: {
        clerkUserId: {
          startsWith: 'user_test_',
        },
      },
    },
  });

  await prisma.appUser.deleteMany({
    where: {
      clerkUserId: {
        startsWith: 'user_test_',
      },
    },
  });

  // Create test users
  for (const testUser of testUsers) {
    const user = await prisma.appUser.create({
      data: {
        clerkUserId: testUser.clerkUserId,
        role: testUser.role,
      },
    });

    // Add initial role history
    await prisma.appUserRoleHistory.create({
      data: {
        userId: user.id,
        newRole: testUser.role,
        changedBy: 'system/seed',
        reason: 'Initial test data',
      },
    });

    console.log(`✅ Created test user: ${testUser.email} (${testUser.role})`);
  }

  // Create some outbox entries for testing
  await prisma.outbox.create({
    data: {
      topic: 'mirror.role',
      payload: {
        clerkUserId: 'user_test_parent',
        role: UserRole.EDUCATOR,
      },
    },
  });

  console.log('✅ Created test outbox entry');

  // Create a role change history for testing
  const adminUser = await prisma.appUser.findUnique({
    where: { clerkUserId: 'user_test_admin' },
  });

  if (adminUser) {
    await prisma.appUserRoleHistory.create({
      data: {
        userId: adminUser.id,
        previousRole: UserRole.PARENT,
        newRole: UserRole.ADMIN,
        changedBy: 'user_test_super_admin',
        reason: 'Promoted to admin for testing',
      },
    });
  }

  console.log('✅ Created test role history');
  console.log('🎉 Test data seeding complete!');
}

seedTestData()
  .catch((e) => {
    console.error('❌ Error seeding test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });