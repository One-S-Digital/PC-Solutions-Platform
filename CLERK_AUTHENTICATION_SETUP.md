# Clerk Authentication Setup Guide

This document explains how to configure Clerk authentication for both the Frontend and Admin platforms after removing mock login.

## Overview

Both the Frontend and Admin platforms now use **Clerk** for authentication. All mock login functionality has been removed and replaced with proper Clerk integration.

## What Was Changed

### Frontend (`/frontend`)
1. ✅ Added `@clerk/clerk-react` package to dependencies
2. ✅ Created `AuthProvider` wrapper with Clerk integration
3. ✅ Replaced `LoginPage.tsx` with Clerk's `SignIn` component
4. ✅ Replaced `SignupPage.tsx` with Clerk's `SignUp` component
5. ✅ Updated `index.tsx` to use `AuthProvider`
6. ✅ Modified `AppContext` to use Clerk authentication instead of mock login

### Admin (`/admin`)
1. ✅ Already configured with `@clerk/clerk-react`
2. ✅ Custom login/signup forms using Clerk hooks
3. ✅ Protected routes with Clerk authentication
4. ✅ Role-based access control via Clerk metadata

## Required Environment Variables

### Frontend Environment Variables

Create a `.env` file in the `/frontend` directory:

```env
# Clerk Authentication (REQUIRED)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=https://your-api-service-name.onrender.com

# Environment
NODE_ENV=production
```

### Admin Environment Variables

Create a `.env` file in the `/admin` directory:

```env
# Clerk Authentication (REQUIRED)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=https://your-api-service-name.onrender.com

# Environment
VITE_NODE_ENV=production
```

## Setting Up Clerk

### 1. Get Your Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application (or create a new one)
3. Navigate to **API Keys** section
4. Copy your **Publishable Key** (starts with `pk_live_` for production or `pk_test_` for development)

### 2. Configure Clerk Application

In your Clerk Dashboard:

#### Enable Authentication Methods
- ✅ Email/Password
- ✅ Google OAuth (optional but recommended)
- ✅ Other social providers as needed

#### Configure Paths
- Sign-in URL: `/login`
- Sign-up URL: `/signup`
- After sign-in redirect: `/dashboard`
- After sign-up redirect: `/dashboard`

#### Set Up User Metadata
For the Admin platform, you'll need to set user roles in `publicMetadata`:

```json
{
  "role": "SUPER_ADMIN"
}
```

Allowed roles:
- `SUPER_ADMIN` - Full admin access
- `ADMIN` - Limited admin access
- `FOUNDATION` - Foundation user
- `PARENT` - Parent user
- `EDUCATOR` - Educator user
- `PRODUCT_SUPPLIER` - Product supplier
- `SERVICE_PROVIDER` - Service provider

### 3. Add Environment Variables to Render

For each service (Frontend and Admin) on Render:

1. Go to your service dashboard
2. Navigate to **Environment** tab
3. Add the following variables:

```
VITE_CLERK_PUBLISHABLE_KEY = pk_live_your_actual_key_here
VITE_API_URL = https://your-api-service.onrender.com
NODE_ENV = production
```

### 4. Redeploy Services

After adding the environment variables:
1. Trigger a manual redeploy for both Frontend and Admin services
2. Verify that the environment variables are loaded correctly
3. Check the logs for any Clerk-related errors

## User Flow

### Frontend Users
1. Navigate to `/login` or `/signup`
2. Use Clerk's UI to sign in or create an account
3. Get redirected to `/dashboard` after successful authentication
4. User data is synced with the backend API

### Admin Users
1. Navigate to `/login` or `/signup` on the admin platform
2. Use custom forms powered by Clerk hooks
3. Must have `SUPER_ADMIN` or `ADMIN` role in Clerk metadata
4. Get redirected to `/dashboard` after successful authentication
5. Non-admin users see "Access Denied" page

## Backend Integration

The backend API should be configured to:
1. Verify Clerk JWT tokens
2. Extract user information from Clerk tokens
3. Sync user data with the database
4. Use Clerk user ID as the primary identifier

See `AUTHENTICATION_SETUP.md` for backend configuration details.

## Testing Authentication

### Development Testing
1. Use `pk_test_` keys for development
2. Create test users in Clerk Dashboard
3. Assign appropriate roles via User Metadata

### Production Testing
1. Use `pk_live_` keys for production
2. Create a test admin user
3. Verify authentication flows work correctly
4. Test role-based access control

## Troubleshooting

### "VITE_CLERK_PUBLISHABLE_KEY is required" Error
- Ensure the environment variable is set in Render
- Verify the variable name is exactly `VITE_CLERK_PUBLISHABLE_KEY`
- Check that the value starts with `pk_live_` or `pk_test_`
- Redeploy after adding environment variables

### "Access Denied" for Admin Users
- Check user's `publicMetadata` in Clerk Dashboard
- Ensure `role` is set to `SUPER_ADMIN` or `ADMIN`
- Verify the role value matches exactly (case-sensitive)

### Authentication Not Working
- Check browser console for Clerk errors
- Verify API URL is correct
- Ensure CORS is configured on the backend
- Check Clerk application settings (allowed redirects)

### Session Issues
- Clear browser cookies and localStorage
- Sign out and sign back in
- Check Clerk session settings in dashboard

## Security Best Practices

1. ✅ Never commit `.env` files to git
2. ✅ Use `pk_live_` keys only in production
3. ✅ Rotate keys if they're exposed
4. ✅ Enable MFA for admin accounts
5. ✅ Set up proper CORS policies
6. ✅ Use HTTPS for all production endpoints
7. ✅ Regularly review user roles and permissions

## Next Steps

After setting up Clerk:

1. Install dependencies:
   ```bash
   cd frontend && pnpm install
   cd ../admin && pnpm install
   ```

2. Build the applications:
   ```bash
   cd frontend && pnpm run build
   cd ../admin && pnpm run build
   ```

3. Deploy to Render with the environment variables configured

4. Create your first admin user in Clerk Dashboard

5. Test the complete authentication flow

## Support

- Clerk Documentation: https://clerk.com/docs
- Clerk Support: https://clerk.com/support
- GitHub Issues: For project-specific issues

---

**Note**: Mock authentication has been completely removed. Clerk is now required for both Frontend and Admin platforms to function properly.
