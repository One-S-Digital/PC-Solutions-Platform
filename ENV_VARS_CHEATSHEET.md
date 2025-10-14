# 🚀 Render Environment Variables - Cheat Sheet

**Quick reference for deployment** | Updated: 2025-10-14

---

## Frontend (3 vars) 📱

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_
VITE_API_URL=https://YOUR-API.onrender.com/api
VITE_NODE_ENV=production
```

---

## Admin (3 vars) 👨‍💼

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_
VITE_API_URL=https://YOUR-API.onrender.com/api
VITE_NODE_ENV=production
```

**⚠️ Use SAME Clerk key as frontend!**

---

## Backend (9 vars minimum) ⚙️

```env
CLERK_PUBLISHABLE_KEY=pk_live_
CLERK_SECRET_KEY=sk_live_
CLERK_WEBHOOK_SECRET=whsec_
DATABASE_URL=postgresql://
NODE_ENV=production
PORT=3000
API_URL=https://YOUR-API.onrender.com
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
ADMIN_URL=https://YOUR-ADMIN.onrender.com
JWT_SECRET=generate_random_32_chars
JWT_EXPIRES_IN=7d
```

---

## 🔑 Get Clerk Keys

| Key | Where | Starts With |
|-----|-------|-------------|
| Publishable | dashboard.clerk.com → API Keys | `pk_live_` |
| Secret | dashboard.clerk.com → API Keys | `sk_live_` |
| Webhook | dashboard.clerk.com → Webhooks (create first) | `whsec_` |

---

## 🔧 Clerk Setup (5 mins)

1. **Add Origins**: Settings → Domains
   ```
   https://your-frontend.onrender.com
   https://your-admin.onrender.com
   ```

2. **Create Webhook**: Webhooks → Add Endpoint
   ```
   URL: https://your-api.onrender.com/webhooks/clerk
   Events: user.created, user.updated
   ```

3. **Make Admin**: Users → Your User → Metadata
   ```json
   {"role": "SUPER_ADMIN"}
   ```

---

## ✅ Deploy Order

1. Backend (with database)
2. Configure webhook
3. Frontend
4. Admin
5. Test!

---

## 🆘 Quick Troubleshooting

| Error | Fix |
|-------|-----|
| "Config Error" | Add `VITE_CLERK_PUBLISHABLE_KEY` |
| "Access Denied" | Add role to publicMetadata |
| CORS error | Add `FRONTEND_URL` to backend |
| User not created | Check webhook configured |
| OAuth fails | Add redirect URLs to Clerk |

---

## 📊 Quick Validation

After deployment, test:
- ✅ Login → Should work
- ✅ Logout → Should clear session
- ✅ Signup → Should create user
- ✅ Admin login → Should access dashboard
- ✅ Non-admin → Should see "Access Denied"

---

**Full docs**: See `ALL_ENV_VARS_FOR_RENDER.txt`
