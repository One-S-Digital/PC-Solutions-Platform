import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to create test users for messaging system testing
 * Creates both AppUser and User records with matching clerkId
 */
async function createTestUsers() {
  console.log('👥 Creating test users for messaging...');

  const testUsers = [
    {
      clerkId: 'user_test_parent_1',
      email: 'test.parent1@example.com',
      firstName: 'Alice',
      lastName: 'Parent',
      role: UserRole.PARENT,
    },
    {
      clerkId: 'user_test_parent_2',
      email: 'test.parent2@example.com',
      firstName: 'Bob',
      lastName: 'Parent',
      role: UserRole.PARENT,
    },
    {
      clerkId: 'user_test_educator_1',
      email: 'test.educator1@example.com',
      firstName: 'Charlie',
      lastName: 'Educator',
      role: UserRole.EDUCATOR,
    },
    {
      clerkId: 'user_test_educator_2',
      email: 'test.educator2@example.com',
      firstName: 'Diana',
      lastName: 'Educator',
      role: UserRole.EDUCATOR,
    },
    {
      clerkId: 'user_test_admin_1',
      email: 'test.admin1@example.com',
      firstName: 'Eve',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    },
  ];

  for (const userData of testUsers) {
    try {
      // Check if user already exists by email (to handle re-runs)
      const existingAppUserByEmail = await prisma.appUser.findUnique({
        where: { email: userData.email },
      });

      if (existingAppUserByEmail) {
        console.log(`⚠️  User with email ${userData.email} already exists, updating clerkId...`);
        
        // Store old clerkId before updating
        const oldClerkId = existingAppUserByEmail.clerkId;
        
        // Update clerkId if different
        if (existingAppUserByEmail.clerkId !== userData.clerkId) {
          // Check if target clerkId is already in use by another AppUser
          const conflictingAppUser = await prisma.appUser.findUnique({
            where: { clerkId: userData.clerkId },
          });
          
          if (conflictingAppUser && conflictingAppUser.id !== existingAppUserByEmail.id) {
            console.warn(`⚠️  ClerkId ${userData.clerkId} already in use by another AppUser, skipping update`);
            continue;
          }
          
          await prisma.appUser.update({
            where: { id: existingAppUserByEmail.id },
            data: { clerkId: userData.clerkId },
          });
          console.log(`✅ Updated AppUser clerkId to: ${userData.clerkId}`);
        }

        // Check and update/create User record
        const existingUser = await prisma.user.findUnique({
          where: { clerkId: userData.clerkId },
        });

        if (!existingUser) {
          // Check if User exists with old clerkId
          const userWithOldClerkId = await prisma.user.findUnique({
            where: { clerkId: oldClerkId },
          });

          if (userWithOldClerkId) {
            // Check for conflicts before updating
            const conflictingUser = await prisma.user.findUnique({
              where: { clerkId: userData.clerkId },
            });
            
            if (conflictingUser && conflictingUser.id !== userWithOldClerkId.id) {
              console.warn(`⚠️  clerkId ${userData.clerkId} already in use by another User, skipping update`);
              continue;
            }
            
            // Update clerkId
            await prisma.user.update({
              where: { id: userWithOldClerkId.id },
              data: { clerkId: userData.clerkId },
            });
            console.log(`✅ Updated User clerkId to: ${userData.clerkId}`);
          } else {
            // Create new User record
            await prisma.user.create({
              data: {
                clerkId: userData.clerkId,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                isActive: true,
              },
            });
            console.log(`✅ Created User record for: ${userData.email}`);
          }
        } else {
          // Update User record if needed
          await prisma.user.update({
            where: { clerkId: userData.clerkId },
            data: {
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              isActive: true,
            },
          });
          console.log(`✅ Updated User record for: ${userData.email}`);
        }
        continue;
      }

      // Create both AppUser and User in a transaction
      await prisma.$transaction(async (tx) => {
        // Create AppUser
        const appUser = await tx.appUser.create({
          data: {
            clerkId: userData.clerkId,
            email: userData.email,
            role: userData.role,
          },
        });

        console.log(`✅ Created AppUser: ${appUser.id} for ${userData.email}`);

        // Create User
        const user = await tx.user.create({
          data: {
            clerkId: userData.clerkId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActive: true,
          },
        });

        console.log(`✅ Created User: ${user.id} for ${userData.email}`);
      });

      console.log(`🎉 Successfully created test user: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Failed to create test user ${userData.email}:`, error);
    }
  }

  console.log('✅ Test users creation completed!');
}

createTestUsers()
  .catch((e) => {
    console.error('❌ Error creating test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

