# Render Deployment Guide

This guide provides step-by-step instructions for deploying the PC Solutions Platform to Render.

## Prerequisites

1. Render account (https://render.com)
2. Clerk account with production keys
3. Cloudflare R2 account for file storage
4. Stripe account for payments
5. PostgreSQL database (can be provisioned through Render)

## Service Architecture

The platform consists of 4 services on Render:

1. **API Service** - NestJS backend
2. **Frontend Service** - React main application
3. **Admin Service** - React admin dashboard
4. **PostgreSQL Database** - Managed database

## 1. Database Setup

### Create PostgreSQL Database

1. Go to Render Dashboard → New → PostgreSQL
2. Configure:
   - **Name**: `pc-solutions-db`
   - **Database**: `pc_solutions_prod`
   - **User**: `pc_solutions_user`
   - **Region**: Choose closest to your users
3. Note the **External Database URL** - you'll need this for the API service

## 2. API Service Deployment

### Create Web Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `pc-solutions-api`
   - **Environment**: `Node`
   - **Build Command**: `cd apps/api && pnpm install && pnpm build`
   - **Start Command**: `cd apps/api && pnpm start:prod`
   - **Root Directory**: `/` (monorepo root)

### Environment Variables

Set the following environment variables in Render:

```bash
# Database
DATABASE_URL=<your_postgresql_external_url>

# Server
NODE_ENV=production
PORT=10000

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_your_production_secret_key
CLERK_PUBLISHABLE_KEY=pk_live_your_production_publishable_key

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=pc-solutions-prod
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://assets.procrechesolutions.com

# Stripe
STRIPE_SECRET_KEY=sk_live_your_production_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Translation Service
DEEPL_API_KEY=your_deepl_api_key

# Monitoring
PROMETHEUS_SCRAPE_TOKEN=your_prometheus_token

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Custom Domain

1. Go to your API service settings
2. Add custom domain: `api.procrechesolutions.com`
3. Update DNS records as instructed by Render

## 3. Frontend Service Deployment

### Create Static Site

1. Go to Render Dashboard → New → Static Site
2. Connect your GitHub repository
3. Configure:
   - **Name**: `pc-solutions-frontend`
   - **Build Command**: `cd apps/frontend && pnpm install && pnpm build`
   - **Publish Directory**: `apps/frontend/dist`
   - **Root Directory**: `/` (monorepo root)

### Environment Variables

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_publishable_key
VITE_API_URL=https://api.procrechesolutions.com
VITE_NODE_ENV=production
```

### Custom Domain

1. Add custom domain: `dash.procrechesolutions.com`
2. Update DNS records

## 4. Admin Service Deployment

### Create Static Site

1. Go to Render Dashboard → New → Static Site
2. Connect your GitHub repository
3. Configure:
   - **Name**: `pc-solutions-admin`
   - **Build Command**: `cd apps/admin && pnpm install && pnpm build`
   - **Publish Directory**: `apps/admin/dist`
   - **Root Directory**: `/` (monorepo root)

### Environment Variables

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_publishable_key
VITE_API_URL=https://api.procrechesolutions.com
VITE_NODE_ENV=production
```

### Custom Domain

1. Add custom domain: `admin.procrechesolutions.com`
2. Update DNS records

## 5. Database Migration

After deploying the API service:

1. Go to your API service in Render Dashboard
2. Open the Shell/Console
3. Run the following commands:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

## 6. Clerk Configuration

### Update Clerk Settings

1. Go to Clerk Dashboard → Your Application → Settings
2. Update **Allowed Origins**:
   - `https://dash.procrechesolutions.com`
   - `https://admin.procrechesolutions.com`
   - `https://api.procrechesolutions.com`
3. Update **Redirect URLs**:
   - `https://dash.procrechesolutions.com/dashboard`
   - `https://admin.procrechesolutions.com/admin/dashboard`

### User Metadata

Configure user metadata fields in Clerk:
- `role` (string) - User role (SUPER_ADMIN, ADMIN, FOUNDATION, etc.)
- `orgId` (string) - Organization ID for organization members

## 7. Cloudflare R2 Setup

### Create Bucket

1. Go to Cloudflare Dashboard → R2 Object Storage
2. Create bucket: `pc-solutions-prod`
3. Configure CORS for your domains
4. Set up custom domain: `assets.procrechesolutions.com`

### Generate API Token

1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create token with R2 permissions
3. Use the token credentials in your environment variables

## 8. Stripe Configuration

### Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://api.procrechesolutions.com/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret to your environment variables

## 9. DNS Configuration

Configure the following DNS records:

```
# Main website
procrechesolutions.com → A record to Render IP

# API service
api.procrechesolutions.com → CNAME to your-api-service.onrender.com

# Frontend service
dash.procrechesolutions.com → CNAME to your-frontend-service.onrender.com

# Admin service
admin.procrechesolutions.com → CNAME to your-admin-service.onrender.com

# Assets
assets.procrechesolutions.com → CNAME to your-r2-bucket.r2.cloudflarestorage.com
```

## 10. SSL Certificates

Render automatically provides SSL certificates for custom domains. Ensure:
1. DNS records are properly configured
2. Wait for SSL certificate provisioning (can take up to 24 hours)
3. Verify HTTPS is working on all domains

## 11. Monitoring Setup

### Health Checks

1. Set up health check endpoints in your API service
2. Configure monitoring alerts in Render
3. Set up uptime monitoring for all services

### Logs

1. Use Render's built-in logging
2. Set up log aggregation if needed
3. Monitor error rates and performance

## 12. Backup Strategy

### Database Backups

1. Render provides automatic PostgreSQL backups
2. Configure backup retention period
3. Test restore procedures

### File Storage

1. R2 provides built-in redundancy
2. Consider cross-region replication for critical assets
3. Implement backup verification

## 13. Security Considerations

### Environment Variables

1. Never commit `.env` files to version control
2. Use different keys for development and production
3. Rotate secrets regularly
4. Monitor for exposed credentials

### API Security

1. Enable rate limiting
2. Configure CORS properly
3. Use HTTPS for all communications
4. Implement proper authentication checks

### Database Security

1. Use connection pooling
2. Enable SSL connections
3. Restrict database access to API service only
4. Monitor for suspicious activity

## 14. Performance Optimization

### API Service

1. Enable auto-scaling in Render
2. Configure appropriate instance sizes
3. Monitor memory and CPU usage
4. Optimize database queries

### Frontend Services

1. Enable CDN caching
2. Optimize bundle sizes
3. Implement lazy loading
4. Use compression

## 15. Troubleshooting

### Common Issues

1. **Build Failures**: Check build logs, ensure all dependencies are installed
2. **Database Connection**: Verify DATABASE_URL format and credentials
3. **Authentication Issues**: Check Clerk keys and allowed origins
4. **File Upload Issues**: Verify R2 credentials and bucket permissions
5. **CORS Errors**: Ensure frontend URLs are in API CORS configuration

### Debug Commands

```bash
# Check environment variables
echo $DATABASE_URL

# Test database connection
npx prisma db pull

# Verify Clerk configuration
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" https://api.clerk.com/v1/users

# Test R2 connection
aws s3 ls --endpoint-url $R2_ENDPOINT
```

## 16. Maintenance

### Regular Tasks

1. Monitor service health and performance
2. Update dependencies regularly
3. Review and rotate secrets
4. Monitor costs and usage
5. Backup verification

### Updates

1. Test updates in staging environment first
2. Use blue-green deployment for zero downtime
3. Monitor rollback procedures
4. Communicate changes to users

This deployment guide ensures a robust, secure, and scalable production environment for the PC Solutions Platform.