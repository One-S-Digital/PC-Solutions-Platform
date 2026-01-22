# Settings Guide

This guide explains all the settings available on ProCrèche Solutions and how to configure them.

---

## Table of Contents

1. [Accessing Settings](#accessing-settings)
2. [Account Security](#account-security)
3. [Billing & Subscription](#billing--subscription)
4. [Promo Code Manager](#promo-code-manager)
5. [Notification Preferences](#notification-preferences)
6. [Privacy & Data](#privacy--data)
7. [Contact & Booking](#contact--booking)
8. [Analytics Preferences](#analytics-preferences)

---

## Accessing Settings

### How to Open Settings

1. Click **Settings** in the sidebar navigation, OR
2. Click your profile picture → **Settings**

### Settings Layout

The settings page is organized into sections. Depending on your role, you'll see different sections:

| Section | Available To |
|---------|--------------|
| Account Security | All users |
| Billing & Subscription | Foundations, Suppliers, Service Providers |
| Promo Code Manager | Suppliers, Service Providers |
| Notification Preferences | Foundations, Suppliers |
| Privacy & Data | Foundations, Suppliers, Service Providers |
| Contact & Booking | Suppliers |
| Analytics Preferences | Suppliers |

---

## Account Security

Manage your personal information and account security.

### Personal Information

Update your basic account details:

| Field | Description | How to Change |
|-------|-------------|---------------|
| **First Name** | Your first name | Type in field, click Save |
| **Last Name** | Your last name | Type in field, click Save |
| **Organization Name** | Company name (if applicable) | Type in field, click Save |
| **Email** | Display only - see below to change | Use "Change Email" |
| **Account Type** | Your role | Cannot be changed |
| **Member Since** | Account creation date | Display only |

### Changing Your Password

To update your password:

1. Find the **"Change Password"** section
2. Enter your **Current Password**
3. Enter your **New Password** (minimum 8 characters)
4. **Confirm New Password**
5. Click **"Update Password"**

```
┌─────────────────────────────────────────────────────┐
│  Change Password                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Current Password                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │ ••••••••                              👁️   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  New Password                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │                                        👁️   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Confirm New Password                               │
│  ┌─────────────────────────────────────────────┐   │
│  │                                        👁️   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│           [Update Password]                         │
│                                                     │
│  ✅ Password changed successfully!                 │
│  Your password has been updated. You can now use   │
│  your new password to sign in.                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Password Requirements:**
- Minimum 8 characters
- Not a commonly used password
- Not found in data breaches

### Changing Your Email Address

To change your login email:

1. Find the **"Change Email Address"** section
2. Enter your **New Email Address**
3. Click **"Send Verification Code"**
4. Check your **new email** for a 6-digit code
5. Enter the verification code
6. Click **"Verify & Change Email"**

```
┌─────────────────────────────────────────────────────┐
│  Change Email Address                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Current email: user@example.com                    │
│                                                     │
│  New Email Address                                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ newemail@example.com                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Send Verification Code]                           │
│                                                     │
│  ────────────────────────────────────────────────  │
│                                                     │
│  A verification code has been sent to              │
│  newemail@example.com                              │
│                                                     │
│  Verification Code                                  │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Verify & Change Email] [Resend Code] [Cancel]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

> ⚠️ **Important:** You must have access to your new email to complete the change.

### Danger Zone

Critical account actions:

**Delete Account:**
- Permanently deletes your account
- Removes all your data
- Cannot be undone

To delete your account:
1. Click **"Delete My Account"**
2. Confirm by typing "DELETE"
3. Enter your password
4. Click **"Permanently Delete"**

> ⚠️ **Warning:** This action is irreversible. Export your data first if needed.

---

## Billing & Subscription

Manage your subscription and payment settings.

*Available to: Foundations, Suppliers, Service Providers*

### Current Subscription

View your subscription details:
- Plan name
- Status
- Current billing period
- Cancellation status

### Managing Your Plan

**To Upgrade:**
1. View available plans
2. Click **"Upgrade"** on desired plan
3. Confirm

**To Cancel:**
1. Click **"Cancel Subscription"**
2. Provide reason (optional)
3. Confirm

**To Manage Payment:**
1. Click **"Manage Payment"** (if Stripe enabled)
2. Opens payment portal
3. Update card details

See [Billing & Subscriptions Guide](../guides/9-billing-and-subscriptions.md) for details.

---

## Promo Code Manager

Create and manage promotional codes.

*Available to: Product Suppliers, Service Providers*

### Overview

The Promo Code Manager lets you create discount codes that appear on your public profile.

### Promo Code List

View all your promo codes:

| Column | Description |
|--------|-------------|
| **Code** | The promo code text |
| **Discount** | What the customer receives |
| **Status** | Active (shown) or Hidden |
| **Actions** | Edit or Delete |

### Creating a Promo Code

1. Click **"Add New Code"**
2. Fill in the modal:

| Field | Description | Required |
|-------|-------------|----------|
| **Code** | The code customers enter (auto-uppercase) | ✅ Yes |
| **Discount** | Description of discount ("20% off", "Free shipping") | ✅ Yes |
| **Description** | Terms and conditions | ❌ Optional |
| **Show on Profile** | Whether to display publicly | ✅ Yes (default: on) |

3. Click **"Save"**

### Editing a Promo Code

1. Click **"Edit"** on the code
2. Modify the fields
3. Click **"Save"**

### Deleting a Promo Code

1. Click **"Delete"** on the code
2. Confirm deletion

### Hiding a Promo Code

To hide without deleting:
1. Click **"Edit"**
2. Uncheck **"Show on Profile"**
3. Save

---

## Notification Preferences

Control what notifications you receive.

*Available to: Foundations, Product Suppliers*

### Email Notifications

| Setting | Description | Options |
|---------|-------------|---------|
| **New Request Emails** | Get notified of new orders/inquiries | On / Off |

Toggle the switch to enable or disable.

### Digest Frequency

How often to receive activity summaries:

| Option | Description |
|--------|-------------|
| **Daily** | Receive a daily digest |
| **Weekly** | Receive a weekly digest |
| **None** | No digest emails |

Click your preference to select.

### Promo Redemption Alerts

Get notified when customers use your promo codes:

| Setting | Description | Options |
|---------|-------------|---------|
| **Promo Redemption Alerts** | Notify when codes are used | On / Off |

---

## Privacy & Data

Control your privacy settings and manage your data.

*Available to: Foundations, Suppliers, Service Providers*

### Profile Visibility

Control what information is public:

| Setting | For Suppliers | For Service Providers |
|---------|--------------|----------------------|
| **Hide Prices/Rates** | Hide product prices | Hide service rates |

Toggle to show or hide pricing from your public profile.

> 💡 **Note:** Hiding prices means customers must contact you for pricing.

### Data Deletion Request

Request deletion of your data (GDPR compliance):

1. Click **"Request Data Deletion"**
2. Confirm you want to delete all data
3. Final confirmation
4. Request is submitted

**What happens:**
- Your request is logged
- Admin processes the request
- Data is deleted per GDPR requirements
- You're notified when complete

> ⚠️ **Warning:** Data deletion is permanent. Export your data first if needed.

---

## Contact & Booking

Configure how customers can reach you.

*Available to: Product Suppliers*

### Contact Preferences

Set how customers can contact you:
- Email preferences
- Phone visibility
- Preferred contact method

### Booking Settings

If you offer consultations:
- Enable/disable booking
- Set booking link
- Configure availability

---

## Analytics Preferences

Customize your analytics experience.

*Available to: Product Suppliers*

### Dashboard Configuration

Choose what appears on your dashboard:
- Which widgets to show
- Default date ranges
- Preferred metrics

### Report Settings

Configure default report settings:
- Default export format
- Data refresh frequency
- Comparison periods

---

## Saving Your Settings

### Auto-Save

Some settings save automatically when you toggle them:
- Notification toggles
- Privacy toggles

### Manual Save

Other settings require clicking **"Save Changes"**:
- Personal information
- Password changes
- Text fields

### Confirmation

After saving, you'll see:
- ✅ Success message
- Changes take effect immediately

---

## Tips for Settings

### Security Best Practices

- ✅ Use a strong, unique password
- ✅ Change your password periodically
- ✅ Keep your email address current
- ✅ Review your settings regularly

### Notification Tips

- 📧 Enable notifications to stay informed
- ⏰ Set digest frequency that works for you
- 📱 Check spam folder if not receiving emails

### Privacy Tips

- 🔒 Review what information is public
- 📊 Consider pricing visibility
- 🗑️ Know your data rights

---

## Need Help with Settings?

Having trouble with settings?

1. Create a support ticket
2. Select **"Technical"** as category
3. Describe your issue
4. Include screenshots if helpful

---

*Last Updated: January 2025*
