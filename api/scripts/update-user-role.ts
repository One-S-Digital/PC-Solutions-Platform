import { PrismaClient } from '@prisma/client';
import { UserRole } from '@repo/types';

const prisma = new PrismaClient();

async function updateUserRole(clerkId: string, newRole: UserRole) {
  try {
    // First, find the user
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      console.error(`User with Clerk ID ${clerkId} not found`);
      return;
    }

    console.log('Current user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      clerkId: user.clerkId,
    });

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { clerkId },
      data: { role: newRole },
    });

    console.log('Updated user:', {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      clerkId: updatedUser.clerkId,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if user exists first
async function checkUser(clerkId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (user) {
      console.log('User found:', {
        id: user.id,
        email: user.email,
        role: user.role,
        clerkId: user.clerkId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } else {
      console.log(`No user found with Clerk ID: ${clerkId}`);
    }
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get the Clerk ID from the logs: user_326OW0kp2tTae6lkVA7Vqosx72D
const clerkId = 'user_326OW0kp2tTae6lkVA7Vqosx72D';

// First check if user exists
checkUser(clerkId).then(() => {
  // Uncomment to update the role
  // updateUserRole(clerkId, UserRole.SUPER_ADMIN);
});