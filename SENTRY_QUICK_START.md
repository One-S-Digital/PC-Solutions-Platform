# Sentry Quick Start

## 🚀 Get Started in 5 Minutes

### Step 1: Create Sentry Projects (2 minutes)

1. Go to https://sentry.io and sign up (free)
2. Create a new organization (or use existing)
3. Create 3 projects:
   - Project name: `frontend`, Platform: **React**
   - Project name: `admin`, Platform: **React**
   - Project name: `api`, Platform: **Node.js**

### Step 2: Get Your DSNs (1 minute)

For each project, copy the DSN from the setup page:
- It looks like: `https://abc123@o0.ingest.sentry.io/123456`

### Step 3: Add Environment Variables (2 minutes)

#### Frontend (.env)
```bash
cd /workspace/frontend
echo "VITE_SENTRY_DSN=your-frontend-dsn" >> .env
```

#### Admin (.env)
```bash
cd /workspace/admin
echo "VITE_SENTRY_DSN=your-admin-dsn" >> .env
```

#### API (.env)
```bash
cd /workspace/api
echo "SENTRY_DSN=your-api-dsn" >> .env
```

### Step 4: Test It! (1 minute)

Start the applications:
```bash
pnpm dev
```

**Frontend/Admin**: Look for a floating feedback button (bottom right)

**Test Error Capture**: 
```javascript
// Use Sentry's API directly for console testing:
Sentry.captureException(new Error('Testing Sentry Integration!'));

// Or add this temporarily in a React component to test error boundary:
// throw new Error('Testing Sentry Integration!');
```

**Check Sentry**: Go to your Sentry dashboard → Issues. You should see the error!

---

## 🎉 That's It!

You now have:
- ✅ Error tracking
- ✅ Performance monitoring
- ✅ User feedback widget
- ✅ Session replay

## 📖 Next Steps

- Read the full guide: [SENTRY_INTEGRATION_GUIDE.md](./SENTRY_INTEGRATION_GUIDE.md)
- Set up alerts in Sentry
- Configure production settings

## 🆘 Need Help?

If the widget doesn't appear or errors aren't captured:
1. Check browser console for Sentry logs
2. Verify DSN is correct (no extra quotes/spaces)
3. Restart the dev server
4. See [SENTRY_INTEGRATION_GUIDE.md](./SENTRY_INTEGRATION_GUIDE.md) for troubleshooting
