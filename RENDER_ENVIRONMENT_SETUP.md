# Render Environment Variables Setup

This document outlines the required environment variables for deployment to Render.

## Frontend (Web Service) Environment Variables

Set these in Render Dashboard → Environment → Environment Variables:

### Required Environment Variables

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key_here
VITE_SKIP_AUTH=false
VITE_DEVELOPMENT_MODE=false

# API Configuration
VITE_API_URL=https://your-api-service-name.onrender.com
DATABASE_URL=postgresql://postgres:password@dpg-xxx.oregon-postgres.render.com/dbname

# Application Settings
NODE_ENV=production
```

### Optional Environment Variables

```bash
# Analytics & Monitoring
VITE_APP_VERSION=1.0.0
VITE_BUILD_DATE=2024-01-01

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

## API (Backend Service) Environment Variables

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:password@dpg-xxx.oregon-postgres.render.com/dbname

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Application
NODE_ENV=production
PORT=10000

# Security
JWT_SECRET=your_secure_jwt_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key

# Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Email Service (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```

### Optional Environment Variables

```bash
# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
```

## Admin Panel Environment Variables

### Required Environment Variables

```bash
# Real Clerk Authentication (Required)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key_here
VITE_SKIP_AUTH=false

# API Configuration
VITE_API_URL=https://your-api-service-name.onrender.com

# Production Mode
NODE_ENV=production
```

## Setup Instructions

### 1. Clerk Dashboard Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or use existing
3. Copy the Publishable Key and Secret Key
4. Set up webhook endpoints if needed

### 2. Render Database Setup

1. Create a PostgreSQL database service in Render
2. Copy the connection string
3. Update DATABASE_URL in all services

### 3. File Storage Setup (S3)

1.Create an S3 bucket in AWS
2. Generate access keys with S3 permissions
3. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

### 4. Domain Configuration

1. Set custom domain in Render
2. Update API URLs to use the domain
3. Configure CORS settings

## Development vs Production

In development mode (`NODE_ENV=development`):
- Development bypasses activated for easier testing
- Some error checking relaxed
- Mock data can be used

In production mode (`NODE_ENV=production`):
- Strict authentication required
- All security measures active
- Real Clerk authentication enforced

## Security Notes

1. **Never commit secrets to version control**
2. **Use different keys for development/production**
3. **Regular rotate your Clerk keys**
4. **Monitor webhook endpoints for security**

## Troubleshooting

### Common Issues

1. **Clerk authentication fails**
   - Check publishable key format
   - Verify domain configuration in Clerk

2. **Database connection errors**
   - Verify DATABASE_URL format
   - Check database service status

3. **File upload fails**
   - Verify AWS credentials
   - Check S3 bucket permissions

### Environment Variable Validation

The application will validate required environment variables on startup and provide clear error messages for missing or invalid configuration.
