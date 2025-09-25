import { Test } from '@nestjs/testing';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { RoleContextMiddleware } from '../src/auth/middleware/role-context.middleware';
import { OutboxWorker } from '../src/sync/outbox.worker';
import { ReconcileService } from '../src/sync/reconcile.service';
import { ClerkWebhookController } from '../src/webhooks/clerk-webhook.controller';
import { RoleManagementController } from '../src/admin/role-management/role-management.controller';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';

async function verifyBuild() {
  console.log('🔍 Verifying Role System Build...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as { name: string; status: 'PASS' | 'FAIL'; error?: string }[]
  };

  // Test 1: Verify all modules can be imported
  console.log('1️⃣  Testing module imports...');
  try {
    const modules = [
      { name: 'ClerkAuthGuard', module: ClerkAuthGuard },
      { name: 'RolesGuard', module: RolesGuard },
      { name: 'RoleContextMiddleware', module: RoleContextMiddleware },
      { name: 'OutboxWorker', module: OutboxWorker },
      { name: 'ReconcileService', module: ReconcileService },
      { name: 'ClerkWebhookController', module: ClerkWebhookController },
      { name: 'RoleManagementController', module: RoleManagementController },
    ];

    for (const { name, module } of modules) {
      if (module) {
        console.log(`   ✅ ${name} imported successfully`);
        results.tests.push({ name: `Import ${name}`, status: 'PASS' });
        results.passed++;
      } else {
        throw new Error(`Failed to import ${name}`);
      }
    }
  } catch (error) {
    console.error('   ❌ Module import failed:', error.message);
    results.tests.push({ name: 'Module imports', status: 'FAIL', error: error.message });
    results.failed++;
  }

  // Test 2: Verify middleware configuration
  console.log('\n2️⃣  Testing middleware configuration...');
  try {
    const mockPrisma = {
      appUser: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      outbox: {
        create: jest.fn(),
      },
    };

    const middleware = new RoleContextMiddleware(mockPrisma as any);
    console.log('   ✅ RoleContextMiddleware instantiated');
    results.tests.push({ name: 'Middleware instantiation', status: 'PASS' });
    results.passed++;
  } catch (error) {
    console.error('   ❌ Middleware test failed:', error.message);
    results.tests.push({ name: 'Middleware instantiation', status: 'FAIL', error: error.message });
    results.failed++;
  }

  // Test 3: Verify guard configuration
  console.log('\n3️⃣  Testing guard configuration...');
  try {
    const mockConfig = {
      get: jest.fn().mockReturnValue('test_value'),
    };
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const authGuard = new ClerkAuthGuard(mockConfig as any, mockReflector as any);
    const rolesGuard = new RolesGuard(mockReflector as any);
    
    console.log('   ✅ Guards instantiated successfully');
    results.tests.push({ name: 'Guard instantiation', status: 'PASS' });
    results.passed++;
  } catch (error) {
    console.error('   ❌ Guard test failed:', error.message);
    results.tests.push({ name: 'Guard instantiation', status: 'FAIL', error: error.message });
    results.failed++;
  }

  // Test 4: Test webhook controller
  console.log('\n4️⃣  Testing webhook controller...');
  try {
    const mockPrisma = {
      appUser: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      appUserRoleHistory: {
        create: jest.fn(),
      },
    };
    const mockConfig = {
      get: jest.fn((key) => {
        if (key === 'CLERK_SECRET_KEY') return 'test_secret';
        if (key === 'CLERK_WEBHOOK_SECRET') return 'whsec_test';
        return null;
      }),
    };

    const controller = new ClerkWebhookController(
      mockPrisma as any,
      mockConfig as any
    );
    
    console.log('   ✅ WebhookController instantiated');
    results.tests.push({ name: 'Webhook controller', status: 'PASS' });
    results.passed++;
  } catch (error) {
    console.error('   ❌ Webhook test failed:', error.message);
    results.tests.push({ name: 'Webhook controller', status: 'FAIL', error: error.message });
    results.failed++;
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${results.passed + results.failed}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  
  console.log('\n📋 Detailed Results:');
  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`   ${icon} ${test.name}${test.error ? ': ' + test.error : ''}`);
  });

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The role system build is verified.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Add jest mock
(global as any).jest = {
  fn: () => ({
    mockReturnValue: (value: any) => () => value,
    mockResolvedValue: (value: any) => () => Promise.resolve(value),
  }),
};

verifyBuild().catch(console.error);