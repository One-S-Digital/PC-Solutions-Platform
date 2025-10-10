# Admin Panel User Guide

**For:** Platform Administrators  
**Last Updated:** October 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [User Management](#user-management)
4. [Content Management](#content-management)
5. [System Monitor](#system-monitor)
6. [Platform Settings](#platform-settings)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Admin Panel

1. Navigate to your admin URL (e.g., `https://admin.yourdomain.com`)
2. Sign in with your administrator credentials
3. You'll be redirected to the dashboard

### User Roles

| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Full system access, all features |
| **ADMIN** | Organization management, content management, user management within org |
| **EDUCATOR** | Read-only access to content, manage own profile |

> ℹ️ This guide assumes you have SUPER_ADMIN or ADMIN privileges.

---

## Dashboard

The dashboard is your central hub for managing the platform.

### Key Performance Indicators (KPIs)

Six main cards display system metrics:

1. **Users Management**
   - Total user count
   - Recent registrations
   - Quick access to user management

2. **Content Management**
   - Total content items
   - Published vs. draft content
   - Quick access to content center

3. **System Monitor**
   - System health status
   - API uptime
   - Quick access to monitoring tools

4. **Platform Settings**
   - Current platform configuration
   - Quick access to settings

5. **Organizations**
   - Total organizations
   - Active subscriptions
   - Quick access to org management

6. **Analytics**
   - User activity metrics
   - Content engagement
   - Quick access to detailed analytics

### Navigation

- **Sidebar:** Main navigation menu (Dashboard, Users, Content, Monitor, Settings)
- **Top Bar:** User profile, notifications, language switcher, logout
- **Breadcrumbs:** Current page path

---

## User Management

**Path:** `/admin/users`

### Viewing Users

1. Navigate to Users from sidebar
2. View user list with key information:
   - Name
   - Email
   - Role
   - Organization
   - Status (Active/Inactive)
   - Last login
3. Use search bar to find specific users
4. Use filters to narrow results:
   - By role
   - By organization
   - By status

### Creating a New User

1. Click "Add User" button (top right)
2. Fill in user details:
   - **Email** (required)
   - **First Name** (required)
   - **Last Name** (required)
   - **Role** (dropdown)
   - **Organization** (if applicable)
3. Click "Create User"
4. User receives invitation email with setup instructions

### Editing User Details

1. Find user in list
2. Click on user row or "Edit" button
3. Modify fields in modal:
   - Update personal information
   - Change role
   - Update organization assignment
4. Click "Save Changes"

### Changing User Roles

1. Find user in list
2. Click "Edit" or user row
3. Select new role from dropdown:
   - SUPER_ADMIN (full access)
   - ADMIN (organization admin)
   - EDUCATOR (read access)
   - PARENT (parent access)
   - SUPPLIER (supplier access)
   - SERVICE_PROVIDER (provider access)
4. Click "Save Changes"
5. Changes take effect immediately

### Deactivating/Reactivating Users

1. Find user in list
2. Click on user to open details
3. Toggle "Active" switch
4. Confirm action
5. Deactivated users cannot log in

---

## Content Management

**Path:** `/admin/content`

The Content Center is organized into 4 tabs:

### Tab 1: E-Learning Content

Upload and manage educational materials.

**To upload:**
1. Click "Upload" button
2. Select or drag files:
   - Videos (MP4, WebM)
   - Documents (PDF, DOCX)
   - Images (JPG, PNG)
3. Fill in metadata:
   - Title (required)
   - Description
   - Category (dropdown)
   - Tags (keywords)
   - Difficulty Level
4. Click "Upload"
5. File processes and appears in list

**To manage:**
- **View:** Click on content item to see details
- **Edit:** Click "Edit" button to update metadata
- **Publish:** Change status from Draft to Published
- **Archive:** Move to archive (hidden from users)
- **Delete:** Permanently remove (cannot be undone)

### Tab 2: HR Procedures

Internal documents for staff.

**To upload:**
1. Click "Upload Document"
2. Select PDF or Word file
3. Fill in:
   - Document title
   - Department
   - Effective date
   - Review date
   - Version number
4. Click "Upload"

**Document workflow:**
- Draft → Under Review → Approved → Published

### Tab 3: State Policies

Regulatory and compliance documents.

**To upload:**
1. Click "Upload Policy"
2. Select document file
3. Fill in:
   - Policy title
   - Jurisdiction (canton)
   - Effective date
   - Policy type
   - Criticality (High/Medium/Low)
4. Click "Upload"

**Features:**
- Automatic expiration reminders
- Compliance tracking
- Version control

### Tab 4: Policy Alerts

Notifications about policy changes.

**To create alert:**
1. Click "Create Alert"
2. Fill in:
   - Alert title
   - Description
   - Affected regions
   - Alert type (New/Update/Sunset)
   - Priority
3. Set active date range
4. Click "Create"

**Alert types:**
- New Policy
- Policy Update
- Policy Sunset (expiring)
- Regulatory Change

### Dashboard View

Switch to "Dashboard" tab to see:
- Total content items
- Content by category
- Recent uploads
- Popular content
- Storage usage

---

## System Monitor

**Path:** `/admin/system-monitor`

Monitor system health and performance.

### Tab 1: Overview

Real-time system status:
- **System Health:** Green (healthy), Yellow (warning), Red (critical)
- **API Status:** Response time, uptime percentage
- **Database:** Connection status, query performance
- **Storage:** Used/available space
- **Active Users:** Current online users

### Tab 2: Logs

View application logs:
- **Error Logs:** Application errors and exceptions
- **Access Logs:** API requests and responses
- **Authentication Logs:** Login attempts, failures
- **Audit Logs:** Admin actions, changes

**To view logs:**
1. Select log type from dropdown
2. Set date range
3. Use search to filter
4. Click "Export" to download

### Tab 3: Metrics

Performance metrics:
- **API Performance:** Response times, throughput
- **Database Performance:** Query times, connection pool
- **Storage Usage:** Files, database size
- **User Activity:** Logins, page views, actions

### Tab 4: Analytics

User and content analytics:
- **User Growth:** Registration trends
- **Content Engagement:** Views, downloads
- **Popular Content:** Most accessed items
- **User Activity:** Peak hours, active users

### Tab 5: Security

Security monitoring:
- **Failed Login Attempts:** Potential brute force
- **Suspicious Activity:** Unusual patterns
- **Recent Admin Actions:** Audit trail
- **Access Violations:** Permission denials

**To respond to security events:**
1. Review event details
2. Take action if needed:
   - Lock user account
   - Reset password
   - Revoke sessions
3. Document incident

---

## Platform Settings

**Path:** `/admin/settings`

Configure platform-wide settings.

### General Settings

- **Platform Name:** Display name
- **Description:** Platform description
- **Version:** Current version (read-only)
- **Maintenance Mode:** Toggle to take site offline
- **Maintenance Message:** Message shown during maintenance

**To enable maintenance mode:**
1. Toggle "Maintenance Mode" switch
2. Enter maintenance message
3. Click "Save Changes"
4. Site becomes unavailable to users (admins can still access)

### Branding Settings

Customize platform appearance:

**Logo Upload:**
1. Click "Upload Logo"
2. Select image (PNG/JPG, max 2MB)
3. Logo updates immediately

**Favicon Upload:**
1. Click "Upload Favicon"
2. Select .ico file (32x32 or 64x64)
3. Favicon updates immediately

**Color Scheme:**
1. Click color picker for "Primary Color"
2. Select color or enter hex code
3. Preview changes
4. Click "Save Changes"

### Email Settings

Configure email notifications:

1. **SMTP Configuration:**
   - Host
   - Port
   - Username
   - Password
   - From address
   - From name

2. **Test Connection:**
   - Click "Test Email" button
   - Enter test recipient
   - Verify email arrives

3. **Email Templates:**
   - Welcome email
   - Password reset
   - Notifications
   - System alerts

### Advanced Settings

For SUPER_ADMIN only:

- **API Keys:** Generate/revoke API keys
- **Webhooks:** Configure webhook endpoints
- **Feature Flags:** Enable/disable features
- **Rate Limiting:** Configure API rate limits
- **Session Settings:** Timeout, max sessions
- **Backup Settings:** Frequency, retention

---

## Common Tasks

### Task 1: Onboarding a New Organization

1. Navigate to Organizations (from Dashboard)
2. Click "Add Organization"
3. Fill in organization details:
   - Name
   - Type (Foundation, Branch, Supplier, etc.)
   - Contact information
   - Address
4. Click "Create"
5. Create admin user for organization (see User Management)
6. Assign organization to user
7. Notify organization admin via email

### Task 2: Responding to Support Request

1. User reports issue via email/support
2. Check System Monitor → Logs for errors
3. Check User Management to verify user details
4. Take appropriate action:
   - Reset password
   - Update permissions
   - Fix content access
5. Document resolution
6. Notify user

### Task 3: Uploading Bulk Content

1. Prepare files with consistent naming
2. Navigate to Content → appropriate tab
3. Click "Bulk Upload"
4. Select multiple files
5. Fill in common metadata
6. Review file list
7. Click "Upload All"
8. Monitor progress bar
9. Review upload summary

### Task 4: Monthly Platform Maintenance

1. Review System Monitor → Metrics for trends
2. Check disk space usage
3. Review error logs for recurring issues
4. Update content:
   - Archive old content
   - Publish new content
5. Review user accounts:
   - Deactivate inactive users
   - Clean up test accounts
6. Check backup status (Advanced Settings)
7. Document any issues or changes

---

## Troubleshooting

### Issue: Cannot Upload Files

**Symptoms:** Upload fails with error message

**Solutions:**
1. Check file size (must be under max limit)
2. Verify file type is supported
3. Check storage space (System Monitor)
4. Try different file format
5. Clear browser cache
6. Contact technical support if persists

### Issue: User Cannot Log In

**Symptoms:** User reports login failure

**Solutions:**
1. Verify user is active (User Management)
2. Check user's role and permissions
3. Review authentication logs for errors
4. Reset user's password
5. Check if account is locked (Security tab)
6. Verify Clerk service status

### Issue: Content Not Displaying

**Symptoms:** Uploaded content not visible to users

**Solutions:**
1. Verify content status is "Published" (not Draft)
2. Check content permissions
3. Verify file uploaded successfully
4. Check user's role has access to content type
5. Review content logs for errors
6. Try re-uploading content

### Issue: Slow Performance

**Symptoms:** Admin panel is slow or unresponsive

**Solutions:**
1. Check System Monitor → Overview for issues
2. Review API performance metrics
3. Check database connection status
4. Clear browser cache and cookies
5. Try different browser
6. Check network connection
7. Contact technical support for server issues

### Issue: Email Not Sending

**Symptoms:** Users not receiving emails

**Solutions:**
1. Check Email Settings → SMTP configuration
2. Click "Test Email" to verify connection
3. Check spam/junk folders
4. Verify "From" address is correct
5. Review email logs for errors
6. Contact email provider if issue persists

---

## Best Practices

1. **Regular Monitoring:**
   - Check System Monitor daily
   - Review logs weekly
   - Analyze metrics monthly

2. **User Management:**
   - Review user accounts quarterly
   - Deactivate unused accounts
   - Use least-privilege principle for roles

3. **Content Management:**
   - Keep content organized with proper categories
   - Use descriptive titles and tags
   - Archive outdated content regularly

4. **Security:**
   - Monitor failed login attempts
   - Review admin action logs
   - Use strong passwords
   - Enable 2FA for admin accounts

5. **Backup:**
   - Verify backups are running
   - Test restoration process quarterly
   - Keep local copies of critical content

---

## Getting Help

- **Technical Issues:** Contact technical support
- **Feature Requests:** Submit via feedback form
- **Documentation:** Check `/docs` directory
- **Training:** Request admin training session

---

## Appendix

### Keyboard Shortcuts

- `Ctrl+/` - Open command palette
- `Ctrl+K` - Search
- `Esc` - Close modal
- `Tab` - Navigate form fields

### File Format Support

**Documents:**
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)

**Images:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

**Videos:**
- MP4 (.mp4)
- WebM (.webm)
- MOV (.mov)

### Maximum File Sizes

- Images: 5 MB
- Documents: 25 MB
- Videos: 100 MB

---

**Need more help?** Contact your system administrator or technical support team.
