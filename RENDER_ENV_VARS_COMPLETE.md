# Render Environment Variables - Complete Guide

**Date**: 2025-10-14  
**Post Phase 1 & 2 Fixes**  
**Status**: Ready for Deployment

---

## 🎯 Quick Summary

After Phase 1 & 2 authentication fixes, you need these environment variables for each service on Render:

| Service | Critical Vars | Optional Vars | Total |
|---------|---------------|---------------|-------|
| **Frontend** | 3 | 0 | 3 |
| **Admin** | 3 | 0 | 3 |
| **API/Backend** | 6+ | 4+ | 10+ |

---

## 1️⃣ Frontend Service (Render)

### Service Type: Static Site or Web Service

```env
# ============================================
# CLERK AUTHENTICATION (REQUIRED)
# ============================================
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_KEY_HERE

# ============================================
# API CONFIGURATION (REQUIRED)
# ============================================
VITE_API_URL=https://your-api-service-name.onrender.com/api

# ============================================
# ENVIRONMENT (REQUIRED)
# ============================================
VITE_NODE_ENV=production
```

### How to Get Values

#### VITE_CLERK_PUBLISHABLE_KEY
1. Go to: https://dashboard.clerk.com
2. Select your application
3. Navigate to: **API Keys**
4. Copy the **Publishable Key** (starts with `pk_live_` for production)
5. **IMPORTANT**: Use `pk_live_` for production, `pk_test_` for testing

#### VITE_API_URL
- Format: `https://[your-api-service-name].onrender.com/api`
- Example: `https://procreche-api.onrender.com/api`
- Find your API service name in Render dashboard
- **Must end with `/api`**

#### VITE_NODE_ENV
- Set to: `production`
- This enables production optimizations

### Additional Notes for Frontend
- **NO** other variables needed after Phase 1 & 2
- All authentication now handled by Clerk
- No mock auth variables needed
- No local storage tokens

---

## 2️⃣ Admin Service (Render)

### Service Type: Static Site or Web Service

```env
# ============================================
# CLERK AUTHENTICATION (REQUIRED)
# ============================================
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_KEY_HERE

# ============================================
# API CONFIGURATION (REQUIRED)
# ============================================
VITE_API_URL=https://your-api-service-name.onrender.com/api

# ============================================
# ENVIRONMENT (REQUIRED)
# ============================================
VITE_NODE_ENV=production
```

### How to Get Values

**Same as Frontend** - Use the **EXACT SAME** Clerk key for both!

#### Why Same Key?
- Frontend and Admin share the same Clerk application
- Users can log in to both with the same account
- Admin users are differentiated by `publicMetadata.role`
- Single source of truth for authentication

### Admin-Specific Configuration

**IMPORTANT**: Admin access is controlled by user roles in Clerk's `publicMetadata`, NOT environment variables!

To make a user an admin:
1. Go to: https://dashboard.clerk.com
2. Navigate to: **Users**
3. Click on the user
4. Go to: **Metadata** tab
5. Under **Public Metadata**, add:
```json
{
  "role": "SUPER_ADMIN"
}
```
or
```json
{
  "role": "ADMIN"
}
```

### Additional Notes for Admin
- Uses same Clerk application as frontend
- No separate authentication setup
- Role-based access handled in code via `publicMetadata`

---

## 3️⃣ API/Backend Service (Render)

### Service Type: Web Service

```env
# ============================================
# CLERK AUTHENTICATION (REQUIRED)
# ============================================
CLERK_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_KEY_HERE
CLERK_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# ============================================
# DATABASE (REQUIRED)
# ============================================
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# ============================================
# APPLICATION SETTINGS (REQUIRED)
# ============================================
NODE_ENV=production
PORT=3000
API_URL=https://your-api-service-name.onrender.com

# ============================================
# CORS SETTINGS (REQUIRED)
# ============================================
FRONTEND_URL=https://your-frontend-service-name.onrender.com
ADMIN_URL=https://your-admin-service-name.onrender.com

# ============================================
# JWT/SESSION (OPTIONAL BUT RECOMMENDED)
# ============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d

# ============================================
# EMAIL SERVICE (OPTIONAL)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# ============================================
# FILE UPLOAD (OPTIONAL)
# ============================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=eu-west-1

# ============================================
# OTHER SERVICES (OPTIONAL)
# ============================================
REDIS_URL=redis://username:password@host:port
```

### Critical Variables Explained

#### CLERK_PUBLISHABLE_KEY
- Same as frontend/admin
- Used for verifying tokens

#### CLERK_SECRET_KEY
1. Go to: https://dashboard.clerk.com
2. Navigate to: **API Keys**
3. Copy the **Secret Key** (starts with `sk_live_`)
4. **⚠️ NEVER commit this to git**
5. **⚠️ Keep this secret**

#### CLERK_WEBHOOK_SECRET
1. Go to: https://dashboard.clerk.com
2. Navigate to: **Webhooks**
3. Click **Add Endpoint**
4. Enter URL: `https://your-api-service-name.onrender.com/webhooks/clerk`
5. Select events: `user.created`, `user.updated`, `user.deleted`
6. Copy the **Signing Secret** (starts with `whsec_`)
7. Save the endpoint

**Why Webhook is Critical**:
- Backend creates users when they sign up
- Backend assigns roles from `pendingRole` to `publicMetadata`
- Without webhook, users won't be created in database
- Frontend waits 2 seconds for webhook to process

#### DATABASE_URL
- Automatically provided by Render if you add a PostgreSQL database
- Or use external database like Supabase, Railway, etc.
- Format: `postgresql://user:password@host:port/database`

#### CORS URLs
- `FRONTEND_URL`: Your frontend Render URL
- `ADMIN_URL`: Your admin Render URL
- Used to allow cross-origin requests
- Must match exactly (no trailing slash)

---

## 🔐 Security Best Practices

### ✅ DO

1. ✅ Use `pk_live_` and `sk_live_` keys in production
2. ✅ Use `pk_test_` and `sk_test_` keys in development
3. ✅ Rotate keys if they're ever exposed
4. ✅ Use strong, random values for `JWT_SECRET` (min 32 chars)
5. ✅ Enable MFA for Clerk admin accounts
6. ✅ Set up proper CORS policies
7. ✅ Use environment variables, never hardcode
8. ✅ Keep `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET` private

### ❌ DON'T

1. ❌ Never commit `.env` files to git
2. ❌ Never expose secret keys in frontend code
3. ❌ Never use test keys in production
4. ❌ Never share webhook secrets publicly
5. ❌ Never disable Clerk webhook signature verification
6. ❌ Never allow CORS from `*` in production

---

## 📋 Render Configuration Checklist

### Frontend Service on Render

**Service Settings**:
- Build Command: `npm run build` or `vite build`
- Publish Directory: `dist`
- Auto-Deploy: Yes

**Environment Variables** (add in Render dashboard):
```
VITE_CLERK_PUBLISHABLE_KEY = pk_live_your_actual_key
VITE_API_URL = https://your-api.onrender.com/api
VITE_NODE_ENV = production
```

**Custom Domain** (optional):
- Add your domain in Render settings
- Update Clerk allowed domains
- Update CORS in backend

---

### Admin Service on Render

**Service Settings**:
- Build Command: `cd ../packages/ui && pnpm run build && cd ../../admin && vite build`
- Publish Directory: `admin/dist`
- Auto-Deploy: Yes

**Environment Variables** (add in Render dashboard):
```
VITE_CLERK_PUBLISHABLE_KEY = pk_live_your_actual_key
VITE_API_URL = https://your-api.onrender.com/api
VITE_NODE_ENV = production
```

**Note**: Admin uses monorepo build, so build command is different.

---

### API/Backend Service on Render

**Service Settings**:
- Build Command: `npm install && npm run build` or `pnpm install && pnpm run build`
- Start Command: `npm run start:prod` or `node dist/main.js`
- Auto-Deploy: Yes

**Environment Variables** (add in Render dashboard):
```
# Clerk
CLERK_PUBLISHABLE_KEY = pk_live_your_actual_key
CLERK_SECRET_KEY = sk_live_your_secret_key
CLERK_WEBHOOK_SECRET = whsec_your_webhook_secret

# Database (auto-populated if using Render PostgreSQL)
DATABASE_URL = postgresql://...

# App
NODE_ENV = production
PORT = 3000
API_URL = https://your-api.onrender.com

# CORS
FRONTEND_URL = https://your-frontend.onrender.com
ADMIN_URL = https://your-admin.onrender.com

# JWT
JWT_SECRET = your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN = 7d
```

**Database**:
- Add PostgreSQL database in Render
- It will auto-populate `DATABASE_URL`
- Run migrations after deployment

**Health Check**:
- Path: `/health` or `/api/health`
- Ensures service is running

---

## 🔧 Clerk Dashboard Configuration

After adding environment variables, configure Clerk:

### 1. Allowed Origins (CORS)

Go to: **Settings** → **Domains**

Add:
- `http://localhost:3001` (development frontend)
- `http://localhost:3000` (development admin)
- `https://your-frontend.onrender.com` (production)
- `https://your-admin.onrender.com` (production)

### 2. OAuth Redirect URLs

Go to: **User & Authentication** → **Social Connections**

For each provider (Google, Facebook, etc.), add:
- Development: `http://localhost:3001/dashboard`
- Production: `https://your-frontend.onrender.com/dashboard`
- Admin Dev: `http://localhost:3000/dashboard`
- Admin Prod: `https://your-admin.onrender.com/dashboard`

### 3. Webhook Configuration

Go to: **Webhooks** → **Add Endpoint**

- URL: `https://your-api.onrender.com/webhooks/clerk`
- Events: Select:
  - ✅ `user.created`
  - ✅ `user.updated`
  - ✅ `user.deleted` (optional)
- Copy the **Signing Secret** → Add to backend as `CLERK_WEBHOOK_SECRET`

### 4. Email Verification (Optional)

Go to: **User & Authentication** → **Email**

- Enable: "Email verification"
- Method: "Email code"
- This enables the verification flow we added in Phase 2

---

## 🧪 Testing After Deployment

### 1. Test Frontend

```bash
# Check if frontend loads
curl https://your-frontend.onrender.com

# Check if it can reach API
# Open browser dev tools → Network tab
# Login and check if API calls succeed
```

### 2. Test Admin

```bash
# Check if admin loads
curl https://your-admin.onrender.com

# Login with admin user
# Verify role check works (non-admins see Access Denied)
```

### 3. Test Backend

```bash
# Test health endpoint
curl https://your-api.onrender.com/health

# Test Clerk webhook (from Clerk dashboard)
# Go to Webhooks → Your endpoint → Send test event
```

### 4. Test Authentication Flow

1. **Signup**:
   - Go to frontend signup
   - Create new account
   - Check if verification email sent (if enabled)
   - Verify backend creates user via webhook
   - Check if user has correct role in database

2. **Login**:
   - Login with email/password
   - Verify redirect to dashboard
   - Check if session persists

3. **Logout**:
   - Click logout
   - Verify redirect to login
   - Verify session cleared
   - Try accessing protected route (should redirect)

4. **OAuth** (if configured):
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Verify redirect works
   - Check if user created in database

---

## 🚨 Troubleshooting

### Frontend/Admin Issues

**Problem**: "VITE_CLERK_PUBLISHABLE_KEY is required"
- ✅ Add key to Render environment variables
- ✅ Redeploy service
- ✅ Check key starts with `pk_live_`

**Problem**: "Failed to fetch" or CORS errors
- ✅ Check `VITE_API_URL` is correct
- ✅ Check backend CORS settings
- ✅ Add frontend URL to `FRONTEND_URL` in backend
- ✅ Check Clerk allowed origins

**Problem**: OAuth redirect fails
- ✅ Add redirect URL to Clerk dashboard
- ✅ Use full URL (not relative path)
- ✅ Check OAuth provider is enabled in Clerk

### Backend Issues

**Problem**: Webhook not receiving events
- ✅ Check webhook URL is correct
- ✅ Check webhook endpoint responds (test with curl)
- ✅ Check `CLERK_WEBHOOK_SECRET` is correct
- ✅ Enable logging in webhook handler
- ✅ Test webhook from Clerk dashboard

**Problem**: Users not created in database
- ✅ Check webhook is configured
- ✅ Check `DATABASE_URL` is correct
- ✅ Run database migrations
- ✅ Check webhook handler logs
- ✅ Test webhook manually

**Problem**: Role assignment not working
- ✅ Check webhook reads `pendingRole` from unsafeMetadata
- ✅ Check webhook sets `role` in publicMetadata
- ✅ Check Clerk secret key has write permissions
- ✅ Verify user's publicMetadata in Clerk dashboard

---

## 📊 Environment Variables Summary Table

| Variable | Frontend | Admin | Backend | Where to Get |
|----------|----------|-------|---------|--------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ Required | ✅ Required | ❌ | Clerk Dashboard → API Keys |
| `CLERK_PUBLISHABLE_KEY` | ❌ | ❌ | ✅ Required | Clerk Dashboard → API Keys (same as above) |
| `CLERK_SECRET_KEY` | ❌ | ❌ | ✅ Required | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | ❌ | ❌ | ✅ Required | Clerk Dashboard → Webhooks |
| `VITE_API_URL` | ✅ Required | ✅ Required | ❌ | Your backend Render URL |
| `DATABASE_URL` | ❌ | ❌ | ✅ Required | Render PostgreSQL or external |
| `NODE_ENV` / `VITE_NODE_ENV` | ✅ Required | ✅ Required | ✅ Required | Set to "production" |
| `PORT` | ❌ | ❌ | ✅ Required | Set to 3000 or Render default |
| `FRONTEND_URL` | ❌ | ❌ | ✅ Required | Your frontend Render URL |
| `ADMIN_URL` | ❌ | ❌ | ✅ Required | Your admin Render URL |
| `JWT_SECRET` | ❌ | ❌ | ⚠️ Recommended | Generate random 32+ char string |

---

## 🎯 Quick Copy-Paste Templates

### Frontend .env Template
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_
VITE_API_URL=https://
VITE_NODE_ENV=production
```

### Admin .env Template
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_
VITE_API_URL=https://
VITE_NODE_ENV=production
```

### Backend .env Template
```env
# Clerk
CLERK_PUBLISHABLE_KEY=pk_live_
CLERK_SECRET_KEY=sk_live_
CLERK_WEBHOOK_SECRET=whsec_

# Database
DATABASE_URL=postgresql://

# App
NODE_ENV=production
PORT=3000
API_URL=https://

# CORS
FRONTEND_URL=https://
ADMIN_URL=https://

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d
```

---

## 🔑 Generating Secure JWT Secret

Use one of these methods:

```bash
# Method 1: OpenSSL
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Online (use trusted generator)
# https://generate-secret.vercel.app/32
```

**Result**: Use the generated string as `JWT_SECRET`

---

## ✅ Pre-Deployment Checklist

### Before Deploying to Render

- [ ] Get Clerk publishable key (`pk_live_`)
- [ ] Get Clerk secret key (`sk_live_`)
- [ ] Create Clerk webhook
- [ ] Get webhook signing secret (`whsec_`)
- [ ] Generate JWT secret (32+ chars)
- [ ] Prepare database URL
- [ ] Know all three service URLs (frontend, admin, backend)

### Clerk Configuration

- [ ] Add allowed origins (frontend + admin URLs)
- [ ] Configure OAuth redirect URLs
- [ ] Set up webhook endpoint
- [ ] Enable email verification (optional)
- [ ] Create first admin user with publicMetadata

### Render Configuration

- [ ] Add environment variables to frontend service
- [ ] Add environment variables to admin service
- [ ] Add environment variables to backend service
- [ ] Configure build commands
- [ ] Configure start commands
- [ ] Set up health checks
- [ ] Connect database (if using Render PostgreSQL)

### Testing

- [ ] Deploy all three services
- [ ] Test frontend loads
- [ ] Test admin loads
- [ ] Test backend health endpoint
- [ ] Test webhook receives events
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test OAuth (if configured)
- [ ] Test role-based access
- [ ] Monitor logs for errors

---

## 🎊 Ready to Deploy!

You now have everything needed to deploy to Render with the Phase 1 & 2 authentication fixes!

**Order of Deployment**:
1. Deploy backend first (with database)
2. Set up Clerk webhook
3. Test webhook works
4. Deploy frontend
5. Deploy admin
6. Test full authentication flow

**Estimated Time**: 30-45 minutes for complete setup

---

**Document Version**: 1.0  
**Created**: 2025-10-14  
**Status**: Ready for Production Deployment
