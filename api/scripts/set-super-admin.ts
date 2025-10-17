import { PrismaClient } from '@prisma/client';
import { UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function setSuperAdmin(clerkId: string) {
  try {
    console.log('🔍 Looking for user:', clerkId);

    // Update AppUser
    const appUser = await prisma.appUser.update({
      where: { clerkId },
      data: { role: UserRole.SUPER_ADMIN },
    });

    console.log('✅ AppUser updated:', {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      role: appUser.role,
    });

    // Update User (if exists)
    try {
      const user = await prisma.user.update({
        where: { clerkId },
        data: { role: UserRole.SUPER_ADMIN },
      });
      console.log('✅ User updated:', {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        role: user.role,
      });
    } catch (e) {
      console.log('ℹ️  User table not updated (might not exist yet)');
    }

    console.log('🎉 User is now SUPER_ADMIN!');
    console.log('📋 Next steps:');
    console.log('  1. User should log out');
    console.log('  2. User should log back in');
    console.log('  3. Backend will fetch updated role');
    console.log('  4. User will have full admin access');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.code === 'P2025') {
      console.error('User not found with clerkId:', clerkId);
      console.error('Make sure the user has logged in at least once.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Get Clerk ID from command line or use default
const clerkId = process.argv[2] || 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';

console.log('');
console.log('🔐 Setting SUPER_ADMIN Role');
console.log('============================');
console.log('');

setSuperAdmin(clerkId);
