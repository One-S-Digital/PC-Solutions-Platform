# Tolgee Self-Hosted Deployment on Render + Aiven PostgreSQL

Complete setup guide for deploying Tolgee on Render with Aiven PostgreSQL database.

## Prerequisites

- Render account (render.com)
- Aiven account (aiven.io)
- Domain name (optional, for custom domain)
- Git repository with the configuration files

## Step 1: Set up Aiven PostgreSQL Database

### 1.1 Create Aiven Account
1. Go to [aiven.io](https://aiven.io)
2. Sign up for a free account
3. Verify your email address

### 1.2 Create PostgreSQL Service
1. Log into Aiven Console
2. Click **"Create new service"**
3. Select **"PostgreSQL"**
4. Choose **"Startup"** plan (free tier)
5. Select region: **"us-west-2"** (Oregon - same as Render)
6. Service name: `tolgee-postgres`
7. Click **"Create service"**

### 1.3 Get Database Connection Details
1. Wait for service to be ready (2-3 minutes)
2. Go to **"Overview"** tab
3. Note down these values:
   - **Host**: `tolgee-postgres-xxxxx.aivencloud.com`
   - **Port**: `12345` (your specific port)
   - **Database name**: `defaultdb`
   - **Username**: `avnadmin`
   - **Password**: (click "Show password" and copy it)

### 1.4 Configure Database Access
1. Go to **"Security"** tab
2. Add your IP address to **"IP whitelist"** (or use `0.0.0.0/0` for Render)
3. Go to **"Databases"** tab
4. Create a new database: `tolgee`
5. Go to **"Users"** tab
6. Create a new user: `tolgee_user` with password (save this password)

## Step 2: Deploy Tolgee on Render

### 2.1 Connect Repository
1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your repository
5. Select the repository containing the Tolgee configuration

### 2.2 Configure Service
1. **Name**: `tolgee`
2. **Environment**: `Docker`
3. **Dockerfile Path**: `./infra/Dockerfile.tolgee`
4. **Docker Context**: `./infra`
5. **Plan**: `Starter` ($7/month)
6. **Region**: `Oregon (US West)`

### 2.3 Set Environment Variables
Add these environment variables in Render dashboard:

```bash
# Database Configuration (from Aiven)
DATABASE_URL=jdbc:postgresql://tolgee-postgres-xxxxx.aivencloud.com:12345/tolgee
DATABASE_USERNAME=tolgee_user
DATABASE_PASSWORD=your_tolgee_user_password

# Tolgee Configuration
TOLGEE_FRONTEND_URL=https://tolgee.onrender.com
TOLGEE_BASE_URL=https://tolgee.onrender.com
JWT_SECRET=your_jwt_secret_here

# Authentication
TOLGEE_AUTHENTICATION_ENABLED=true
TOLGEE_AUTHENTICATION_DEFAULT_ENABLED=true

# File Storage
TOLGEE_FILE_STORAGE=local
TOLGEE_FILE_STORAGE_LOCAL_PATH=/app/data

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_TOLGEE=DEBUG

# Database Settings
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false
```

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Wait for deployment to complete (5-10 minutes)
3. Note the service URL: `https://tolgee.onrender.com`

## Step 3: Initial Tolgee Setup

### 3.1 Access Tolgee
1. Go to your Tolgee URL: `https://tolgee.onrender.com`
2. You should see the Tolgee setup page

### 3.2 Create Admin Account
1. **Username**: `admin@procrechesolutions.com`
2. **Password**: Choose a strong password
3. **Organization**: `ProCreche Solutions`
4. Click **"Create account"**

### 3.3 Create Project
1. **Project name**: `ProCreche Platform`
2. **Base language**: `English (en)`
3. **Additional languages**: `French (fr)`, `German (de)`
4. Click **"Create project"**

### 3.4 Create Namespaces
1. Go to **"Project Settings"** → **"Namespaces"**
2. Create these namespaces:
   - `common`
   - `auth`
   - `dashboard`
   - `pricing`
   - `admin-common`
   - `admin-dashboard`

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Custom Domain in Render
1. Go to your Tolgee service in Render
2. Click **"Settings"** → **"Custom Domains"**
3. Add your domain: `tolgee.yourdomain.com`
4. Follow the DNS configuration instructions

### 4.2 Update Environment Variables
Update these variables in Render:
```bash
TOLGEE_FRONTEND_URL=https://tolgee.yourdomain.com
TOLGEE_BASE_URL=https://tolgee.yourdomain.com
```

### 4.3 Configure DNS
Add a CNAME record in your DNS provider:
```
tolgee.yourdomain.com → tolgee.onrender.com
```

## Step 5: Create API Keys

### 5.1 Development API Key
1. Go to **"Project Settings"** → **"API Keys"**
2. Click **"Create API Key"**
3. **Name**: `Development`
4. **Scopes**: `Read & Write`
5. Copy the API key (starts with `tgpat_`)

### 5.2 Production API Key
1. Create another API key
2. **Name**: `Production`
3. **Scopes**: `Read only`
4. Copy the API key

## Step 6: Update Your Applications

### 6.1 Frontend Environment Variables
Update `frontend/.env.local`:
```bash
NEXT_PUBLIC_TOLGEE_API_URL=https://tolgee.onrender.com
NEXT_PUBLIC_TOLGEE_API_KEY=tgpat_your_development_key_here
NEXT_PUBLIC_I18N_LANGS=en,fr,de
```

### 6.2 Admin Environment Variables
Update `admin/.env.local`:
```bash
NEXT_PUBLIC_TOLGEE_API_URL=https://tolgee.onrender.com
NEXT_PUBLIC_TOLGEE_API_KEY=tgpat_your_development_key_here
NEXT_PUBLIC_I18N_LANGS=en,fr,de
```

### 6.3 Production Environment Variables
For production deployments, use the read-only API key:
```bash
NEXT_PUBLIC_TOLGEE_API_URL=https://tolgee.yourdomain.com
NEXT_PUBLIC_TOLGEE_API_KEY=tgpat_your_production_key_here
```

## Step 7: Import Legacy Translations

### 7.1 Export Current Translations
```bash
# Export from your current setup
cp -r frontend/src/locales ./legacy-locales-frontend
cp -r admin/src/locales ./legacy-locales-admin
```

### 7.2 Import into Tolgee
1. Go to Tolgee UI → **"Import"**
2. Choose **"i18next JSON format"**
3. Import each file by language + namespace:
   - `legacy-locales-frontend/en/common.json` → en / common
   - `legacy-locales-frontend/fr/common.json` → fr / common
   - `legacy-locales-frontend/de/common.json` → de / common
   - `legacy-locales-frontend/en/auth.json` → en / auth
   - `legacy-locales-frontend/fr/auth.json` → fr / auth
   - `legacy-locales-frontend/de/auth.json` → de / auth
   - `legacy-locales-frontend/en/dashboard.json` → en / dashboard
   - `legacy-locales-frontend/fr/dashboard.json` → fr / dashboard
   - `legacy-locales-frontend/de/dashboard.json` → de / dashboard
   - `legacy-locales-admin/en/common.json` → en / admin-common
   - `legacy-locales-admin/fr/common.json` → fr / admin-common
   - `legacy-locales-admin/de/common.json` → de / admin-common
   - `legacy-locales-admin/en/dashboard.json` → en / admin-dashboard
   - `legacy-locales-admin/fr/dashboard.json` → fr / admin-dashboard
   - `legacy-locales-admin/de/dashboard.json` → de / admin-dashboard

## Step 8: Test the Setup

### 8.1 Test API Connection
```bash
curl -H "Authorization: Bearer tgpat_your_key_here" \
  "https://tolgee.onrender.com/v2/projects/translations?languages=en,fr,de"
```

### 8.2 Test Frontend Integration
1. Update your frontend to use Tolgee SDK
2. Test language switching
3. Verify translations are loading
4. Test in-context editing (in development)

## Step 9: Monitoring & Maintenance

### 9.1 Render Monitoring
- Monitor service health in Render dashboard
- Set up alerts for service downtime
- Monitor resource usage

### 9.2 Aiven Monitoring
- Monitor database performance in Aiven console
- Set up alerts for high CPU/memory usage
- Monitor connection limits

### 9.3 Backup Strategy
- Aiven provides automatic backups
- Export translations regularly from Tolgee UI
- Keep API keys secure and rotate them periodically

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection failed | Check Aiven IP whitelist includes Render IPs |
| Service won't start | Check environment variables are set correctly |
| Translations not loading | Verify API key has correct scopes |
| Custom domain not working | Check DNS configuration and SSL certificate |

### Useful Commands

```bash
# Check service logs in Render
# Go to Render dashboard → Your service → Logs

# Test database connection
psql "postgresql://tolgee_user:password@host:port/tolgee"

# Test API endpoint
curl -H "Authorization: Bearer tgpat_key" \
  "https://tolgee.onrender.com/v2/projects/translations"
```

## Cost Breakdown

- **Render Starter Plan**: $7/month
- **Aiven PostgreSQL Startup**: Free (up to 1GB storage)
- **Custom Domain**: $0 (if you have your own domain)
- **Total**: ~$7/month

## Next Steps

1. **Complete the setup** following the steps above
2. **Test thoroughly** in development
3. **Migrate your applications** to use Tolgee SDK
4. **Train translators** on the new interface
5. **Set up monitoring** and alerts

Once this setup is complete, you'll have a fully functional, self-hosted Tolgee instance with a managed PostgreSQL database, ready for your ProCrèche platform!