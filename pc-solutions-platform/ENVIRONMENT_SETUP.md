# Environment Variables Setup Guide

This guide provides detailed instructions for setting up environment variables for both development and production (Render) deployment.

## Development Setup

### 1. API Environment Variables

Create a `.env` file in `apps/api/` with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pc_solutions_dev"

# Server
PORT=3000
NODE_ENV=development

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_BUCKET_NAME=your_bucket_name_here
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Translation Service (DeepL)
DEEPL_API_KEY=your_deepl_api_key_here

# Monitoring
PROMETHEUS_SCRAPE_TOKEN=your_prometheus_token_here
```

### 2. Frontend Environment Variables

Create a `.env` file in `apps/frontend/` with the following variables:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
```

### 3. Admin Environment Variables

Create a `.env` file in `apps/admin/` with the following variables:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
```

## Production Setup (Render)

### 1. Database Setup

1. Create a PostgreSQL database in Render
2. Copy the connection string from Render dashboard
3. Set the `DATABASE_URL` environment variable in Render

### 2. API Service Environment Variables

In your Render API service, set the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string from Render | `postgresql://user:pass@host:5432/dbname` |
| `PORT` | Port for the API service | `3000` |
| `NODE_ENV` | Environment mode | `production` |
| `CLERK_SECRET_KEY` | Clerk secret key (production) | `sk_live_...` |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (production) | `pk_live_...` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key | `your_access_key` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key | `your_secret_key` |
| `R2_BUCKET_NAME` | Cloudflare R2 bucket name | `pc-solutions-assets` |
| `R2_ENDPOINT` | Cloudflare R2 endpoint URL | `https://account_id.r2.cloudflarestorage.com` |
| `STRIPE_SECRET_KEY` | Stripe secret key (production) | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `DEEPL_API_KEY` | DeepL API key for translations | `your_deepl_key` |
| `PROMETHEUS_SCRAPE_TOKEN` | Token for metrics scraping | `random_token_string` |

### 3. Frontend Service Environment Variables

In your Render frontend service, set the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (production) | `pk_live_...` |
| `VITE_API_URL` | API service URL | `https://your-api-service.onrender.com/api` |
| `VITE_NODE_ENV` | Environment mode | `production` |

### 4. Admin Service Environment Variables

In your Render admin service, set the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (production) | `pk_live_...` |
| `VITE_API_URL` | API service URL | `https://your-api-service.onrender.com/api` |
| `VITE_NODE_ENV` | Environment mode | `production` |

## Service Configuration

### Render Service Setup

1. **API Service**:
   - Build Command: `cd apps/api && pnpm install && pnpm build`
   - Start Command: `cd apps/api && pnpm start:prod`
   - Environment: Node.js

2. **Frontend Service**:
   - Build Command: `cd apps/frontend && pnpm install && pnpm build`
   - Start Command: `cd apps/frontend && pnpm preview`
   - Environment: Node.js

3. **Admin Service**:
   - Build Command: `cd apps/admin && pnpm install && pnpm build`
   - Start Command: `cd apps/admin && pnpm preview`
   - Environment: Node.js

### Domain Configuration

Set up custom domains in Render:
- **API**: `api.procrechesolutions.com`
- **Frontend**: `dash.procrechesolutions.com`
- **Admin**: `admin.procrechesolutions.com`

## Security Considerations

1. **Never commit `.env` files to version control**
2. **Use different keys for development and production**
3. **Rotate API keys regularly**
4. **Use environment-specific Clerk applications**
5. **Enable CORS restrictions in production**
6. **Use HTTPS in production**

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify `DATABASE_URL` format
   - Check database credentials
   - Ensure database is accessible from Render

2. **Clerk Authentication Issues**:
   - Verify publishable and secret keys match
   - Check domain configuration in Clerk dashboard
   - Ensure CORS settings allow your domains

3. **File Upload Issues**:
   - Verify R2 credentials and bucket permissions
   - Check R2 endpoint URL format
   - Ensure bucket exists and is accessible

4. **API Communication Issues**:
   - Verify `VITE_API_URL` points to correct API service
   - Check CORS configuration in API service
   - Ensure API service is running and accessible

### Environment Variable Validation

The application will validate required environment variables on startup. Check the logs for any missing or invalid variables.

## Getting API Keys

### Clerk
1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the publishable and secret keys from the dashboard
4. Configure allowed domains for production

### Cloudflare R2
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Create a bucket
4. Generate API tokens with R2 permissions

### Stripe
1. Go to [stripe.com](https://stripe.com)
2. Create an account and get API keys
3. Set up webhooks for subscription events
4. Copy webhook secret from webhook configuration

### DeepL
1. Go to [deepl.com](https://deepl.com)
2. Create an account
3. Get API key from account settings
4. Choose appropriate plan for translation needs