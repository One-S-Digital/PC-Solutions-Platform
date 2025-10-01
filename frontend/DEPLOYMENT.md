# Pro Crèche Solutions - Deployment Guide

## Overview

This guide covers the deployment of the Pro Crèche Solutions frontend application to various hosting platforms.

## Prerequisites

- Node.js 18+ and npm
- Environment variables configured
- Backend API deployed and accessible
- Domain name configured (app.procrechesolutions.com)

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_CLERK_KEY

# API Configuration
VITE_API_BASE_URL=https://api.procrechesolutions.com/api

# Application Configuration
VITE_APP_NAME="Pro Crèche Solutions"
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# External Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_KEY
VITE_SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID

# CDN and Assets
VITE_CDN_URL=https://cdn.procrechesolutions.com
VITE_ASSETS_URL=https://assets.procrechesolutions.com
```

### Staging Environment Variables

Create a `.env.staging` file with staging-specific values:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_STAGING_CLERK_KEY

# API Configuration
VITE_API_BASE_URL=https://staging-api.procrechesolutions.com/api

# Application Configuration
VITE_APP_NAME="Pro Crèche Solutions (Staging)"
VITE_APP_VERSION=1.0.0-staging
VITE_APP_ENV=staging
```

## Build Commands

### Development Build
```bash
npm run dev
```

### Staging Build
```bash
npm run build:staging
```

### Production Build
```bash
npm run build:production
```

### Preview Build
```bash
npm run preview:production
```

## Deployment Options

### 1. Vercel (Recommended)

Vercel is configured with `vercel.json` for optimal deployment.

#### Setup
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

#### Configuration
- Automatic deployments from main branch
- Preview deployments for pull requests
- Environment variables configured in Vercel dashboard
- Custom domain: app.procrechesolutions.com

### 2. Netlify

Netlify is configured with `_redirects` for SPA routing.

#### Setup
1. Connect GitHub repository to Netlify
2. Build command: `npm run build:production`
3. Publish directory: `dist`
4. Environment variables in Netlify dashboard

#### Configuration
- SPA routing with `_redirects`
- Custom domain configuration
- SSL certificates automatically provisioned

### 3. Apache Server

Use the provided `.htaccess` file for Apache configuration.

#### Setup
1. Upload `dist` folder to web root
2. Ensure `.htaccess` is in the root directory
3. Configure virtual host for app.procrechesolutions.com
4. Enable mod_rewrite

#### Configuration
```apache
<VirtualHost *:80>
    ServerName app.procrechesolutions.com
    DocumentRoot /var/www/app.procrechesolutions.com
    Redirect permanent / https://app.procrechesolutions.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName app.procrechesolutions.com
    DocumentRoot /var/www/app.procrechesolutions.com
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    # Include .htaccess rules
    AllowOverride All
</VirtualHost>
```

### 4. Nginx Server

Use the provided `nginx.conf` for Nginx configuration.

#### Setup
1. Copy `nginx.conf` to `/etc/nginx/sites-available/`
2. Create symlink: `ln -s /etc/nginx/sites-available/nginx.conf /etc/nginx/sites-enabled/`
3. Test configuration: `nginx -t`
4. Reload Nginx: `systemctl reload nginx`

#### Configuration
- SSL termination
- Gzip compression
- Security headers
- SPA routing with try_files

## Performance Optimization

### Build Optimization
- Code splitting with manual chunks
- Tree shaking enabled
- Minification with Terser
- Asset optimization

### Runtime Optimization
- Service Worker for caching
- Lazy loading of components
- Image optimization
- CDN integration

### Monitoring
- Bundle size analysis
- Performance metrics
- Error tracking
- User analytics

## Security Configuration

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https:;
">
```

### Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## Monitoring and Analytics

### Error Tracking
- Sentry integration for error monitoring
- Custom error boundaries
- Performance monitoring

### Analytics
- Google Analytics (if enabled)
- Custom event tracking
- User behavior analysis

## Maintenance

### Updates
1. Update dependencies: `npm update`
2. Test locally: `npm run dev`
3. Build and test: `npm run build:production`
4. Deploy to staging first
5. Deploy to production

### Backup
- Regular backups of environment variables
- Database backups (handled by backend)
- Asset backups

### Troubleshooting

#### Common Issues
1. **Build failures**: Check TypeScript errors and dependencies
2. **Routing issues**: Verify server configuration for SPA routing
3. **API errors**: Check environment variables and API endpoints
4. **Performance issues**: Analyze bundle size and optimize

#### Debug Mode
Enable debug mode by setting:
```bash
VITE_DEBUG=true
```

## Support

For deployment issues:
1. Check build logs
2. Verify environment variables
3. Test API connectivity
4. Review server configuration

## Changelog

### Version 1.0.0
- Initial production deployment
- Browser-based routing
- PWA support
- Service Worker implementation
- Security headers
- Performance optimization