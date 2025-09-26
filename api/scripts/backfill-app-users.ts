import { PrismaClient, UserRole } from '@prisma/client';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

function coerceRole(role: any): UserRole {
  if (role && Object.values(UserRole).includes(role)) {
    return role;
  }
  return UserRole.PARENT;
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY must be set to run this script.');
  }

  const clerk = createClerkClient({ secretKey });
  const pageSize = 100;
  let offset = 0;
  let processed = 0;

  // Clerk returns paginated lists using offset/limit
  /* eslint-disable no-constant-condition */
  while (true) {
    const users = await clerk.users.getUserList({
      limit: pageSize,
      offset,
    });

    if (!users || users.length === 0) {
      break;
    }

    for (const user of users) {
      const clerkId = user.id;
      const primaryEmail = user.email_addresses?.[0]?.email_address || `${clerkId}@missing-email.local`;
      const firstName = user.first_name || 'Unknown';
      const lastName = user.last_name || 'User';
      const role = coerceRole((user.publicMetadata as any)?.role || (user.privateMetadata as any)?.intendedRole);

      const appUser = await prisma.appUser.upsert({
        where: { clerkId },
        update: {
          email: primaryEmail,
          role,
        },
        create: {
          clerkId,
          email: primaryEmail,
          role,
        },
        select: { id: true, role: true },
      });

      await prisma.user.upsert({
        where: { clerkId },
        update: {
          email: primaryEmail,
          firstName,
          lastName,
          role: appUser.role,
        },
        create: {
          id: appUser.id,
          clerkId,
          email: primaryEmail,
          firstName,
          lastName,
          role: appUser.role,
        },
      });

      processed += 1;
    }

    offset += users.length;
    if (users.length < pageSize) {
      break;
    }
  }
  /* eslint-enable no-constant-condition */

  console.log(`Backfill complete. Processed ${processed} Clerk users.`);
}

main()
  .catch(error => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
