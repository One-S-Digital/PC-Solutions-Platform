/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

/**
 * Seed tracking utility - ensures each seed runs only once
 * Seeds are tracked in the `seed_records` table
 * 
 * This script only seeds ESSENTIAL configuration data:
 * - Frontend settings (app configuration)
 * - Super admin user (if SEED_CLERK_USER_ID provided)
 * - Subscription plans (required for subscription system)
 * - Email templates (required for email functionality)
 * 
 * NO demo/mock data is seeded.
 */

const SEED_VERSION = '1.0.0';

async function isSeedCompleted(prisma, seedName) {
  try {
    const record = await prisma.seedRecord.findUnique({
      where: { seedName },
    });
    return !!record;
  } catch (err) {
    // Table might not exist yet (first migration)
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return false;
    }
    console.warn(`⚠️ Seed: Could not check seed status for ${seedName}:`, err.message);
    return false;
  }
}

async function markSeedCompleted(prisma, seedName, metadata = {}) {
  try {
    await prisma.seedRecord.create({
      data: {
        seedName,
        version: SEED_VERSION,
        executedBy: 'seed-once.js',
        metadata,
      },
    });
    console.log(`📝 Seed: Marked ${seedName} as completed`);
  } catch (err) {
    // Table might not exist yet - that's okay, seed will run again next time
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      console.warn(`⚠️ Seed: Could not mark ${seedName} as completed (table not yet created)`);
      return;
    }
    console.warn(`⚠️ Seed: Could not mark ${seedName} as completed:`, err.message);
  }
}

async function ensureSeedRecordsTable(prisma) {
  // Try to create the seed_records table if it doesn't exist
  // This is a fallback for when migrations haven't run yet
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS seed_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seed_name VARCHAR(255) UNIQUE NOT NULL,
        version VARCHAR(50),
        executed_at TIMESTAMP DEFAULT NOW(),
        executed_by VARCHAR(255),
        metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_seed_records_seed_name ON seed_records(seed_name);
    `);
  } catch (err) {
    // Ignore errors - table might already exist or we might not have permissions
    // The seed will still work, it just won't track completion
  }
}

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

    // Ensure seed_records table exists
    await ensureSeedRecordsTable(prisma);

    // 1) Seed frontend_settings (one-time) - ESSENTIAL CONFIG
    const frontendSettingsSeedName = 'frontend_settings_v1';
    if (await isSeedCompleted(prisma, frontendSettingsSeedName)) {
      console.log('ℹ️ Seed: frontend_settings already seeded (tracked)');
    } else {
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
      await markSeedCompleted(prisma, frontendSettingsSeedName);
    }

    // 2) Seed SUPER_ADMIN AppUser if SEED_CLERK_USER_ID provided (one-time per user) - ESSENTIAL CONFIG
    if (seedClerkUserId) {
      const appUserSeedName = `appuser_superadmin_${seedClerkUserId}`;
      if (await isSeedCompleted(prisma, appUserSeedName)) {
        console.log('ℹ️ Seed: AppUser SUPER_ADMIN already seeded (tracked)');
      } else {
        await prisma.appUser.upsert({
          where: { clerkId: seedClerkUserId },
          create: { clerkId: seedClerkUserId, role: 'SUPER_ADMIN' },
          update: { role: 'SUPER_ADMIN' },
        });
        console.log('🌱 Seed: AppUser upserted to SUPER_ADMIN for', seedClerkUserId);
        await markSeedCompleted(prisma, appUserSeedName, { clerkId: seedClerkUserId });
      }
    } else {
      console.log('ℹ️ Seed: SEED_CLERK_USER_ID not provided, skipping AppUser seeding');
    }

    // 3) Seed subscription plans - 5 plans matching pricing page (one-time) - ESSENTIAL CONFIG
    // These are required for the subscription system to work properly
    const subscriptionPlansSeedName = 'subscription_plans_v1';
    if (await isSeedCompleted(prisma, subscriptionPlansSeedName)) {
      console.log('ℹ️ Seed: subscription plans already seeded (tracked)');
    } else {
      const subscriptionPlanCount = await prisma.subscriptionPlan.count().catch(() => 0);
      if (subscriptionPlanCount === 0) {
        const subscriptionPlans = [
          {
            name: 'Basic',
            code: 'BASIC',
            description: 'Perfect for small daycares who want essential tools without complexity.',
            price: 69.00,
            currency: 'CHF',
            billingPeriod: 'monthly',
            features: [
              'Supplier & service provider marketplace',
              'State policy hub (by canton)',
              'Multilingual interface (EN/FR/DE)',
              'Email support',
            ],
            limits: { parentEnquiries: 0, marketplace: true, policyHub: true, multiLanguage: true },
            allowedRoles: ['FOUNDATION'],
            trialDays: 14,
            isActive: true,
            isPopular: false,
            displayOrder: 1,
          },
          {
            name: 'Essential',
            code: 'ESSENTIAL',
            description: 'Perfect for single-site daycares who want to save time with parent leads and compliant HR tools.',
            price: 129.00,
            currency: 'CHF',
            billingPeriod: 'monthly',
            features: [
              'Everything in Basic',
              'Parent leads inbox + auto-matching system',
              'HR & compliance document library (Swiss-validated)',
              'Parent enquiry tracker with quick replies',
            ],
            limits: { parentEnquiries: 15, marketplace: true, policyHub: true, multiLanguage: true, hrLibrary: true, parentLeads: true },
            allowedRoles: ['FOUNDATION'],
            trialDays: 14,
            isActive: true,
            isPopular: true,
            displayOrder: 2,
          },
          {
            name: 'Professional',
            code: 'PROFESSIONAL',
            description: 'Perfect for medium-sized daycares ready to grow and professionalize operations.',
            price: 259.00,
            currency: 'CHF',
            billingPeriod: 'monthly',
            features: [
              'Everything in Essential',
              'Recruitment module',
              'Unlimited parent enquiries',
              'E-learning for staff',
              'Team management & tools',
              'Priority support',
            ],
            limits: { parentEnquiries: -1, marketplace: true, policyHub: true, multiLanguage: true, hrLibrary: true, parentLeads: true, recruitment: true, eLearning: true, teamManagement: true },
            allowedRoles: ['FOUNDATION'],
            trialDays: 14,
            isActive: true,
            isPopular: false,
            displayOrder: 3,
          },
          {
            name: 'Suppliers',
            code: 'SUPPLIERS',
            description: 'Perfect for suppliers focused on daycare market growth. Pricing based on enquiry.',
            price: 0,
            currency: 'CHF',
            billingPeriod: 'enquiry',
            features: [
              'Product listings & marketplace access',
              'Lead management system',
              'Order tracking & fulfillment',
              'Multi-language support',
              'Sales analytics dashboard',
              'Email support',
            ],
            limits: { productListings: -1, marketplace: true, leadManagement: true, orderTracking: true, analytics: true },
            allowedRoles: ['PRODUCT_SUPPLIER'],
            trialDays: 0,
            isActive: true,
            isPopular: false,
            displayOrder: 4,
          },
          {
            name: 'Service Providers',
            code: 'SERVICE_PROVIDERS',
            description: 'Perfect for service providers targeting professional daycare partnerships. Pricing based on enquiry.',
            price: 0,
            currency: 'CHF',
            billingPeriod: 'enquiry',
            features: [
              'Service listings & marketplace access',
              'Appointment scheduling system',
              'Client relationship management',
              'Revenue tracking & reporting',
              'Multi-language support',
              'Priority support',
            ],
            limits: { serviceListings: -1, marketplace: true, scheduling: true, crm: true, revenueTracking: true },
            allowedRoles: ['SERVICE_PROVIDER'],
            trialDays: 0,
            isActive: true,
            isPopular: false,
            displayOrder: 5,
          },
        ];

        for (const plan of subscriptionPlans) {
          try {
            await prisma.subscriptionPlan.upsert({
              where: { code: plan.code },
              update: plan,
              create: plan,
            });
          } catch (err) {
            console.warn(`⚠️ Seed: Failed to seed plan ${plan.name}:`, err.message);
          }
        }
        console.log('🌱 Seed: 5 subscription plans created (matching pricing page)');
      } else {
        console.log('ℹ️ Seed: subscription plans already present');
      }
      await markSeedCompleted(prisma, subscriptionPlansSeedName, { planCount: 5 });
    }

    // 4) Seed email templates (one-time) - ESSENTIAL CONFIG
    const emailTemplatesSeedName = 'email_templates_v1';
    if (await isSeedCompleted(prisma, emailTemplatesSeedName)) {
      console.log('ℹ️ Seed: email templates already seeded (tracked)');
    } else {
      const emailTemplates = [
        {
          name: 'Account verification',
          event: 'account_verification',
          subject: 'Verify Your Account - Pro Crèche Solutions',
          category: 'authentication',
          variables: ['firstName', 'verificationUrl'],
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to Pro Crèche Solutions!</h2>
              <p>Hello {{firstName}},</p>
              <p>Thank you for registering with Pro Crèche Solutions. Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{verificationUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
              </div>
              <p>If you didn't create an account, please ignore this email.</p>
              <p>Best regards,<br>The Pro Crèche Solutions Team</p>
            </div>
          `,
          textContent: `
            Welcome to Pro Crèche Solutions!

            Hello {{firstName}},

            Thank you for registering with Pro Crèche Solutions. Please verify your email address by visiting the following link:

            {{verificationUrl}}

            If you didn't create an account, please ignore this email.

            Best regards,
            The Pro Crèche Solutions Team
          `,
        },
        {
          name: 'Password reset',
          event: 'password_reset',
          subject: 'Reset Your Password - Pro Crèche Solutions',
          category: 'authentication',
          variables: ['firstName', 'resetUrl'],
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>Hello {{firstName}},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
              </div>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <p>Best regards,<br>The Pro Crèche Solutions Team</p>
            </div>
          `,
          textContent: `
            Password Reset Request

            Hello {{firstName}},

            We received a request to reset your password. Visit the following link to create a new password:

            {{resetUrl}}

            This link will expire in 1 hour for security reasons.

            If you didn't request this password reset, please ignore this email.

            Best regards,
            The Pro Crèche Solutions Team
          `,
        },
        {
          name: 'Welcome email',
          event: 'welcome_email',
          subject: 'Welcome to Pro Crèche Solutions!',
          category: 'userManagement',
          variables: ['firstName', 'dashboardUrl'],
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to Pro Crèche Solutions!</h2>
              <p>Hello {{firstName}},</p>
              <p>Welcome to Pro Crèche Solutions! We're excited to have you join our community of childcare professionals.</p>
              <p>Here's what you can do next:</p>
              <ul>
                <li>Complete your profile</li>
                <li>Explore job opportunities</li>
                <li>Connect with organizations</li>
                <li>Browse our marketplace</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Get Started</a>
              </div>
              <p>If you have any questions, feel free to contact our support team.</p>
              <p>Best regards,<br>The Pro Crèche Solutions Team</p>
            </div>
          `,
          textContent: `
            Welcome to Pro Crèche Solutions!

            Hello {{firstName}},

            Welcome to Pro Crèche Solutions! We're excited to have you join our community of childcare professionals.

            Here's what you can do next:
            - Complete your profile
            - Explore job opportunities
            - Connect with organizations
            - Browse our marketplace

            Get started: {{dashboardUrl}}

            If you have any questions, feel free to contact our support team.

            Best regards,
            The Pro Crèche Solutions Team
          `,
        },
        {
          name: 'New message',
          event: 'new_message',
          subject: 'New Message from {{senderName}}',
          category: 'messaging',
          variables: ['firstName', 'senderName', 'messagePreview', 'messageUrl'],
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>New Message</h2>
              <p>Hello {{firstName}},</p>
              <p>You have received a new message from <strong>{{senderName}}</strong>:</p>
              <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;">{{messagePreview}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{messageUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Message</a>
              </div>
              <p>Best regards,<br>The Pro Crèche Solutions Team</p>
            </div>
          `,
          textContent: `
            New Message

            Hello {{firstName}},

            You have received a new message from {{senderName}}:

            {{messagePreview}}

            View message: {{messageUrl}}

            Best regards,
            The Pro Crèche Solutions Team
          `,
        },
      ];

      try {
        for (const tpl of emailTemplates) {
          await prisma.emailTemplate.upsert({
            where: { event: tpl.event },
            update: {
              name: tpl.name,
              subject: tpl.subject,
              htmlContent: tpl.htmlContent.trim(),
              textContent: tpl.textContent.trim(),
              variables: tpl.variables,
              category: tpl.category,
              isActive: true,
            },
            create: {
              name: tpl.name,
              event: tpl.event,
              subject: tpl.subject,
              htmlContent: tpl.htmlContent.trim(),
              textContent: tpl.textContent.trim(),
              variables: tpl.variables,
              category: tpl.category,
              isActive: true,
            },
          });
        }
        console.log('🌱 Seed: email templates ensured (4)');
        await markSeedCompleted(prisma, emailTemplatesSeedName, { templateCount: 4 });
      } catch (err) {
        // Older production databases might be missing this table due to historical migration drift.
        console.log('⚠️ Seed: email templates skipped (table missing or schema mismatch)');
      }
    }

    console.log('✅ Seed: completed');

    // 5) Feature flags — always upsert (idempotent, must reflect current desired state)
    await seedFeatureFlags(prisma);
    console.log('✅ Feature flags: ensured');
  } catch (err) {
    console.error('❌ Seed failed:', err?.message || err);
    // Do not block build on seed failure
  } finally {
    await prisma.$disconnect();
  }
}

async function seedFeatureFlags(prisma) {
  const flags = [
    {
      key: 'ai_assistant_enabled',
      name: 'AI Assistant',
      description: 'MVP M1 — ProCrèche Virtual Assistant (conversation, SSE streaming, tool orchestration)',
      isActive: true,
      rolloutPercentage: 100,
      targetSegments: [],
      conditions: {},
    },
    {
      key: 'v2_assistant_dashboard',
      name: 'Assistant Dashboard (v2)',
      description: 'v2 remodel: assistant-first Foundation workspace — /foundation/assistant becomes the default landing view',
      isActive: true,
      rolloutPercentage: 100,
      targetSegments: [],
      conditions: { userRoles: ['FOUNDATION'] },
    },
    {
      key: 'v2_admin_assistant',
      name: 'Admin Assistant Workspace (v2)',
      description: 'v2 remodel: assistant-first admin workspace — /assistant becomes the default admin landing view',
      isActive: true,
      rolloutPercentage: 100,
      targetSegments: [],
      conditions: { userRoles: ['ADMIN', 'SUPER_ADMIN'] },
    },
  ];

  for (const flag of flags) {
    try {
      await prisma.featureFlag.upsert({
        where: { key: flag.key },
        update: {
          isActive: flag.isActive,
          rolloutPercentage: flag.rolloutPercentage,
          targetSegments: flag.targetSegments,
          conditions: flag.conditions,
        },
        create: flag,
      });
      console.log(`🚩 Feature flag ensured: ${flag.key}`);
    } catch (err) {
      console.warn(`⚠️ Feature flag upsert failed for ${flag.key}:`, err.message);
    }
  }
}

main();
