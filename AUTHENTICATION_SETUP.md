# PC Solutions Platform - Authentication Setup

## Overview

The PC Solutions Platform uses Clerk for authentication with a comprehensive role-based access control (RBAC) system. This document provides detailed setup instructions for both development and production environments.

## Architecture

### Authentication Flow
1. **Frontend**: Users interact with Clerk components (SignIn, SignUp)
2. **Clerk**: Handles authentication and JWT token generation
3. **API**: Validates JWT tokens and enforces RBAC
4. **Database**: Stores user profiles and role assignments

### User Roles
- **SUPER_ADMIN**: Full system access
- **ADMIN**: Administrative access
- **FOUNDATION**: Daycare/childcare organizations
- **PRODUCT_SUPPLIER**: Product vendors
- **SERVICE_PROVIDER**: Service providers
- **EDUCATOR**: Job candidates
- **PARENT**: Parents seeking childcare

## Development Setup

### 1. Clerk Application Setup

1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Configure the application:
   - **Application name**: PC Solutions Platform
   - **Environment**: Development
   - **Allowed origins**: `http://localhost:5173`, `http://localhost:5174`
4. Copy the publishable and secret keys

### 2. Environment Variables

#### API (.env)
```bash
# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pc_solutions_dev"

# Server
PORT=3000
NODE_ENV=development
```

#### Frontend (.env)
```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
```

#### Admin (.env)
```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
```

### 3. Database Setup

1. Install PostgreSQL locally
2. Create a database: `pc_solutions_dev`
3. Run Prisma migrations:
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   pnpm prisma generate
   ```

### 4. Running the Applications

```bash
# Install dependencies
pnpm install

# Start all services in development
pnpm dev

# Or start individually:
pnpm --filter api dev
pnpm --filter frontend dev
pnpm --filter admin dev
```

## Production Setup (Render)

### 1. Clerk Production Application

1. Create a production application in Clerk
2. Configure domains:
   - **Frontend**: `dash.procrechesolutions.com`
   - **Admin**: `admin.procrechesolutions.com`
   - **API**: `api.procrechesolutions.com`
3. Copy production keys

### 2. Render Service Configuration

#### API Service
- **Build Command**: `cd apps/api && pnpm install && pnpm build`
- **Start Command**: `cd apps/api && pnpm start:prod`
- **Environment Variables**:
  ```
  DATABASE_URL=<from_render_postgres>
  PORT=3000
  NODE_ENV=production
  CLERK_SECRET_KEY=sk_live_your_production_key
  CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
  ```

#### Frontend Service
- **Build Command**: `cd apps/frontend && pnpm install && pnpm build`
- **Start Command**: `cd apps/frontend && pnpm preview`
- **Environment Variables**:
  ```
  VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
  VITE_API_URL=https://api.procrechesolutions.com/api
  VITE_NODE_ENV=production
  ```

#### Admin Service
- **Build Command**: `cd apps/admin && pnpm install && pnpm build`
- **Start Command**: `cd apps/admin && pnpm preview`
- **Environment Variables**:
  ```
  VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
  VITE_API_URL=https://api.procrechesolutions.com/api
  VITE_NODE_ENV=production
  ```

### 3. Database Migration

```bash
# Connect to production database
cd apps/api
pnpm prisma migrate deploy
pnpm prisma generate
```

## API Endpoints

### Authentication Endpoints

#### `GET /api/users/me`
- **Description**: Get current user profile
- **Authentication**: Required (JWT)
- **Response**: User profile with role and organization info

#### `POST /api/users/sync`
- **Description**: Sync user from Clerk webhook
- **Authentication**: None (webhook)
- **Body**: Clerk user object
- **Response**: Success confirmation

#### `GET /api/users`
- **Description**: Get all users (Admin only)
- **Authentication**: Required (JWT)
- **Authorization**: SUPER_ADMIN or ADMIN role
- **Response**: List of all users

### RBAC Implementation

#### Guards
- **JwtAuthGuard**: Validates JWT tokens
- **RolesGuard**: Enforces role-based access

#### Usage Example
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminController {
  // Admin-only endpoints
}
```

## Frontend Components

### Authentication Components

#### ClerkProviderWrapper
- Wraps the application with Clerk provider
- Handles Clerk configuration

#### AuthProvider
- Provides authentication context
- Manages user state and API communication
- Handles token refresh

#### Pages
- **LoginPage**: Sign-in form
- **SignupPage**: Registration with role selection
- **DashboardPage**: Role-based dashboard

### Usage Example
```typescript
import { useAuthContext } from './contexts/AuthContext';

function MyComponent() {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <LoginPage />;
  
  return <Dashboard user={user} />;
}
```

## Security Considerations

### JWT Validation
- Tokens are validated using Clerk's secret key
- Token expiration is enforced
- Invalid tokens result in 401 Unauthorized

### CORS Configuration
- Development: Allows all origins
- Production: Restricted to specific domains

### Role Enforcement
- All protected endpoints require authentication
- Role-based access is enforced at the controller level
- Super admin has full access to all endpoints

## Testing Authentication

### Manual Testing
1. Start all services: `pnpm dev`
2. Navigate to `http://localhost:5173`
3. Click "Sign Up" and select a role
4. Complete registration
5. Verify dashboard access
6. Test role-based features

### API Testing
```bash
# Get user profile
curl -H "Authorization: Bearer <jwt_token>" \
     http://localhost:3000/api/users/me

# Test admin endpoint (requires admin role)
curl -H "Authorization: Bearer <admin_jwt_token>" \
     http://localhost:3000/api/users
```

## Troubleshooting

### Common Issues

1. **"Invalid token" errors**:
   - Verify Clerk keys are correct
   - Check token expiration
   - Ensure CORS is configured properly

2. **"User not found" errors**:
   - Run user sync endpoint
   - Check database connection
   - Verify Prisma schema

3. **Role access denied**:
   - Check user role in database
   - Verify role mapping in Clerk metadata
   - Ensure RBAC guards are properly configured

### Debugging
- Check API logs for authentication errors
- Use Clerk dashboard to verify user data
- Test JWT tokens with online tools

### Google SSO Error: "Missing required parameter: client_id"

If you encounter the error `Error 400: invalid_request Missing required parameter: client_id` when attempting to sign up or log in with Google:

**Cause:**
This error occurs when the Google Social Connection is enabled in Clerk but not properly configured with Google Cloud credentials. This is common when:
1. You are running the application on a domain other than `localhost` (e.g., a cloud IDE url, `ngrok`, or production domain).
2. You are using a Clerk Production instance but haven't configured Google OAuth credentials.
3. You are using a Clerk Development instance with "Shared Credentials" on a non-localhost domain (Clerk's shared credentials only work on localhost).

**Solution:**
1. Go to your [Clerk Dashboard](https://dashboard.clerk.com).
2. Navigate to **User & Authentication > Social Connections**.
3. Click on the **Google** provider settings.
4. Ensure **Use custom credentials** is enabled (required for production or non-localhost development).
5. You must create a Project in [Google Cloud Console](https://console.cloud.google.com/), set up OAuth 2.0 credentials, and:
   - Copy the **Authorized redirect URI** from Clerk to your Google OAuth Client configuration.
   - Copy the **Client ID** and **Client Secret** from Google to your Clerk Dashboard.
6. Save the changes in Clerk.

### Step-by-Step: Configuring Google OAuth Credentials

To enable Google SSO for production or custom domains, follow these detailed steps:

#### 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name your project (e.g., "PC Solutions Auth") and click **Create**.

#### 2. Configure OAuth Consent Screen
1. In the left sidebar, go to **APIs & Services > OAuth consent screen**.
2. Select **External** (unless you only want users from your own Google Workspace organization).
3. Click **Create**.
4. Fill in the required fields:
   - **App name**: Your app's name (e.g., "PC Solutions Platform").
   - **User support email**: Your email address.
   - **Developer contact information**: Your email address.
5. Click **Save and Continue** through the Scopes and Test Users sections (defaults are usually fine for basic login).
6. Return to the dashboard.

#### 3. Create OAuth Client ID
1. In the left sidebar, go to **APIs & Services > Credentials**.
2. Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name it (e.g., "Clerk Production").
5. Under **Authorized redirect URIs**:
   - Go to your Clerk Dashboard > Social Connections > Google.
   - Copy the **Authorized redirect URI** value (e.g., `https://clerk.your-domain.com/v1/oauth/callback`).
   - Paste it into the Google Console's "Authorized redirect URIs" field.
   > **Note**: You generally do **not** need to add "Authorized JavaScript origins" when using Clerk with the redirect flow. The "Authorized redirect URI" is the critical setting.
6. Click **Create**.

#### 4. Connect to Clerk
1. After creating the credentials, Google will show a modal with your **Client ID** and **Client Secret**.
2. Copy the **Client ID**.
3. Paste it into the **Client ID** field in your Clerk Dashboard (Google settings).
4. Copy the **Client Secret**.
5. Paste it into the **Client Secret** field in your Clerk Dashboard.
6. Click **Save** in Clerk.

> **Note**: It may take a few minutes for Google credentials to propagate. If you still see errors immediately after setup, wait 5 minutes and try again.

### Step-by-Step: Configuring Facebook OAuth Credentials

To enable Facebook SSO for production or custom domains, follow these detailed steps:

#### 1. Create a Facebook App
1. Go to [Facebook for Developers](https://developers.facebook.com/).
2. Log in and click **My Apps** in the top right.
3. Click **Create App**.
4. Select **Authenticate and request data from users with Facebook Login** (or "Consumer" if using the older wizard) and click **Next**.
5. Enter your **App Name** (e.g., "PC Solutions Platform") and **App Contact Email**.
6. Click **Create app**.

#### 2. Set Up Facebook Login
1. In the App Dashboard, find **Facebook Login** under "Add products to your app" and click **Set Up**.
2. Select **Web** as the platform.
3. Enter your **Site URL** (e.g., `https://dash.procrechesolutions.com`) and click **Save**.
4. In the left sidebar, under **Facebook Login**, click **Settings**.
5. Find **Valid OAuth Redirect URIs**.
6. Go to your Clerk Dashboard > Social Connections > Facebook.
7. Copy the **Authorized redirect URI** value.
8. Paste it into the **Valid OAuth Redirect URIs** field in Facebook.
9. Click **Save Changes**.

#### 3. Connect to Clerk
1. In the Facebook App Dashboard sidebar, go to **App settings > Basic**.
2. Copy the **App ID**.
3. Paste it into the **Client ID** field in your Clerk Dashboard (Facebook settings).
4. Click **Show** next to **App Secret**, copy it.
5. Paste it into the **Client Secret** field in your Clerk Dashboard.
6. Click **Save** in Clerk.

#### 4. Go Live
1. By default, your Facebook app is in "Development" mode (only you can log in).
2. To allow public users, toggle the **App Mode** switch at the top of the dashboard to **Live**.
3. You may need to provide a Privacy Policy URL and Terms of Service URL in **App settings > Basic** before switching to Live.

## Next Steps

1. **User Profile Management**: Implement profile editing
2. **Organization Management**: Add organization creation/joining
3. **Subscription Integration**: Connect with Stripe
4. **Advanced RBAC**: Implement resource-level permissions
5. **Audit Logging**: Track authentication events