# PC Solutions Platform - Local Deployment Guide

This guide provides comprehensive instructions for setting up the PC Solutions platform locally for development.

## Project Overview

The PC Solutions platform is a monorepo containing:
- **API**: NestJS backend with PostgreSQL, Prisma ORM
- **Frontend**: React/Vite application (public-facing website)
- **Admin**: React/Vite admin dashboard
- **Services**: PostgreSQL database, ClamAV antivirus, Mailpit email service

## Prerequisites

Before setting up the local environment, ensure you have:

### Required Software
- **Node.js** >= 18.0.16
- **pnpm** >= 9.0.0
- **Docker** >= 24.0.0
- **Docker Compose** >= 2.0.0
- **Git** (latest version)

### Verify Installation
```bash
node --version  # Should be >= 18.0.16
pnpm --version  # Should be >= 9.0.0
docker --version  # Should be >= 24.0.0
docker compose version  # Should be >= 2.0.0
```

## Quick Start

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone <repository-url>
cd PC-Solutions-V2

# Install dependencies
pnpm install

# Start all services
docker compose up -d

# Wait for services to be healthy, then run database migrations
docker compose exec api pnpm run prisma:migrate

# Seed the database (optional)
docker compose exec api pnpm run db:seed
```

### 2. Access Services

Once running, your services will be available at:
- **API**: http://localhost:3000
- **Frontend**: http://localhost:5173  
- **Admin**: http://localhost:5174
- **Mailpit**: http://localhost:8025 (Email testing)
- **Database**: localhost:5432

## Detailed Setup Guide

### Step 1: Environment Configuration

#### API Environment Setup
Create `api/.env` file:

```bash
# Database
DATABASE_URL="postgresql://pc_solutions_user:pc_solutions_password@localhost:5432/pc_solutions_dev"

# Server
PORT=3000
NODE_ENV=development

# Clerk Authentication (Required)
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Cloudflare R2 Storage (Required for file uploads)
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_BUCKET_NAME=your_bucket_name_here
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Email Configuration (Optional - uses Mailpit in dev)
MAIL_PROVIDER=SMTP
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="PC Solutions <no-reply@notify.pc-solutions.ch>"

# Monitoring (Optional)
PROMETHEUS_SCRAPE_TOKEN=your_prometheus_token_here

# Antivirus (Uses ClamAV in Docker)
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
```

#### Frontend Environment Setup
Create `frontend/.env` file:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration  
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
```

#### Admin Environment Setup
Create `admin/.env` file:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment  
VITE_NODE_ENV=development
```

### Step 2: Required API Keys Setup

#### Clerk Authentication
1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the publishable and secret keys
4. Configure allowed domains for development:
   - `http://localhost:5173` (frontend)
   - `http://localhost:5174` (admin)
   - `http://localhost:3000` (API)

#### Cloudflare R2 Storage
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Create a new bucket for assets
4. Generate API tokens with R2 permissions:
   - Bucket permissions: Read/Write
   - Template: "Custom token"
5. Copy the access key ID and secret

#### Stripe Payment Integration
1. Go to [stripe.com](https://stripe.com)
2. Create an account and get test API keys
3. Set up webhooks for development:
   - Endpoint: `http://localhost:3000/api/webhooks/stripe`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, etc.
4. Copy the webhook secret

### Step 3: Database Setup

The Docker Compose setup includes a PostgreSQL database with the following configuration:

- **Host**: localhost:5432
- **Database**: pc_solutions_dev
- **Username**: pc_solutions_user  
- **Password**: pc_solutions_password

#### Manual Database Initialization
If you need to manually set up the database:

```bash
# Start just the database service
docker compose up -d postgres

# Wait for database to be ready, then generate Prisma client
cd api
pnpm run prisma:generate

# Run migrations
pnpm run prisma:migrate

# Optional: Seed with initial data
pnpm run db:seed
```

#### Frontend Configuration Fix
The frontend needs to be configured to use port 5173. The `vite.config.ts` should have:

```typescript
server: {
  port: 5173,
  host: '0.0.0.0',
},
```

Make sure this configuration is correct in `frontend/vite.config.ts`.

### Step 4: Development Workflow

#### Starting All Services
```bash
# Start all services (recommended for full development)
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

#### Individual Service Development
```bash
# Start only infrastructure services (DB, ClamAV, Mailpit)
docker compose up -d postgres clamav mailpit

# Start API in development mode
cd api
pnpm run start:dev

# Start Frontend in development mode (new terminal)
cd frontend  
pnpm run dev

# Start Admin in development mode (new terminal)
cd admin
pnpm run dev
```

### Step 5: Testing the Setup

#### Health Checks
```bash
# Check API health
curl http://localhost:3000/api/health

# Check mailpit is running
curl http://localhost:8025/api/v1/messages

# Check database connection
docker compose exec api pnpm prisma db push --preview-feature
```

#### Test User Creation
1. Navigate to http://localhost:5173
2. Sign up with Clerk authentication
3. Check the admin dashboard at http://localhost:5174
4. Verify user appears in the database:
   ```bash
   docker compose exec api pnpm run prisma:studio
   ```

## Application Architecture

### Services Overview

#### API Service (`api/`)
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk integration
- **File Storage**: Cloudflare R2 with antivirus scanning
- **Payments**: Stripe integration
- **Port**: 3000

#### Frontend Application (`frontend/`)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Authentication**: Clerk React integration
- **Port**: 5173

#### Admin Dashboard (`admin/`)
- **Framework**: React  19 + Vite  
- **Styling**: Tailwind CSS
- **Authentication**: Clerk React integration
- **Features**: User management, content moderation, analytics
- **Port**: 5174

#### Database (`postgres`)
- **Version**: PostgreSQL 15
- **Features**: Health checks, data persistence
- **Port**: 5432

#### Antivirus Service (`clamav`)
- **Purpose**: File scanning for uploads
- **Configuration**: Real-time scanning, database updates
- **Port**: 3310

#### Email Service (`mailpit`)
- **Purpose**: Email testing in development
- **Features**: SMTP server + Web UI
- **SMTP Port**: 1025
- **Web UI Port**: 8025

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Reset database
docker compose down -v
docker compose up -d postgres
docker compose exec api pnpm run prisma:migrate

# Check database logs
docker compose logs postgres
```

#### API Startup Issues
```bash
# Check if required environment variables are set
docker compose exec api env | grep -E "(CLERK|R2|STRIPE)"

# Check API logs
docker compose logs api

# Rebuild API service
docker compose build api --no-cache
```

#### Frontend/Admin Build Issues
```bash
# Clear node_modules and rebuild
rm -rf node_modules packages/*/node_modules admin/node_modules frontend/node_modules
pnpm install

# Check if packages build correctly
pnpm run build
```

#### Docker Issues
```bash
# Clean up Docker resources
docker system prune -a

# Rebuild all services
docker compose build --no-cache
docker compose up -d
```

### Environment Variable Validation

The applications validate required environment variables on startup. Check logs for missing variables:

```bash
# API environment check
docker compose exec api pnpm run start:dev

# Check for missing variables in logs
docker compose logs api | grep -i "missing\|required\|invalid"
```

### Port Conflicts

If you have port conflicts, modify the ports in `docker-compose.yml`:

```yaml
services:
  api:
    ports:
      - "3001:3000"  # Change if port 3000 is occupied
  frontend:
    ports:  
      - "5174:5173"  # Change if port 5173 is occupied
  admin:
    ports:
      - "5175:5174"  # Change if port 5174 is occupied
```

## Development Commands

### Package Management
```bash
# Install dependencies
pnpm install

# Run linting
pnpm run lint

# Run tests
pnpm run test

# Build all applications
pnpm run build

# Clean build artifacts
pnpm run clean
```

### API-Specific Commands
```bash
cd api

# Database operations
pnpm run prisma:generate  # Generate Prisma client
pnpm run prisma:migrate   # Run migrations
pnpm run prisma:studio    # Open Prisma Studio

# Development
pnpm run start:dev        # Start in development mode
pnpm run start:debug     # Start with debugging
pnpm run test             # Run tests
pnpm run test:watch      # Run tests in watch mode
```

### Frontend/Admin Commands
```bash
cd frontend  # or cd admin

# Development
pnpm run dev              # Start development server
pnpm run build            # Build for production
pnpm run preview          # Preview production build

# Linting and testing
pnpm run lint             # Run ESLint
pnpm run lint:fix         # Fix linting issues
pnpm run type-check       # TypeScript type checking
```

## Production Deployment

For production deployment, refer to:
- `RENDER_DEPLOYMENT_GUIDE.md` - Cloud deployment on Render
- `ENVIRONMENT_SETUP.md` - Environment variable configuration
- `docs/DEPLOYMENT_VERIFICATION.md` - Deployment verification checklist

## Additional Resources

- **Database Schema**: `api/prisma/schema.prisma`
- **API Documentation**: Available at `http://localhost:3000/api/docs` when running
- **Mailpit UI**: Visit `http://localhost:8025` to view test emails
- **Prisma Studio**: Run `cd api && pnpm run prisma:studio` to browse database

## Support

If you encounter issues during setup:

1. Check this guide's troubleshooting section
2. Review service logs: `docker compose logs [service-name]`
3. Verify all environment variables are properly set
4. Ensure required API keys are valid and properly configured
5. Contact the development team for assistance

---

**Note**: This platform requires valid API keys for Clerk, Cloudflare R2, and Stripe to function properly. Make sure to set up accounts and configure these services before starting development.
