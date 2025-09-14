# Email Notification System - Quick Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Environment Variables
Add to your `.env` file:
```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="Pro Crèche Solutions"
```

### 2. Database Migration
```bash
cd apps/api
npx prisma migrate dev --name add-email-notification-system
```

### 3. Install SendGrid Package
```bash
npm install @sendgrid/mail
```

### 4. Test Email Sending
Navigate to `/admin/email-notifications` and use the "Send Email" tab to test.

## 📧 Available Notification Types

### Authentication & Security (Mandatory)
- `account_verification` - Email verification
- `password_reset` - Password reset
- `login_alert` - New login notifications
- `security_breach` - Security alerts

### User Management
- `welcome_email` - Welcome message
- `profile_update` - Profile changes
- `role_change` - Role updates
- `account_suspension` - Account suspension

### Job & Recruitment
- `job_application_received` - Application confirmations
- `application_status_update` - Status changes
- `job_match` - Job matching

### Messaging
- `new_message` - New messages
- `group_message` - Group messages
- `message_mention` - Mentions

### Marketplace & Orders
- `order_confirmation` - Order confirmations
- `order_status_update` - Status updates
- `payment_confirmation` - Payment confirmations

### Lead Management
- `lead_assignment` - Lead assignments
- `lead_status_update` - Status updates
- `follow_up_reminder` - Follow-up reminders

### Subscription & Billing (Mandatory)
- `subscription_activation` - Subscription activation
- `payment_reminder` - Payment reminders
- `subscription_change` - Subscription changes
- `subscription_cancellation` - Cancellations

### Content Moderation
- `content_approval` - Content approvals
- `content_flagged` - Content flagging
- `moderation_required` - Moderation queue

### System & Admin
- `system_maintenance` - Maintenance notifications
- `system_alert` - System alerts
- `security_alert` - Security notifications

## 🎯 Usage Examples

### Send Account Verification Email
```typescript
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
```

### Send Welcome Email
```typescript
await emailNotificationService.sendNotification({
  event: 'welcome_email',
  recipient: 'user@example.com',
  recipientName: 'John Doe',
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    dashboardUrl: 'https://platform.com/dashboard',
  },
});
```

### Send Job Application Confirmation
```typescript
await emailNotificationService.sendNotification({
  event: 'job_application_received',
  recipient: 'applicant@example.com',
  recipientName: 'Jane Smith',
  payload: {
    firstName: 'Jane',
    jobTitle: 'Childcare Assistant',
    organizationName: 'Sunshine Daycare',
    applicationDate: new Date().toLocaleDateString(),
    responseTime: '5-7 business days',
  },
});
```

## 🔧 Admin Management

### Email Templates
- Navigate to `/admin/email-notifications`
- View all templates in the "Templates" tab
- Create custom templates for specific events
- Edit existing templates

### Email Analytics
- View delivery rates, open rates, click rates
- Monitor email performance by event type
- Track email volume over time

### User Preferences
- Users can manage their notification preferences
- Navigate to `/admin/notification-preferences`
- Control which categories to receive
- Set quiet hours and frequency

## 🛡️ Security Setup

### Domain Authentication (Required)
1. **SPF Record**: Add to DNS
   ```
   v=spf1 include:sendgrid.net ~all
   ```

2. **DKIM**: Configure in SendGrid dashboard

3. **DMARC**: Add to DNS
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

### Webhook Configuration
Set up SendGrid webhooks for delivery tracking:
- URL: `https://yourdomain.com/api/webhooks/sendgrid`
- Events: Delivered, Opened, Clicked, Bounced, Dropped

## 📊 Monitoring

### Key Metrics to Track
- **Delivery Rate**: Should be >95%
- **Open Rate**: Industry average ~20-25%
- **Click Rate**: Industry average ~2-5%
- **Bounce Rate**: Should be <5%

### Alerts to Set Up
- Delivery rate drops below 90%
- Bounce rate exceeds 10%
- High volume of failed emails
- Spam complaints

## 🆘 Troubleshooting

### Common Issues
1. **Emails not sending**: Check API key and FROM_EMAIL
2. **Low delivery**: Verify domain authentication
3. **Template errors**: Check variable names match payload
4. **High bounces**: Review email list quality

### Debug Steps
1. Check email logs in admin dashboard
2. Verify SendGrid account status
3. Test with simple template first
4. Check domain reputation

---

**Need help?** Check the full [Email Notification System Guide](./email-notification-system-guide.md) for detailed documentation.