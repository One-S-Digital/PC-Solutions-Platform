# Troubleshooting & FAQ

Common issues and solutions for the ProCrèche Solutions platform.

---

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Profile Issues](#profile-issues)
3. [Subscription Issues](#subscription-issues)
4. [Feature Access Issues](#feature-access-issues)
5. [File Upload Issues](#file-upload-issues)
6. [Messaging Issues](#messaging-issues)
7. [General FAQ](#general-faq)

---

## Authentication Issues

### "Profile Not Complete" Message

**Problem:** You see a message asking you to complete your profile.

**Solution:**
1. Click **"Complete Your Profile"**
2. Fill in all required information
3. Select your role
4. Save profile
5. You'll be redirected to your dashboard

**Cause:** Your account was created but profile completion wasn't finished.

**File Reference:**
- `frontend/App.tsx` - ProtectedLayout handles pending users

---

### Cannot Log In

**Problem:** Unable to log in to the platform.

**Solutions:**
1. Verify you're using the correct email
2. Check your password (or use password reset)
3. Clear browser cache and cookies
4. Try a different browser
5. Check if your account exists in Clerk
6. Contact support if issue persists

**File Reference:**
- `frontend/pages/LoginPage.tsx`

---

### "Access Denied" Error

**Problem:** You see "Access Denied" when trying to access a feature.

**Solutions:**
1. Verify your role is correctly assigned
2. Check if feature requires subscription (if applicable)
3. Ensure your subscription is active
4. Contact support if role appears incorrect

---

## Profile Issues

### Cannot Edit Profile

**Problem:** Unable to save profile changes.

**Solutions:**
1. Ensure all required fields are filled
2. Check field validations (email format, etc.)
3. Verify file uploads are within size limits
4. Try refreshing the page
5. Contact support if issue persists

---

### Profile Image Not Uploading

**Problem:** Avatar or logo upload fails.

**Solutions:**
1. Check file size (must be under limit)
2. Verify file type (JPEG, PNG, GIF, WebP for images)
3. Try a different image
4. Check internet connection
5. Contact support if issue persists

**File Upload Limits:**
- Images: Typically 5MB max
- Documents: Typically 10MB max

---

## Subscription Issues

### "Subscription Required" Paywall

**Problem:** You see a paywall saying subscription is required.

**Solutions:**
1. Check your subscription status in Settings
2. If no subscription, request one via Settings → Billing
3. If subscription expired, contact support to renew
4. Verify your role requires subscription

**File Reference:**
- `frontend/components/shared/SubscriptionPaywall.tsx`

---

### Subscription Request Not Processed

**Problem:** Subscription request is still pending after several days.

**Solutions:**
1. Check request status in Settings
2. Verify estimated response time
3. Contact support to follow up
4. Ensure payment was sent if invoice was received

---

### Cannot Access Feature Despite Subscription

**Problem:** Feature shows as unavailable even though you have a subscription.

**Solutions:**
1. Verify your plan includes the feature
2. Check subscription status (must be ACTIVE or TRIAL)
3. Refresh the page
4. Clear browser cache
5. Contact support with subscription details

---

## Feature Access Issues

### Feature Not Visible

**Problem:** A feature you expect to see is not in the menu.

**Solutions:**
1. Check your subscription plan includes the feature
2. Verify your role has access
3. Check if feature is subscription-gated
4. Review your plan's feature list

**File Reference:**
- `frontend/App.tsx` - Route protection
- `_inventory/ROLES_AND_PERMISSIONS.md`

---

### "Feature Requires Upgrade" Message

**Problem:** You see a message that a feature requires a higher plan.

**Solutions:**
1. Review your current plan features
2. Request subscription upgrade via Settings
3. Contact support for plan recommendations

---

## File Upload Issues

### File Upload Fails

**Problem:** File upload returns an error.

**Solutions:**
1. Check file size (must be under limit)
2. Verify file type is allowed
3. Check file is not corrupted
4. Try a different file
5. Check internet connection
6. Contact support if issue persists

**Common File Types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOCX, XLSX
- Other: Check allowed types for specific feature

---

### "Malware Detected" Error

**Problem:** File upload blocked due to malware detection.

**Solution:**
1. Scan your file with antivirus software
2. Ensure file is from a trusted source
3. Try a different file
4. Contact support if you believe this is a false positive

---

## Messaging Issues

### Messages Not Sending

**Problem:** Messages fail to send.

**Solutions:**
1. Check internet connection
2. Verify recipient is valid
3. Try refreshing the page
4. Check if conversation exists
5. Contact support if issue persists

---

### Real-time Updates Not Working

**Problem:** Messages don't appear in real-time.

**Solutions:**
1. Refresh the page
2. Check WebSocket connection (browser console)
3. Verify you're not behind a restrictive firewall
4. Try a different browser
5. Contact support if issue persists

---

## General FAQ

### How do I change my password?

Password changes are handled through Clerk authentication. Use the password reset link on the login page.

**File Reference:**
- `frontend/pages/LoginPage.tsx`

---

### How do I change my email?

Email changes are handled through Clerk. Update your email in Clerk, then it will sync to the platform.

**Note:** Contact email (separate from auth email) can be updated in your profile.

---

### Can I have multiple roles?

No, each user account has a single role. If you need multiple roles, contact support.

---

### How do I invite team members?

Team member invitation features vary by subscription plan. Check your plan's features or contact support.

---

### How do I contact support?

1. Navigate to **Support** in the menu
2. Create a support ticket
3. Or use contact information in Support section

---

### What browsers are supported?

See [Supported Browsers](../appendices/supported-browsers.md) for details.

---

### Is there a mobile app?

No mobile app is currently available. The platform is accessible via web browser.

---

### How do I report a bug?

1. Create a support ticket
2. Select category: **TECHNICAL**
3. Provide detailed description
4. Include screenshots if possible

---

### How do I request a feature?

1. Create a support ticket
2. Select category: **FEATURE_REQUEST**
3. Describe the feature you'd like
4. Explain the use case

---

## Getting Additional Help

If your issue is not covered here:

1. Check your role-specific guide for detailed instructions
2. Create a support ticket
3. Contact your administrator (if applicable)
4. Review [Common Features](./8-common-features-all-users.md)

---

## Under the Hood

### Error Handling

The platform uses standard HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Logging

Errors are logged server-side for debugging. Include error messages when contacting support.

---

**Next:** Review your role-specific guide or [Common Features](./8-common-features-all-users.md)

