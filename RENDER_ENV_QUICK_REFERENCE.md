# Render Environment Variables - Quick Reference Card

**Quick Copy-Paste Guide for Render Deployment**

---

## 🎯 Frontend Service

### In Render Dashboard → Your Frontend Service → Environment

Add these **3 variables**:

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Get from Clerk Dashboard → API Keys |
| `VITE_API_URL` | `https://your-api.onrender.com/api` | Your backend URL + `/api` |
| `VITE_NODE_ENV` | `production` | Exact value |

**Build Settings**:
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

---

## 🎯 Admin Service  

### In Render Dashboard → Your Admin Service → Environment

Add these **3 variables** (SAME Clerk key as frontend):

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | **Same key as frontend** |
| `VITE_API_URL` | `https://your-api.onrender.com/api` | Your backend URL + `/api` |
| `VITE_NODE_ENV` | `production` | Exact value |

**Build Settings**:
- Build Command: `cd packages/ui && pnpm run build && cd ../../admin && pnpm run build`
- Publish Directory: `admin/dist`

---

## 🎯 Backend/API Service

### In Render Dashboard → Your API Service → Environment

Add these **minimum 9 variables**:

| Key | Value | Where to Get |
|-----|-------|--------------|
| `CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | `sk_live_...` | Clerk Dashboard → API Keys (⚠️ Keep secret!) |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | Clerk Dashboard → Webhooks (after creating endpoint) |
| `DATABASE_URL` | `postgresql://...` | Auto-filled if using Render PostgreSQL |
| `NODE_ENV` | `production` | Exact value |
| `PORT` | `3000` | Or let Render auto-set |
| `API_URL` | `https://your-api.onrender.com` | Your backend URL |
| `FRONTEND_URL` | `https://your-frontend.onrender.com` | Your frontend URL |
| `ADMIN_URL` | `https://your-admin.onrender.com` | Your admin URL |

**Optional but recommended**:

| Key | Value | Notes |
|-----|-------|-------|
| `JWT_SECRET` | Random 32+ chars | Generate with `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `7d` | Or your preferred duration |

**Build Settings**:
- Build Command: `npm install && npm run build`
- Start Command: `npm run start:prod`
- Health Check Path: `/health`

---

## 🔗 Getting Your Clerk Keys

### Step 1: Publishable Key
1. Go to: **https://dashboard.clerk.com**
2. Click: **API Keys** (left sidebar)
3. Copy: **Publishable Key** (starts with `pk_live_`)
4. Use in: Frontend, Admin, and Backend

### Step 2: Secret Key (Backend Only)
1. Same page: **API Keys**
2. Copy: **Secret Key** (starts with `sk_live_`)
3. **⚠️ NEVER expose this publicly**
4. Use in: Backend only

### Step 3: Webhook Secret (Backend Only)
1. Go to: **Webhooks** (left sidebar)
2. Click: **Add Endpoint**
3. URL: `https://your-api.onrender.com/webhooks/clerk`
4. Events: Select `user.created`, `user.updated`
5. Click: **Create**
6. Copy: **Signing Secret** (starts with `whsec_`)
7. Use in: Backend only

---

## ⚡ Super Quick Setup (5 Minutes)

### Copy these to Render:

**Frontend Environment Tab**:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY
VITE_API_URL=https://YOUR_API.onrender.com/api
VITE_NODE_ENV=production
```

**Admin Environment Tab**:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY
VITE_API_URL=https://YOUR_API.onrender.com/api
VITE_NODE_ENV=production
```

**Backend Environment Tab**:
```
CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY
CLERK_SECRET_KEY=sk_live_YOUR_SECRET
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
DATABASE_URL=postgresql://YOUR_DATABASE_URL
NODE_ENV=production
PORT=3000
API_URL=https://YOUR_API.onrender.com
FRONTEND_URL=https://YOUR_FRONTEND.onrender.com
ADMIN_URL=https://YOUR_ADMIN.onrender.com
JWT_SECRET=YOUR_RANDOM_32_CHAR_SECRET
JWT_EXPIRES_IN=7d
```

**Replace**:
- `YOUR_KEY` with actual Clerk publishable key
- `YOUR_SECRET` with actual Clerk secret key
- `YOUR_WEBHOOK_SECRET` with actual webhook secret
- `YOUR_DATABASE_URL` with your database connection string
- `YOUR_API` with your backend service name
- `YOUR_FRONTEND` with your frontend service name
- `YOUR_ADMIN` with your admin service name
- `YOUR_RANDOM_32_CHAR_SECRET` with generated JWT secret

**Then**: Click "Save Changes" and wait for auto-deploy!

---

## 🎯 Create First Admin User

After deployment:

1. Go to: https://dashboard.clerk.com
2. Click: **Users** → **Create User**
3. Enter email and password
4. Click: **Create**
5. Click on the new user
6. Go to: **Metadata** tab
7. Under **Public Metadata**, click **Edit**
8. Add:
```json
{
  "role": "SUPER_ADMIN"
}
```
9. Click: **Save**

Now you can log in to admin dashboard!

---

## 🔍 Verify Everything Works

### ✅ Frontend Checklist
- [ ] Frontend loads without errors
- [ ] Can access login page
- [ ] Can access signup page
- [ ] Clerk UI components appear (if using)
- [ ] No console errors about missing keys

### ✅ Admin Checklist
- [ ] Admin loads without errors
- [ ] Can access login page
- [ ] Admin user can log in
- [ ] Non-admin sees "Access Denied"
- [ ] Dashboard loads after login

### ✅ Backend Checklist
- [ ] Backend responds to health check
- [ ] Webhook endpoint exists
- [ ] Webhook receives test events
- [ ] Users created in database on signup
- [ ] CORS allows frontend/admin requests
- [ ] JWT tokens generated correctly

---

## 💡 Pro Tips

### 1. Test in Development First
Use `pk_test_` and `sk_test_` keys in development to avoid affecting production users.

### 2. Same Clerk App for Both
Frontend and Admin should use the **SAME** Clerk application (same keys). Only the `role` in publicMetadata differentiates them.

### 3. Webhook is Critical
Without the webhook, users won't be created in your database. Frontend now waits 2 seconds for webhook, but it must be configured!

### 4. Monitor Logs
After deployment, monitor Render logs for:
- Clerk authentication errors
- Webhook errors
- Database connection errors
- CORS errors

### 5. Security
- Never commit `.env` files
- Rotate keys if exposed
- Use strong JWT secrets
- Enable MFA for admin accounts

---

## 🚀 Deploy Order

1. **Backend First** (with database)
2. **Configure Webhook** in Clerk
3. **Test Webhook** works
4. **Frontend Second**
5. **Admin Third**
6. **Test Everything**

This order ensures backend is ready when frontend/admin try to create users!

---

## 📞 Support

If you get stuck:
- **Clerk Issues**: https://clerk.com/support
- **Render Issues**: https://docs.render.com
- **Check Logs**: Render Dashboard → Your Service → Logs
- **Review Docs**: See `RENDER_ENV_VARS_COMPLETE.md` for detailed explanations

---

**Quick Reference Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready to Use 🎯
