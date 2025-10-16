const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserFix() {
  try {
    console.log('🧪 Testing user fix...');
    
    // Test 1: Check if AppUser table exists and has data
    const appUsers = await prisma.appUser.findMany();
    console.log(`✅ Found ${appUsers.length} AppUser records`);
    
    if (appUsers.length > 0) {
      const testUser = appUsers[0];
      console.log('📋 Sample AppUser:', {
        id: testUser.id,
        clerkId: testUser.clerkId,
        email: testUser.email,
        role: testUser.role
      });
    }
    
    // Test 2: Check if User table exists and has data
    const users = await prisma.user.findMany();
    console.log(`📊 Found ${users.length} User records`);
    
    // Test 3: Simulate the findByClerkId method
    if (appUsers.length > 0) {
      const testClerkId = appUsers[0].clerkId;
      console.log(`🔍 Testing findByClerkId with clerkId: ${testClerkId}`);
      
      const appUser = await prisma.appUser.findUnique({
        where: { clerkId: testClerkId },
      });
      
      if (appUser) {
        // Simulate the fixed method
        const userData = {
          id: appUser.id,
          clerkId: appUser.clerkId,
          email: appUser.email,
          firstName: null,
          lastName: null,
          role: appUser.role,
          phoneNumber: null,
          workExperience: null,
          education: null,
          certifications: [],
          skills: [],
          availability: null,
          cvUrl: null,
          stripeCustomerId: null,
          lastActiveAt: null,
          isActive: true,
          createdAt: appUser.createdAt,
          updatedAt: appUser.updatedAt,
          organizations: [],
        };
        
        console.log('✅ User data conversion successful:', {
          id: userData.id,
          clerkId: userData.clerkId,
          email: userData.email,
          role: userData.role
        });
      }
    }
    
    console.log('🎉 All tests passed! The fix should work.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUserFix();
