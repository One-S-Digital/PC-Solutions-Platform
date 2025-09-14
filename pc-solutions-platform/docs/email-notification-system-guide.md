# Email Notification System - Implementation Guide

This guide provides comprehensive documentation for the email notification system implemented in the PC Solutions Platform.

## 📧 Overview

The email notification system provides a complete solution for managing email communications across the platform, including transactional emails, marketing campaigns, and user notifications. It integrates with SendGrid for reliable email delivery and includes comprehensive admin management tools.

## 🚀 Quick Start

### 1. Environment Setup

Add the following environment variables to your `.env` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="Your Platform Name"

# Optional: Custom SMTP (if not using SendGrid)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### 2. Database Migration

Run the Prisma migration to create the email notification tables:

```bash
cd apps/api
npx prisma migrate dev --name add-email-notification-system
```

### 3. Install Dependencies

The system uses the following packages:

```bash
# SendGrid SDK
npm install @sendgrid/mail

# Already included in the project
@nestjs/common
@nestjs/core
prisma
```

## 🏗️ Architecture

### Core Components

#### 1. EmailNotificationService
- **Purpose**: Core email sending and management service
- **Location**: `apps/api/src/email-notification/email-notification.service.ts`
- **Features**:
  - Send individual and bulk emails
  - Schedule delayed emails
  - Process scheduled emails
  - Manage user notification preferences
  - Email analytics and reporting

#### 2. EmailTemplateService
- **Purpose**: Template management and processing
- **Location**: `apps/api/src/email-notification/email-template.service.ts`
- **Features**:
  - Template creation and editing
  - Variable substitution
  - Default template management
  - Template versioning

#### 3. EmailNotificationController
- **Purpose**: Admin API endpoints
- **Location**: `apps/api/src/email-notification/email-notification.controller.ts`
- **Endpoints**:
  - `POST /admin/email-notifications/send` - Send individual email
  - `POST /admin/email-notifications/bulk-send` - Send bulk emails
  - `POST /admin/email-notifications/schedule` - Schedule email
  - `GET /admin/email-notifications/analytics` - Email analytics
  - `GET /admin/email-notifications/templates` - List templates
  - `POST /admin/email-notifications/templates` - Create template
  - `PUT /admin/email-notifications/templates/:id` - Update template
  - `GET /admin/email-notifications/preferences/:userId` - Get user preferences
  - `PUT /admin/email-notifications/preferences/:userId` - Update preferences

### Database Schema

#### EmailTemplate Model
```prisma
model EmailTemplate {
  id          String   @id @default(uuid())
  name        String
  event       String   @unique // Event identifier
  subject     String
  htmlContent String
  textContent String
  variables   String[] // Template variables
  category    String   // Category for grouping
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("email_templates")
}
```

#### EmailLog Model
```prisma
model EmailLog {
  id        String   @id @default(uuid())
  userId    String?
  event     String
  recipient String
  templateId String?
  messageId String? // SendGrid message ID
  status    String   // sent, delivered, opened, clicked, bounced, failed
  payload   Json?    // Template variables used
  error     String?  // Error message if failed
  createdAt DateTime @default(now())
  
  // Relations
  user      User?    @relation("EmailLogs", fields: [userId], references: [id])
  
  @@map("email_logs")
}
```

#### UserNotificationPreferences Model
```prisma
model UserNotificationPreferences {
  id                String   @id @default(uuid())
  userId            String   @unique
  emailNotifications Boolean @default(true)
  
  // Category preferences
  authentication    Boolean @default(true)
  userManagement    Boolean @default(true)
  jobRecruitment    Boolean @default(true)
  messaging         Boolean @default(true)
  marketplace       Boolean @default(true)
  leadManagement    Boolean @default(true)
  subscription      Boolean @default(true)
  contentModeration Boolean @default(true)
  systemAdmin       Boolean @default(true)
  marketing         Boolean @default(true)
  
  // Frequency settings
  frequency         String   @default("immediate")
  
  // Quiet hours
  quietHoursEnabled Boolean @default(false)
  quietHoursStart   String?
  quietHoursEnd     String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  user              User     @relation("NotificationPreferences", fields: [userId], references: [id])
  
  @@map("user_notification_preferences")
}
```

## 📋 Notification Categories

### Authentication & Security (Mandatory)
- **account_verification**: Email verification for new accounts
- **password_reset**: Password reset requests
- **login_alert**: New login notifications
- **security_breach**: Security incident alerts

### User Management
- **welcome_email**: Welcome message for new users
- **profile_update**: Profile change notifications
- **role_change**: Role assignment notifications
- **account_suspension**: Account suspension alerts

### Job & Recruitment
- **job_application_received**: Application confirmation
- **application_status_update**: Application status changes
- **job_match**: Job matching notifications

### Messaging
- **new_message**: New message notifications
- **group_message**: Group message alerts
- **message_mention**: Mention notifications

### Marketplace & Orders
- **order_confirmation**: Order confirmation emails
- **order_status_update**: Order status changes
- **payment_confirmation**: Payment confirmations

### Lead Management
- **lead_assignment**: Lead assignment notifications
- **lead_status_update**: Lead status changes
- **follow_up_reminder**: Follow-up reminders

### Subscription & Billing (Mandatory)
- **subscription_activation**: Subscription activation
- **payment_reminder**: Payment reminders
- **subscription_change**: Subscription changes
- **subscription_cancellation**: Cancellation confirmations

### Content Moderation
- **content_approval**: Content approval notifications
- **content_flagged**: Content flagging alerts
- **moderation_required**: Moderation queue notifications

### System & Admin
- **system_maintenance**: Maintenance notifications
- **system_alert**: System alerts
- **security_alert**: Security notifications

## 🎨 Template System

### Template Variables

Templates support variable substitution using `{{variableName}}` syntax:

```html
<h1>Hello {{firstName}}!</h1>
<p>Welcome to {{platformName}}.</p>
<a href="{{verificationUrl}}">Verify your account</a>
```

### Default Templates

The system includes default templates for all notification types:

#### Account Verification Template
```html
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
```

### Creating Custom Templates

#### Via Admin Interface
1. Navigate to `/admin/email-notifications`
2. Click "Create Template"
3. Fill in template details:
   - **Name**: Template display name
   - **Event**: Event identifier (e.g., `custom_welcome`)
   - **Subject**: Email subject line
   - **HTML Content**: HTML email body
   - **Text Content**: Plain text version
   - **Variables**: List of template variables
   - **Category**: Template category

#### Via API
```typescript
const template = await emailTemplateService.createTemplate({
  name: 'Custom Welcome Email',
  event: 'custom_welcome',
  subject: 'Welcome {{firstName}}!',
  htmlContent: '<h1>Welcome {{firstName}}!</h1>',
  textContent: 'Welcome {{firstName}}!',
  variables: ['firstName', 'lastName'],
  category: 'userManagement',
  isActive: true,
});
```

## 🔧 Usage Examples

### Sending Individual Emails

```typescript
// Via Service
await emailNotificationService.sendNotification({
  event: 'account_verification',
  recipient: 'user@example.com',
  recipientName: 'John Doe',
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    verificationUrl: 'https://platform.com/verify?token=abc123',
  },
});

// Via API
const response = await fetch('/api/admin/email-notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event: 'account_verification',
    recipient: 'user@example.com',
    recipientName: 'John Doe',
    payload: {
      firstName: 'John',
      lastName: 'Doe',
      verificationUrl: 'https://platform.com/verify?token=abc123',
    },
  }),
});
```

### Sending Bulk Emails

```typescript
// Via Service
const result = await emailNotificationService.sendBulkNotification(
  ['user1@example.com', 'user2@example.com'],
  'newsletter',
  {
    firstName: 'Subscriber',
    newsletterContent: 'Latest updates...',
  }
);

// Via API
const response = await fetch('/api/admin/email-notifications/bulk-send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipients: ['user1@example.com', 'user2@example.com'],
    event: 'newsletter',
    payload: {
      firstName: 'Subscriber',
      newsletterContent: 'Latest updates...',
    },
  }),
});
```

### Scheduling Emails

```typescript
// Via Service
await emailNotificationService.scheduleNotification(
  {
    event: 'reminder',
    recipient: 'user@example.com',
    payload: { message: 'Don\'t forget to complete your profile!' },
  },
  new Date('2024-01-15T10:00:00Z')
);

// Via API
const response = await fetch('/api/admin/email-notifications/schedule', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    notification: {
      event: 'reminder',
      recipient: 'user@example.com',
      payload: { message: 'Don\'t forget to complete your profile!' },
    },
    scheduledAt: '2024-01-15T10:00:00Z',
  }),
});
```

### Managing User Preferences

```typescript
// Get user preferences
const preferences = await emailNotificationService.getNotificationPreferences(userId);

// Update preferences
await emailNotificationService.updateNotificationPreferences(userId, {
  emailNotifications: true,
  categories: {
    authentication: true, // Mandatory
    userManagement: true,
    jobRecruitment: false,
    messaging: true,
    marketplace: false,
    leadManagement: true,
    subscription: true, // Mandatory
    contentModeration: false,
    systemAdmin: true,
    marketing: false,
  },
  frequency: 'immediate',
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
});
```

## 📊 Analytics & Monitoring

### Email Analytics

```typescript
// Get analytics for last 30 days
const analytics = await emailNotificationService.getEmailAnalytics('30d');

// Response structure
{
  totalSent: 1250,
  totalDelivered: 1200,
  totalOpened: 800,
  totalClicked: 200,
  deliveryRate: 96.0,
  openRate: 66.7,
  clickRate: 25.0,
  eventsBreakdown: [
    { event: 'account_verification', count: 150 },
    { event: 'welcome_email', count: 200 },
    { event: 'newsletter', count: 500 },
    // ...
  ]
}
```

### Email Logs

```typescript
// Query email logs
const logs = await prisma.emailLog.findMany({
  where: {
    createdAt: {
      gte: new Date('2024-01-01'),
    },
  },
  orderBy: { createdAt: 'desc' },
  take: 100,
});
```

## 🛡️ Security & Best Practices

### Domain Authentication

1. **SPF Record**: Add SendGrid's SPF record to your DNS
   ```
   v=spf1 include:sendgrid.net ~all
   ```

2. **DKIM**: Configure DKIM authentication in SendGrid dashboard

3. **DMARC**: Set up DMARC policy
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

### Rate Limiting

The system includes built-in rate limiting:
- **Individual emails**: No limit (transactional)
- **Bulk emails**: 100 emails per batch
- **Scheduled emails**: Processed every 5 minutes

### Error Handling

```typescript
try {
  const success = await emailNotificationService.sendNotification(notification);
  if (!success) {
    // Handle failed email
    console.error('Email sending failed');
  }
} catch (error) {
  // Handle service errors
  console.error('Email service error:', error);
}
```

### Template Security

- **Variable Validation**: All template variables are validated
- **HTML Sanitization**: Consider sanitizing user-provided content
- **XSS Protection**: Templates are processed server-side only

## 🔄 Integration Points

### User Registration
```typescript
// In user registration service
await emailNotificationService.sendNotification({
  event: 'account_verification',
  recipient: user.email,
  recipientName: user.firstName,
  payload: {
    firstName: user.firstName,
    lastName: user.lastName,
    verificationUrl: `${process.env.FRONTEND_URL}/verify?token=${verificationToken}`,
  },
});
```

### Job Applications
```typescript
// In job application service
await emailNotificationService.sendNotification({
  event: 'job_application_received',
  recipient: applicant.email,
  recipientName: applicant.firstName,
  payload: {
    firstName: applicant.firstName,
    jobTitle: job.title,
    organizationName: organization.name,
    applicationDate: new Date().toLocaleDateString(),
    responseTime: '5-7 business days',
  },
});
```

### Subscription Changes
```typescript
// In subscription service
await emailNotificationService.sendNotification({
  event: 'subscription_activation',
  recipient: user.email,
  recipientName: user.firstName,
  payload: {
    firstName: user.firstName,
    planName: subscription.planName,
    price: subscription.price,
    billingPeriod: subscription.billingPeriod,
    nextBillingDate: subscription.nextBillingDate.toLocaleDateString(),
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
  },
});
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Set up SendGrid account and obtain API key
- [ ] Configure environment variables
- [ ] Set up domain authentication (SPF, DKIM, DMARC)
- [ ] Test email delivery with test templates
- [ ] Configure webhooks for delivery tracking

### Post-Deployment
- [ ] Monitor email delivery rates
- [ ] Set up alerts for failed emails
- [ ] Configure bounce handling
- [ ] Test all notification flows
- [ ] Train admin users on template management

### Monitoring
- [ ] Set up email analytics dashboard
- [ ] Monitor bounce rates and spam complaints
- [ ] Track email engagement metrics
- [ ] Set up alerts for delivery issues

## 🆘 Troubleshooting

### Common Issues

#### Emails Not Sending
1. Check SendGrid API key configuration
2. Verify FROM_EMAIL domain authentication
3. Check email logs for error messages
4. Ensure template exists and is active

#### Low Delivery Rates
1. Check domain reputation
2. Verify SPF/DKIM/DMARC configuration
3. Monitor bounce rates
4. Review email content for spam triggers

#### Template Variables Not Working
1. Verify variable names match exactly
2. Check payload contains all required variables
3. Ensure template is active
4. Test with simple variables first

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will provide detailed logs for email sending, template processing, and error handling.

## 📚 Additional Resources

- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
- [Email Deliverability Best Practices](https://sendgrid.com/blog/email-deliverability-best-practices/)
- [DMARC Configuration Guide](https://dmarc.org/wiki/FAQ)
- [Email Template Design Guidelines](https://www.campaignmonitor.com/dev-resources/guides/email-marketing-best-practices/)

---

This email notification system provides a robust foundation for all platform communications. For additional support or customization requests, please refer to the development team.