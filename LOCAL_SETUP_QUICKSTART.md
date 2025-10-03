# PC Solutions Platform - Quick Start Local Setup

This guide provides the fastest way to get the PC Solutions platform running locally.

## 🚀 Quick Start (Automated Setup)

### Option 1: Automated Setup Script (Recommended)

```bash
# Run the automated setup script
./scripts/setup-local-dev.sh

# Start development applications
./scripts/start-dev.sh
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start services
docker compose up -d

# 3. Setup environment files (copy examples)
cp env-example-api.txt api/.env
cp env-example-frontend.txt frontend/.env  
cp env-example-admin.txt admin/.env

# 4. Edit environment files with your API keys

# 5. Setup database
cd api
pnpm run prisma:migrate
cd ..

# 6. Start frontend and admin
cd frontend && pnpm run dev &
cd admin && pnpm run dev &
```

## 🔑 Required API Keys

Before running, you need to obtain API keys from these services:

### 1. Clerk Authentication
- Go to [clerk.com](https://clerk.com)
- Create new application
- Copy publishable and secret keys
- Add to all `.env` files

### 2. Cloudflare R2 Storage  
- Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
- Navigate to R2 Object Storage
- Create bucket and generate API tokens
- Add to `api/.env`

### 3. Stripe Payment Processing
- Go to [stripe.com](https://stripe.com)
- Get test API keys and webhook secret
- Add to `api/.env`

## 🏃‍♂️ Running Applications

Once setup is complete:

```bash
# Start infrastructure (database, antivirus, email)
docker compose up -d

# Start API
docker compose up -d api

# Start development frontend (separate terminal)
cd frontend
pnpm run dev

# Start development admin (separate terminal)  
cd admin
pnpm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5174
- **API**: http://localhost:3000
- **Email Testing**: http://localhost:8025
- **API Docs**: http://localhost:3000/api/docs

## ⚠️ Troubleshooting

### Common Issues

**Port conflicts**: Change ports in `docker-compose.yml`

**API not starting**: Check `api/.env` has valid keys

**Database issues**: Reset with `docker compose down -v && docker compose up -d`

**Build failures**: Clear cache with `pnpm clean && pnpm install`

### Environment Variables Missing

Check your `.env` files contain:
- `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`  
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

## 📚 Additional Documentation

- **Complete Setup Guide**: [LOCAL_DEPLOYMENT_GUIDE.md](./LOCAL_DEPLOYMENT_GUIDE.md)
- **Environment Setup**: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- **Production Deployment**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

## 🛠 Development Commands

```bash
# Package management
pnpm install          # Install dependencies
pnpm run build        # Build all applications
pnpm run lint         # Lint all code
pnpm run test         # Run all tests

# API specific
cd api
pnpm run start:dev    # Start API in development
pnpm prisma studio    # Open database browser
pnpm run seed         # Seed database

# Frontend/Admin specific
cd frontend           # or cd admin
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run preview      # Preview production build
```

## 🎯 First Steps After Setup

1. ✅ Verify all services are running
2. ✅ Update environment files with real API keys
3. ✅ Test user registration/login
4. ✅ Upload a test file
5. ✅ Send a test email

---

**Need help?** Check the comprehensive [LOCAL_DEPLOYMENT_GUIDE.md](./LOCAL_DEPLOYMENT_GUIDE.md) for detailed troubleshooting and advanced configuration.
