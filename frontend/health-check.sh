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