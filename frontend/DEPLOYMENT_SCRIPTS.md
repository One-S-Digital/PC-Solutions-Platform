# Pro Crèche Solutions - Deployment Scripts

## 🚀 Automated Deployment Scripts

### 1. Production Build Script

```bash
#!/bin/bash
# build-production.sh

set -e

echo "🚀 Starting production build..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.vite/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Type check
echo "🔍 Running type check..."
npm run type-check

# Lint check
echo "🔍 Running lint check..."
npm run lint

# Build for production
echo "🏗️ Building for production..."
npm run build:production

# Verify build
echo "✅ Verifying build..."
if [ -d "dist" ]; then
    echo "✅ Build successful - dist/ directory created"
    ls -la dist/
else
    echo "❌ Build failed - dist/ directory not found"
    exit 1
fi

# Check bundle sizes
echo "📊 Bundle size analysis..."
du -sh dist/assets/*.js | sort -hr

echo "🎉 Production build completed successfully!"
```

### 2. Vercel Deployment Script

```bash
#!/bin/bash
# deploy-vercel.sh

set -e

echo "🚀 Deploying to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Login to Vercel (if not already logged in)
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

# Deploy to production
echo "🚀 Deploying to production..."
vercel --prod

echo "✅ Deployment to Vercel completed!"
echo "🌐 Your app is now live at: https://app.procrechesolutions.com"
```

### 3. Netlify Deployment Script

```bash
#!/bin/bash
# deploy-netlify.sh

set -e

echo "🚀 Deploying to Netlify..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Login to Netlify (if not already logged in)
echo "🔐 Checking Netlify authentication..."
if ! netlify status &> /dev/null; then
    echo "🔐 Please login to Netlify..."
    netlify login
fi

# Deploy to production
echo "🚀 Deploying to production..."
netlify deploy --prod --dir=dist

echo "✅ Deployment to Netlify completed!"
echo "🌐 Your app is now live at: https://app.procrechesolutions.com"
```

### 4. Docker Deployment Script

```bash
#!/bin/bash
# deploy-docker.sh

set -e

echo "🚀 Building Docker image..."

# Build production build
echo "🏗️ Building production build..."
npm run build:production

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t procreche-frontend:latest .

# Tag for registry
echo "🏷️ Tagging image..."
docker tag procreche-frontend:latest your-registry/procreche-frontend:latest

# Push to registry
echo "📤 Pushing to registry..."
docker push your-registry/procreche-frontend:latest

echo "✅ Docker deployment completed!"
```

### 5. Health Check Script

```bash
#!/bin/bash
# health-check.sh

set -e

echo "🔍 Running health checks..."

# Check if the app is responding
echo "🌐 Checking app response..."
response=$(curl -s -o /dev/null -w "%{http_code}" https://app.procrechesolutions.com)

if [ "$response" = "200" ]; then
    echo "✅ App is responding (HTTP 200)"
else
    echo "❌ App is not responding (HTTP $response)"
    exit 1
fi

# Check SSL certificate
echo "🔒 Checking SSL certificate..."
ssl_check=$(echo | openssl s_client -servername app.procrechesolutions.com -connect app.procrechesolutions.com:443 2>/dev/null | openssl x509 -noout -dates)

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate is valid"
    echo "$ssl_check"
else
    echo "❌ SSL certificate check failed"
    exit 1
fi

# Check API connectivity
echo "🔌 Checking API connectivity..."
api_response=$(curl -s -o /dev/null -w "%{http_code}" https://api.procrechesolutions.com/api/health)

if [ "$api_response" = "200" ]; then
    echo "✅ API is responding (HTTP 200)"
else
    echo "❌ API is not responding (HTTP $api_response)"
    exit 1
fi

# Check CDN
echo "🌍 Checking CDN..."
cdn_response=$(curl -s -o /dev/null -w "%{http_code}" https://cdn.procrechesolutions.com)

if [ "$cdn_response" = "200" ]; then
    echo "✅ CDN is responding (HTTP 200)"
else
    echo "❌ CDN is not responding (HTTP $cdn_response)"
    exit 1
fi

echo "🎉 All health checks passed!"
```

### 6. Rollback Script

```bash
#!/bin/bash
# rollback.sh

set -e

echo "🔄 Starting rollback procedure..."

# Get current deployment info
echo "📊 Getting current deployment info..."
current_deployment=$(vercel ls --scope=your-team | head -2 | tail -1 | awk '{print $1}')

echo "Current deployment: $current_deployment"

# Get previous deployment
echo "📊 Getting previous deployment..."
previous_deployment=$(vercel ls --scope=your-team | head -3 | tail -1 | awk '{print $1}')

echo "Previous deployment: $previous_deployment"

# Confirm rollback
read -p "Are you sure you want to rollback to $previous_deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Rollback cancelled"
    exit 1
fi

# Execute rollback
echo "🔄 Executing rollback..."
vercel promote $previous_deployment --scope=your-team

echo "✅ Rollback completed!"
echo "🌐 App rolled back to: $previous_deployment"
```

### 7. Environment Setup Script

```bash
#!/bin/bash
# setup-environment.sh

set -e

echo "🔧 Setting up production environment..."

# Check if required tools are installed
echo "🔍 Checking required tools..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi

echo "✅ All required tools are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Set up environment variables
echo "🔐 Setting up environment variables..."
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found"
    echo "Please create .env.production with the following variables:"
    echo "VITE_CLERK_PUBLISHABLE_KEY=pk_live_..."
    echo "VITE_API_BASE_URL=https://api.procrechesolutions.com/api"
    echo "VITE_APP_ENV=production"
    exit 1
fi

echo "✅ Environment setup completed!"
```

### 8. Performance Test Script

```bash
#!/bin/bash
# performance-test.sh

set -e

echo "📊 Running performance tests..."

# Install Lighthouse CLI if not present
if ! command -v lighthouse &> /dev/null; then
    echo "📦 Installing Lighthouse CLI..."
    npm install -g lighthouse
fi

# Run Lighthouse audit
echo "🔍 Running Lighthouse audit..."
lighthouse https://app.procrechesolutions.com --output=html --output-path=./lighthouse-report.html --chrome-flags="--headless"

# Check performance score
echo "📊 Performance score:"
lighthouse https://app.procrechesolutions.com --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless" --quiet

# Extract scores
performance_score=$(cat lighthouse-report.json | jq '.categories.performance.score * 100')
accessibility_score=$(cat lighthouse-report.json | jq '.categories.accessibility.score * 100')
best_practices_score=$(cat lighthouse-report.json | jq '.categories."best-practices".score * 100')
seo_score=$(cat lighthouse-report.json | jq '.categories.seo.score * 100')

echo "📊 Performance Results:"
echo "Performance: $performance_score"
echo "Accessibility: $accessibility_score"
echo "Best Practices: $best_practices_score"
echo "SEO: $seo_score"

# Check if scores meet requirements
if (( $(echo "$performance_score >= 90" | bc -l) )); then
    echo "✅ Performance score meets requirements"
else
    echo "❌ Performance score below requirements"
    exit 1
fi

echo "🎉 Performance tests completed!"
```

## 🛠️ Usage Instructions

### 1. Make Scripts Executable
```bash
chmod +x *.sh
```

### 2. Run Production Build
```bash
./build-production.sh
```

### 3. Deploy to Vercel
```bash
./deploy-vercel.sh
```

### 4. Deploy to Netlify
```bash
./deploy-netlify.sh
```

### 5. Run Health Checks
```bash
./health-check.sh
```

### 6. Run Performance Tests
```bash
./performance-test.sh
```

### 7. Setup Environment
```bash
./setup-environment.sh
```

## 🔧 Customization

### Environment Variables
Update the scripts with your specific:
- Domain names
- API endpoints
- Registry URLs
- Team/organization names

### Hosting Provider
Choose the appropriate deployment script for your hosting provider:
- Vercel (recommended)
- Netlify
- Docker
- Custom server

### Monitoring
Integrate with your monitoring tools:
- Sentry for error tracking
- DataDog for performance monitoring
- PagerDuty for alerting

## 📋 Best Practices

1. **Always test locally first**
2. **Use staging environment for testing**
3. **Monitor deployment logs**
4. **Have rollback plan ready**
5. **Test health checks after deployment**
6. **Monitor performance metrics**
7. **Keep deployment scripts updated**

## 🚨 Emergency Procedures

### Quick Rollback
```bash
./rollback.sh
```

### Health Check
```bash
./health-check.sh
```

### Performance Check
```bash
./performance-test.sh
```

## 📞 Support

For deployment issues:
1. Check deployment logs
2. Verify environment variables
3. Test health checks
4. Contact support team

---

## 🎯 Ready for Deployment!

These scripts provide a complete deployment automation solution for the Pro Crèche Solutions frontend. Choose the appropriate script for your hosting provider and follow the usage instructions.