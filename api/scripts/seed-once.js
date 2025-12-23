/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

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
        where: { clerkId: seedClerkUserId },
        create: { clerkId: seedClerkUserId, role: 'SUPER_ADMIN' },
        update: { role: 'SUPER_ADMIN' },
      });
      console.log('🌱 Seed: AppUser upserted to SUPER_ADMIN for', seedClerkUserId);
    } else {
      console.log('ℹ️ Seed: SEED_CLERK_USER_ID not provided, skipping AppUser seeding');
    }

    // 3) Seed sample catalog data if empty (products, services, job listings, orders)
    const [productCount, serviceCount, jobCount, orgCount] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.service.count().catch(() => 0),
      prisma.jobListing.count().catch(() => 0),
      prisma.organization.count().catch(() => 0),
    ]);

    let orgId;
    if (orgCount === 0) {
      const org = await prisma.organization.create({
        data: { name: 'Sample Organization', type: 'SERVICE_PROVIDER' },
        select: { id: true },
      });
      orgId = org.id;
      console.log('🌱 Seed: organization created');
    } else {
      const first = await prisma.organization.findFirst({ select: { id: true } });
      orgId = first?.id;
    }

    if (productCount === 0 && orgId) {
      try {
        await prisma.product.create({
          data: {
            title: 'Sample Product',
            description: 'Demo product',
            category: 'general',
            supplierId: orgId,
          },
        });
        console.log('🌱 Seed: product created');
      } catch (err) {
        console.log('⚠️ Seed: product creation skipped (schema mismatch)');
      }
    }

    if (serviceCount === 0 && orgId) {
      try {
        await prisma.service.create({
          data: {
            title: 'Sample Service',
            description: 'Demo service',
            category: 'CLEANING',
            providerId: orgId,
          },
        });
        console.log('🌱 Seed: service created');
      } catch (err) {
        console.log('⚠️ Seed: service creation skipped (schema mismatch)');
      }
    }

    if (jobCount === 0 && orgId) {
      await prisma.jobListing.create({
        data: {
          title: 'Sample Job',
          description: 'Demo job listing',
          foundationId: orgId,
        },
      });
      console.log('🌱 Seed: job listing created');
    }

    // 4) Seed subscription plans (5 plans matching pricing page)
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
        await prisma.subscriptionPlan.create({
          data: plan,
        });
      }
      console.log('🌱 Seed: 5 subscription plans created (matching pricing page)');
    } else {
      console.log('ℹ️ Seed: subscription plans already present');
    }

    // 5) Ensure starter email templates exist (idempotent)
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
    } catch (err) {
      // Older production databases might be missing this table due to historical migration drift.
      // A forward-only migration exists to fix this; don't block deploy if it's not applied yet.
      console.log('⚠️ Seed: email templates skipped (table missing or schema mismatch)');
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

