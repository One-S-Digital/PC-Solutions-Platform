import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed process...');

  // 1. Create Plans and Prices
  console.log('📋 Creating plans and prices...');
  await seedPlansAndPrices();

  // 2. Create Subscription Plans (for admin subscription management)
  console.log('📋 Creating subscription plans...');
  await seedSubscriptionPlans();

  // 3. Test users removed for production

  // 4. Create Enterprise Tenant Structure
  console.log('🏢 Creating enterprise tenant structure...');
  await seedEnterpriseStructure();

  // 5. Create Sample Content
  console.log('📄 Creating sample content...');
  await seedSampleContent();

  // 6. Create Feature Flags
  console.log('🚩 Setting up feature flags...');
  await seedFeatureFlags();

  // 6b. AI Foundation feature flag
  console.log('🤖 Setting up AI Foundation feature flag...');
  await seedAiFoundationFlag();

  // 6c. AI Assistant feature flag
  console.log('🤖 Setting up AI Assistant feature flag...');
  await seedAiAssistantFlag();

  // 6d. Assistant workspace (v2 dashboard) feature flag
  console.log('🤖 Setting up Assistant Dashboard feature flag...');
  await seedAssistantDashboardFlag();

  // 7. Create Email Templates (for admin email template management)
  console.log('📧 Creating email templates...');
  await seedEmailTemplates();

  console.log('✅ Seeding completed successfully!');
}

async function seedEmailTemplates() {
  const templates = [
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
    // Billing templates — referenced by billing flow but were never seeded (silent failure)
    {
      name: 'Payment reminder',
      event: 'payment_reminder',
      subject: 'Payment Reminder - Pro Crèche Solutions',
      category: 'subscription',
      variables: ['firstName', 'amount', 'dueDate', 'invoiceUrl'],
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder</h2>
          <p>Hello {{firstName}},</p>
          <p>This is a friendly reminder that a payment of <strong>{{amount}}</strong> is due on <strong>{{dueDate}}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{invoiceUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Invoice</a>
          </div>
          <p>If you have already made this payment, please disregard this message.</p>
          <p>Best regards,<br>The Pro Crèche Solutions Team</p>
        </div>
      `,
      textContent: `
        Payment Reminder

        Hello {{firstName}},

        This is a friendly reminder that a payment of {{amount}} is due on {{dueDate}}.

        View your invoice: {{invoiceUrl}}

        If you have already made this payment, please disregard this message.

        Best regards,
        The Pro Crèche Solutions Team
      `,
    },
    // v2 staffing email templates
    {
      name: 'New application received',
      event: 'new_application',
      subject: 'New Application for {{jobTitle}} - Pro Crèche Solutions',
      category: 'jobRecruitment',
      variables: ['firstName', 'jobTitle', 'candidateName', 'dashboardUrl'],
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Application Received</h2>
          <p>Hello {{firstName}},</p>
          <p><strong>{{candidateName}}</strong> has applied for <strong>{{jobTitle}}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Application</a>
          </div>
          <p>Best regards,<br>The Pro Crèche Solutions Team</p>
        </div>
      `,
      textContent: `
        New Application Received

        Hello {{firstName}},

        {{candidateName}} has applied for {{jobTitle}}.

        Review the application: {{dashboardUrl}}

        Best regards,
        The Pro Crèche Solutions Team
      `,
    },
    {
      name: 'Application status update',
      event: 'application_status_update',
      subject: 'Your Application Status Has Been Updated - Pro Crèche Solutions',
      category: 'jobRecruitment',
      variables: ['firstName', 'jobTitle', 'foundationName', 'newStatus', 'dashboardUrl'],
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Application Status Update</h2>
          <p>Hello {{firstName}},</p>
          <p>Your application for <strong>{{jobTitle}}</strong> at <strong>{{foundationName}}</strong> has been updated to: <strong>{{newStatus}}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View My Applications</a>
          </div>
          <p>Best regards,<br>The Pro Crèche Solutions Team</p>
        </div>
      `,
      textContent: `
        Application Status Update

        Hello {{firstName}},

        Your application for {{jobTitle}} at {{foundationName}} has been updated to: {{newStatus}}.

        View your applications: {{dashboardUrl}}

        Best regards,
        The Pro Crèche Solutions Team
      `,
    },
    {
      name: 'Job match',
      event: 'job_match',
      subject: 'New Job Match: {{jobTitle}} - Pro Crèche Solutions',
      category: 'jobRecruitment',
      variables: ['firstName', 'jobTitle', 'foundationName', 'location', 'contractType', 'applyUrl'],
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>We Found a Job Match For You!</h2>
          <p>Hello {{firstName}},</p>
          <p>A new position that matches your profile has been posted:</p>
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0;">{{jobTitle}}</h3>
            <p style="margin: 4px 0; color: #6B7280;">{{foundationName}}</p>
            <p style="margin: 4px 0; color: #6B7280;">{{location}} · {{contractType}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{applyUrl}}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View &amp; Apply</a>
          </div>
          <p>Best regards,<br>The Pro Crèche Solutions Team</p>
        </div>
      `,
      textContent: `
        We Found a Job Match For You!

        Hello {{firstName}},

        A new position that matches your profile has been posted:

        {{jobTitle}}
        {{foundationName}}
        {{location}} - {{contractType}}

        Apply here: {{applyUrl}}

        Best regards,
        The Pro Crèche Solutions Team
      `,
    },
    {
      name: 'Subscription payment failed',
      event: 'subscription_payment_failed',
      subject: 'Action Required: Payment Failed - Pro Crèche Solutions',
      category: 'subscription',
      variables: ['firstName', 'amount', 'retryDate', 'updatePaymentUrl'],
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Failed</h2>
          <p>Hello {{firstName}},</p>
          <p>We were unable to process your payment of <strong>{{amount}}</strong>. We will retry on <strong>{{retryDate}}</strong>.</p>
          <p>To avoid any interruption to your service, please update your payment details:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{updatePaymentUrl}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Payment Method</a>
          </div>
          <p>If you need assistance, please contact our support team.</p>
          <p>Best regards,<br>The Pro Crèche Solutions Team</p>
        </div>
      `,
      textContent: `
        Payment Failed

        Hello {{firstName}},

        We were unable to process your payment of {{amount}}. We will retry on {{retryDate}}.

        Please update your payment details: {{updatePaymentUrl}}

        If you need assistance, please contact our support team.

        Best regards,
        The Pro Crèche Solutions Team
      `,
    },
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { event: template.event },
      update: {
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent.trim(),
        textContent: template.textContent.trim(),
        variables: template.variables,
        category: template.category,
        isActive: true,
      },
      create: {
        name: template.name,
        event: template.event,
        subject: template.subject,
        htmlContent: template.htmlContent.trim(),
        textContent: template.textContent.trim(),
        variables: template.variables,
        category: template.category,
        isActive: true,
      },
    });
  }

  console.log(`✅ Email templates ensured (${templates.length})`);
}

async function seedPlansAndPrices() {
  // Create plans
  const basicPlan = await prisma.plan.upsert({
    where: { code: 'BASIC' },
    update: {},
    create: {
      code: 'BASIC',
      name: 'Basic Plan',
      description: 'Perfect for small foundations getting started',
      features: [
        'Up to 10 children',
        'Basic reporting',
        'Email support',
        'Standard marketplace access',
      ],
    },
  });

  const essentialPlan = await prisma.plan.upsert({
    where: { code: 'ESSENTIAL' },
    update: {},
    create: {
      code: 'ESSENTIAL',
      name: 'Essential Plan',
      description: 'Ideal for growing foundations',
      features: [
        'Up to 50 children',
        'Advanced reporting',
        'Priority support',
        'Full marketplace access',
        'Team management',
        'Custom branding',
      ],
    },
  });

  const professionalPlan = await prisma.plan.upsert({
    where: { code: 'PROFESSIONAL' },
    update: {},
    create: {
      code: 'PROFESSIONAL',
      name: 'Professional Plan',
      description: 'For established foundations and organizations',
      features: [
        'Unlimited children',
        'Advanced analytics',
        '24/7 support',
        'Full marketplace access',
        'Advanced team management',
        'Custom branding',
        'API access',
        'White-label options',
      ],
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: {
      code: 'ENTERPRISE',
      name: 'Enterprise Plan',
      description: 'For large organizations with custom needs',
      features: [
        'Unlimited everything',
        'Custom analytics',
        'Dedicated support',
        'Full marketplace access',
        'Advanced team management',
        'Custom branding',
        'Full API access',
        'White-label options',
        'Custom integrations',
        'SLA guarantee',
      ],
    },
  });

  // Create plan prices (these would be set to actual Stripe price IDs in production)
  const plans = [basicPlan, essentialPlan, professionalPlan, enterprisePlan];
  
  for (const plan of plans) {
    // Monthly recurring prices
    await prisma.planPrice.upsert({
      where: { 
        planId_cadence_kind: {
          planId: plan.id,
          cadence: 'monthly',
          kind: 'recurring',
        }
      },
      update: {},
      create: {
        planId: plan.id,
        cadence: 'monthly',
        kind: 'recurring',
        stripePriceId: `price_monthly_${plan.code.toLowerCase()}_recurring`,
        amount: getMonthlyPrice(plan.code),
      },
    });

    // Annual recurring prices
    await prisma.planPrice.upsert({
      where: { 
        planId_cadence_kind: {
          planId: plan.id,
          cadence: 'annual',
          kind: 'recurring',
        }
      },
      update: {},
      create: {
        planId: plan.id,
        cadence: 'annual',
        kind: 'recurring',
        stripePriceId: `price_annual_${plan.code.toLowerCase()}_recurring`,
        amount: getAnnualRecurringPrice(plan.code),
      },
    });

    // Annual one-time prices
    await prisma.planPrice.upsert({
      where: { 
        planId_cadence_kind: {
          planId: plan.id,
          cadence: 'annual',
          kind: 'one_time',
        }
      },
      update: {},
      create: {
        planId: plan.id,
        cadence: 'annual',
        kind: 'one_time',
        stripePriceId: `price_annual_${plan.code.toLowerCase()}_onetime`,
        amount: getAnnualOnetimePrice(plan.code),
      },
    });
  }
}

// Test users seeding removed for production - users should be created through Clerk authentication

async function seedSubscriptionPlans() {
  // Create subscription plans matching the 5 plans on the pricing page
  // These are used by the admin subscription management system

  // 1. Foundation Basic - CHF 69/month
  await prisma.subscriptionPlan.upsert({
    where: { code: 'BASIC' },
    update: {
      name: 'Basic',
      description: 'Perfect for small daycares who want essential tools without complexity. Get immediate access to suppliers, compliance info, and support.',
      price: 69.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Supplier & service provider marketplace',
        'State policy hub (by canton)',
        'Multilingual interface (EN/FR/DE)',
        'Email support',
      ],
      limits: {
        parentEnquiries: 0,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
    create: {
      name: 'Basic',
      code: 'BASIC',
      description: 'Perfect for small daycares who want essential tools without complexity. Get immediate access to suppliers, compliance info, and support.',
      price: 69.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Supplier & service provider marketplace',
        'State policy hub (by canton)',
        'Multilingual interface (EN/FR/DE)',
        'Email support',
      ],
      limits: {
        parentEnquiries: 0,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
  });

  // 2. Foundation Essential - CHF 129/month (Popular)
  await prisma.subscriptionPlan.upsert({
    where: { code: 'ESSENTIAL' },
    update: {
      name: 'Essential',
      description: 'Perfect for single-site daycares who want to save time with parent leads and compliant HR tools. Win parents faster, stay compliant, and manage enquiries with ease.',
      price: 129.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Everything in Basic',
        'Parent leads inbox + auto-matching system',
        'HR & compliance document library (Swiss-validated)',
        'Parent enquiry tracker with quick replies',
      ],
      limits: {
        parentEnquiries: 15,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
    create: {
      name: 'Essential',
      code: 'ESSENTIAL',
      description: 'Perfect for single-site daycares who want to save time with parent leads and compliant HR tools. Win parents faster, stay compliant, and manage enquiries with ease.',
      price: 129.00,
      currency: 'CHF',
      billingPeriod: 'monthly',
      features: [
        'Everything in Basic',
        'Parent leads inbox + auto-matching system',
        'HR & compliance document library (Swiss-validated)',
        'Parent enquiry tracker with quick replies',
      ],
      limits: {
        parentEnquiries: 15,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
  });

  // 3. Foundation Professional - CHF 259/month
  await prisma.subscriptionPlan.upsert({
    where: { code: 'PROFESSIONAL' },
    update: {
      name: 'Professional',
      description: 'Perfect for medium-sized daycares ready to grow and professionalize operations. Recruit and train staff, handle unlimited parent enquiries, and deliver excellence.',
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
      limits: {
        parentEnquiries: -1,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
        recruitment: true,
        eLearning: true,
        teamManagement: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 3,
    },
    create: {
      name: 'Professional',
      code: 'PROFESSIONAL',
      description: 'Perfect for medium-sized daycares ready to grow and professionalize operations. Recruit and train staff, handle unlimited parent enquiries, and deliver excellence.',
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
      limits: {
        parentEnquiries: -1,
        marketplace: true,
        policyHub: true,
        multiLanguage: true,
        hrLibrary: true,
        parentLeads: true,
        recruitment: true,
        eLearning: true,
        teamManagement: true,
      },
      allowedRoles: ['FOUNDATION'],
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 3,
    },
  });

  // 4. Suppliers - Enquiry-based pricing
  await prisma.subscriptionPlan.upsert({
    where: { code: 'SUPPLIERS' },
    update: {
      name: 'Suppliers',
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
      limits: {
        productListings: -1,
        marketplace: true,
        leadManagement: true,
        orderTracking: true,
        analytics: true,
      },
      allowedRoles: ['PRODUCT_SUPPLIER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 4,
    },
    create: {
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
      limits: {
        productListings: -1,
        marketplace: true,
        leadManagement: true,
        orderTracking: true,
        analytics: true,
      },
      allowedRoles: ['PRODUCT_SUPPLIER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 4,
    },
  });

  // 5. Service Providers - Enquiry-based pricing
  await prisma.subscriptionPlan.upsert({
    where: { code: 'SERVICE_PROVIDERS' },
    update: {
      name: 'Service Providers',
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
      limits: {
        serviceListings: -1,
        marketplace: true,
        scheduling: true,
        crm: true,
        revenueTracking: true,
      },
      allowedRoles: ['SERVICE_PROVIDER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 5,
    },
    create: {
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
      limits: {
        serviceListings: -1,
        marketplace: true,
        scheduling: true,
        crm: true,
        revenueTracking: true,
      },
      allowedRoles: ['SERVICE_PROVIDER'],
      trialDays: 0,
      isActive: true,
      isPopular: false,
      displayOrder: 5,
    },
  });

  console.log('✅ Subscription plans created successfully (5 plans matching pricing page)');
}

async function seedEnterpriseStructure() {
  // Create Sunrise Group enterprise
  const sunriseGroup = await prisma.organization.upsert({
    where: { name: 'Sunrise Group' },
    update: {},
    create: {
      name: 'Sunrise Group',
      type: 'FOUNDATION',
      region: 'Vaud',
      description: 'Leading childcare enterprise with multiple branches',
      canton: 'VD',
      languages: ['French', 'English'],
      capacity: 200,
      pedagogy: ['Montessori', 'Reggio Emilia'],
    },
  });

  // Create branches
  const pullyBranch = await prisma.organization.upsert({
    where: { name: 'Sunrise Group - Pully' },
    update: {},
    create: {
      name: 'Sunrise Group - Pully',
      type: 'FOUNDATION',
      region: 'Vaud',
      description: 'Pully branch of Sunrise Group',
      canton: 'VD',
      languages: ['French'],
      capacity: 50,
      pedagogy: ['Montessori'],
    },
  });

  const lausanneBranch = await prisma.organization.upsert({
    where: { name: 'Sunrise Group - Lausanne' },
    update: {},
    create: {
      name: 'Sunrise Group - Lausanne',
      type: 'FOUNDATION',
      region: 'Vaud',
      description: 'Lausanne branch of Sunrise Group',
      canton: 'VD',
      languages: ['French', 'English'],
      capacity: 75,
      pedagogy: ['Reggio Emilia'],
    },
  });

  // Create Fribourg branch for testing
  const fribourgBranch = await prisma.organization.upsert({
    where: { name: 'Sunrise Group - Fribourg' },
    update: {},
    create: {
      name: 'Sunrise Group - Fribourg',
      type: 'FOUNDATION',
      region: 'Fribourg',
      description: 'Fribourg branch of Sunrise Group',
      canton: 'FR',
      languages: ['French', 'German'],
      capacity: 40,
      pedagogy: ['Montessori'],
    },
  });

  // Note: Users should be created through Clerk authentication and manually assigned to organizations
  // via the admin interface or a separate onboarding process.
}

async function seedSampleContent() {
  // Create sample products
  const supplierOrg = await prisma.organization.findFirst({ where: { type: 'PRODUCT_SUPPLIER' } });
  if (supplierOrg) {
    await prisma.product.upsert({
      where: { title: 'Educational Toys Set' },
      update: {},
      create: {
        title: 'Educational Toys Set',
        description: 'High-quality educational toys for early childhood development',
        price: 89.90,
        category: 'Educational Materials',
        tags: ['toys', 'education', 'children'],
        supplierId: supplierOrg.id,
      },
    });
  }

  // Create sample job listings
  const foundationOrg = await prisma.organization.findFirst({ where: { type: 'FOUNDATION' } });
  if (foundationOrg) {
    await prisma.jobListing.upsert({
      where: { title: 'Early Childhood Educator' },
      update: {},
      create: {
        title: 'Early Childhood Educator',
        description: 'We are looking for a passionate educator to join our team',
        requirements: ['Early childhood education degree', 'French language proficiency'],
        responsibilities: ['Plan and deliver engaging activities', 'Collaborate with parents and caregivers'],
        qualifications: ['Bachelor’s degree in Early Childhood Education or equivalent'],
        location: 'Lausanne, Vaud',
        salaryRange: 'CHF 4,500 - CHF 5,500',
        contractType: 'FULL_TIME',
        startDate: new Date(),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        foundationId: foundationOrg.id,
      },
    });
  }

  // Note: Sample conversations should be created after users authenticate through Clerk
  // and can be set up via the application UI or a separate demo data script.
}

async function seedFeatureFlags() {
  // Create system configuration entries for feature flags
  const featureFlags = [
    { key: 'FEATURE_I18N_ENABLED', value: 'true', description: 'Enable internationalization' },
    { key: 'FEATURE_CLAMAV_ENABLED', value: 'true', description: 'Enable ClamAV virus scanning' },
    { key: 'FEATURE_GATED_CONTENT_ENABLED', value: 'true', description: 'Enable gated content features' },
    // v2 staffing remodel rollout flags — default off until each phase is validated
    { key: 'v2_staffing_ia', value: 'false', description: 'v2 remodel: new staffing-centric nav order on admin + foundation sidebars' },
    { key: 'v2_replacement_module', value: 'false', description: 'v2 remodel: replacement staffing module (Phase 3)' },
    { key: 'v2_staffing_emails', value: 'false', description: 'v2 remodel: new staffing email templates (Phase 4)' },
    { key: 'v2_in_app_notifications', value: 'false', description: 'v2 remodel: in-app notification feed (Phase 4)' },
  ];

  for (const flag of featureFlags) {
    await prisma.systemConfiguration.upsert({
      where: { key: flag.key },
      update: { value: flag.value },
      create: {
        key: flag.key,
        value: flag.value,
        description: flag.description,
        category: 'FEATURE_FLAGS',
      },
    });
  }
}

async function seedAiFoundationFlag() {
  await prisma.featureFlag.upsert({
    where: { key: 'ai_foundation_enabled' },
    update: {},
    create: {
      name: 'AI Foundation',
      description: 'Master kill switch for the AI staffing integration layer (Phase 0+)',
      key: 'ai_foundation_enabled',
      isActive: false,
      rolloutPercentage: 0,
      targetSegments: [],
      conditions: {},
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: 'ai_staffing_matching' },
    update: {},
    create: {
      name: 'AI Staffing Matching',
      description: 'Phase 1 — Internal matching MVP: staffing-request-parser + hybrid matcher',
      key: 'ai_staffing_matching',
      isActive: false,
      rolloutPercentage: 0,
      targetSegments: [],
      conditions: {},
    },
  });
}

async function seedAiAssistantFlag() {
  await prisma.featureFlag.upsert({
    where: { key: 'ai_assistant_enabled' },
    update: {},
    create: {
      name: 'AI Assistant',
      description: 'MVP M1 — ProCrèche Virtual Assistant (conversation, SSE streaming, tool orchestration)',
      key: 'ai_assistant_enabled',
      isActive: false,
      rolloutPercentage: 0,
      targetSegments: [],
      conditions: {},
    },
  });
}

async function seedAssistantDashboardFlag() {
  // Default OFF: Foundation users keep landing on /foundation/dashboard.
  // Activate (isActive: true, rolloutPercentage: 100) to make
  // /foundation/assistant the default landing view; the userRoles condition
  // keeps the flag Foundation-only even when fully rolled out.
  await prisma.featureFlag.upsert({
    where: { key: 'v2_assistant_dashboard' },
    update: {},
    create: {
      name: 'Assistant Dashboard (v2)',
      description:
        'v2 remodel: assistant-first Foundation workspace — /foundation/assistant becomes the default landing view with an Assistant | Dashboard toggle',
      key: 'v2_assistant_dashboard',
      isActive: false,
      rolloutPercentage: 0,
      targetSegments: [],
      conditions: { userRoles: ['FOUNDATION'] },
    },
  });
}

function getMonthlyPrice(planCode: string): number {
  switch (planCode) {
    case 'BASIC': return 2900; // CHF 29.00
    case 'ESSENTIAL': return 5900; // CHF 59.00
    case 'PROFESSIONAL': return 9900; // CHF 99.00
    case 'ENTERPRISE': return 19900; // CHF 199.00
    default: return 0;
  }
}

function getAnnualRecurringPrice(planCode: string): number {
  // 20% discount for annual recurring
  const monthlyPrice = getMonthlyPrice(planCode);
  return Math.round(monthlyPrice * 12 * 0.8);
}

function getAnnualOnetimePrice(planCode: string): number {
  // 25% discount for annual one-time
  const monthlyPrice = getMonthlyPrice(planCode);
  return Math.round(monthlyPrice * 12 * 0.75);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });