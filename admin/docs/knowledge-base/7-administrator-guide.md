# Administrator User Guide

This guide is for platform administrators managing ProCrèche Solutions.

---

## Table of Contents

1. [Admin Dashboard](#admin-dashboard)
2. [User Management](#user-management)
3. [Foundation Management](#foundation-management)
4. [Vendor Management](#vendor-management)
5. [Content Management Dashboard](#content-management-dashboard)
6. [Recruitment Oversight](#recruitment-oversight)
7. [Marketplace Oversight](#marketplace-oversight)
8. [Discount & Terminations](#discount--terminations)
9. [Support Ticket Management](#support-ticket-management)
10. [System Monitoring](#system-monitoring)
11. [Platform Settings](#platform-settings)

---

## Admin Dashboard

### Accessing the Admin Dashboard

Navigate to `/admin` or click **Admin Dashboard** in the navigation.

### Dashboard Overview

The admin dashboard provides:

| Widget | Information |
|--------|-------------|
| **Platform Overview** | Total users, organizations, activity |
| **Quick Stats** | Key metrics at a glance |
| **System Health** | Platform status indicators |
| **Recent Activity** | Latest platform activity |

### Quick Stats

| Stat | Description |
|------|-------------|
| **Total Users** | All registered users |
| **Active Foundations** | Daycares with active subscriptions |
| **Active Vendors** | Suppliers and Service Providers |
| **Pending Tickets** | Support tickets awaiting response |

---

## User Management

### Viewing All Users

1. Go to **User Management**
2. View the list of all platform users
3. Use filters and search to find specific users

### User Filters

| Filter | Options |
|--------|---------|
| **Role** | Foundation, Supplier, Service Provider, Educator, Parent |
| **Status** | Active, Pending, Suspended |
| **Date Range** | Registration date |
| **Search** | Name, email, organization |

### User Details View

Click a user to see:
- Personal information
- Account status
- Organization (if applicable)
- Activity history
- Subscription status

### Managing User Roles

To change a user's role:

1. Open user details
2. Click **"Change Role"**
3. Select new role
4. Confirm change
5. Role change is logged

> ⚠️ **Caution:** Role changes affect user permissions immediately.

### Role Change History

View the history of role changes for audit purposes:
- Original role
- New role
- Changed by (admin)
- Date and time
- Reason (if provided)

### User Status Management

| Status | Meaning | Actions |
|--------|---------|---------|
| **Active** | Normal account | Can suspend |
| **Pending** | Awaiting verification | Can approve/reject |
| **Suspended** | Temporarily disabled | Can reactivate |

To suspend a user:
1. Open user details
2. Click **"Suspend User"**
3. Provide reason
4. Confirm

---

## Foundation Management

### Viewing All Foundations

1. Go to **Foundation Management**
2. View all registered daycares
3. Filter by status, location, subscription

### Foundation Details

Each foundation record shows:
- Organization information
- Contact details
- Subscription status
- Lead statistics
- Activity history

### Subscription Status

Monitor foundation subscriptions:

| Status | Action |
|--------|--------|
| **Active** | Monitor usage |
| **Trial** | Track trial period |
| **Expired** | Follow up for renewal |
| **Cancelled** | Review reason |

### Activity Monitoring

Track foundation activity:
- Login frequency
- Feature usage
- Lead response rates
- Order history

---

## Vendor Management

### Product Supplier Management

1. Go to **Vendor Management** → **Product Suppliers**
2. View all suppliers
3. Filter by status, category, region

**Supplier Details:**
- Company information
- Product listings
- Order statistics
- Subscription status

### Service Provider Management

1. Go to **Vendor Management** → **Service Providers**
2. View all providers
3. Filter by service type, status

**Provider Details:**
- Company information
- Service listings
- Request statistics
- Subscription status

### Vendor Onboarding

Track new vendor onboarding:
1. View pending vendors
2. Review submitted information
3. Approve or request changes
4. Monitor onboarding progress

---

## Content Management Dashboard

### Overview

Manage all platform content from a central dashboard.

### E-Learning Content Management

#### Adding a Course

1. Go to **Content Management** → **E-Learning**
2. Click **"Add Course"**
3. Fill in course details:
   - Title
   - Description
   - Category
   - Difficulty level
   - Duration
4. Add content modules

#### Adding Content Types

| Type | How to Add |
|------|------------|
| **Video** | Upload video file or embed URL |
| **PDF** | Upload PDF document |
| **External Link** | Add URL to external resource |
| **Quiz** | Create quiz questions |

#### Content Metadata

For each content item:
- Title
- Description
- Category
- Language (EN/FR/DE)
- Access roles (who can view)

#### Publishing/Unpublishing

- **Draft** - Content not visible
- **Published** - Content visible to allowed roles
- **Archived** - Historical content

#### Content Moderation

Review content before publishing:
1. Review submitted content
2. Check quality and accuracy
3. Approve or request revisions
4. Publish when ready

### HR Documents Management

1. Go to **Content Management** → **HR Documents**
2. Add, edit, or remove documents
3. Organize by category
4. Set access permissions

### State Policies Management

1. Go to **Content Management** → **State Policies**
2. Add policies by canton
3. Set effective dates
4. Mark critical policies
5. Add external links to official sources

---

## Recruitment Oversight

### Viewing All Job Listings

1. Go to **Recruitment Oversight**
2. View all job listings platform-wide
3. Filter by foundation, status, date

### Moderating Job Posts

Review job listings for:
- Appropriate content
- Complete information
- Compliance with guidelines

**Actions:**
- Approve
- Request changes
- Remove (with reason)

### Candidate Pool Management

View all registered educators:
- Profile completeness
- Application history
- Activity status

---

## Marketplace Oversight

### Product Listings Moderation

Review product listings:
1. Go to **Marketplace Oversight** → **Products**
2. View pending or reported products
3. Approve, request changes, or remove

### Service Listings Moderation

Review service listings:
1. Go to **Marketplace Oversight** → **Services**
2. View pending or reported services
3. Approve, request changes, or remove

### Partner Management

Manage marketplace partners:
- Verify vendor information
- Review performance metrics
- Handle complaints

---

## Discount & Terminations

### Managing Discount Codes

View and manage all promo codes:
1. Go to **Discount & Terminations**
2. View all active promo codes
3. Filter by vendor, status, date

### Subscription Terminations

Process subscription cancellations:
1. View termination requests
2. Review reason
3. Process termination
4. Notify user

### Promotional Campaigns

Manage platform-wide promotions:
- Create campaign codes
- Set validity periods
- Track usage

---

## Support Ticket Management

### Viewing All Tickets

1. Go to **Support Tickets**
2. View all submitted tickets
3. Filter by status, category, priority

### Ticket Queue

| Status | Description |
|--------|-------------|
| **Open** | New, unassigned |
| **Assigned** | Assigned to admin |
| **In Progress** | Being worked on |
| **Waiting** | Awaiting user response |
| **Resolved** | Solution provided |
| **Closed** | Ticket complete |

### Ticket Assignment

Assign tickets to team members:
1. Open ticket
2. Click **"Assign"**
3. Select admin
4. Add notes

### Responding to Tickets

1. Open ticket
2. Review issue
3. Add response
4. Update status
5. Save

### Escalation Procedures

For complex issues:
1. Mark ticket for escalation
2. Notify senior admin
3. Document escalation reason
4. Track resolution

### Ticket Analytics

View support metrics:
- Total tickets
- Response times
- Resolution rates
- Category breakdown

---

## System Monitoring

### System Health Metrics

Monitor platform health:

| Metric | Description |
|--------|-------------|
| **Uptime** | Platform availability |
| **Response Time** | API performance |
| **Error Rate** | System errors |
| **Active Users** | Current users |

### Error Tracking

View and manage errors:
1. Go to **System Monitoring** → **Errors**
2. Review error logs
3. Track error frequency
4. Prioritize fixes

### Performance Monitoring

Track platform performance:
- Page load times
- API response times
- Database performance
- Storage usage

### Audit Logs

Review admin actions:
- User changes
- Content changes
- System changes
- Login history

---

## Platform Settings

### Frontend Settings Configuration

Configure platform appearance:

1. Go to **Platform Settings** → **Frontend**
2. Configure:
   - Site name
   - Default language
   - Feature toggles
3. Save changes

### Logo and Branding

Update platform branding:
1. Go to **Platform Settings** → **Branding**
2. Upload logo
3. Set colors (if configurable)
4. Save

### Email Templates

Manage transactional emails:
1. Go to **Platform Settings** → **Email Templates**
2. View available templates
3. Edit content (where allowed)
4. Preview changes
5. Save

### System Configuration

Advanced settings:
- API configuration
- Integration settings
- Security settings

> ⚠️ **Caution:** Changes to system configuration can affect platform operation.

---

## Admin Best Practices

### Daily Tasks

- ☐ Check support ticket queue
- ☐ Review system health
- ☐ Monitor new user registrations
- ☐ Check error logs

### Weekly Tasks

- ☐ Review subscription status
- ☐ Content moderation review
- ☐ Analytics review
- ☐ User activity analysis

### Monthly Tasks

- ☐ Full system health review
- ☐ User feedback analysis
- ☐ Content audit
- ☐ Security review

### Documentation

Always document:
- Major changes
- User communications
- Escalated issues
- System incidents

---

## Need Help?

For admin-specific questions or issues:
- Contact senior administration
- Review internal documentation
- Escalate critical issues appropriately

---

---

## Last Updated

January 2026
