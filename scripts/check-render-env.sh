#!/bin/bash

# Script to check Sentry environment variables in Render services
# Requires RENDER_API_KEY environment variable to be set

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Render Environment Variables Checker ===${NC}\n"

# Check if RENDER_API_KEY is set
if [ -z "$RENDER_API_KEY" ]; then
    echo -e "${RED}ERROR: RENDER_API_KEY environment variable is not set${NC}"
    echo ""
    echo "To use this script:"
    echo "1. Go to Render Dashboard → Account Settings → API Keys"
    echo "2. Create a new API key"
    echo "3. Export it: export RENDER_API_KEY='your-api-key'"
    echo "4. Run this script again"
    exit 1
fi

# Render API base URL
API_BASE="https://api.render.com/v1"

# Function to check service env vars
check_service() {
    local service_name=$1
    local expected_vars=$2
    
    echo -e "${BLUE}Checking service: ${service_name}${NC}"
    
    # Get all services
    services_response=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "${API_BASE}/services?name=${service_name}")
    
    # Check if we got an error
    if echo "$services_response" | grep -q "error\|message"; then
        echo -e "${RED}Error accessing Render API:${NC}"
        echo "$services_response" | jq -r '.message // .error // .' 2>/dev/null || echo "$services_response"
        return 1
    fi
    
    # Get service ID
    service_id=$(echo "$services_response" | jq -r '.[0].service.id // empty' 2>/dev/null)
    
    if [ -z "$service_id" ]; then
        echo -e "${RED}Service not found: ${service_name}${NC}\n"
        return 1
    fi
    
    echo -e "Service ID: ${service_id}"
    
    # Get environment variables for this service
    env_vars=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "${API_BASE}/services/${service_id}/env-vars")
    
    # Check each expected variable
    for var in $expected_vars; do
        if echo "$env_vars" | jq -e ".[] | select(.key == \"$var\")" > /dev/null 2>&1; then
            value=$(echo "$env_vars" | jq -r ".[] | select(.key == \"$var\") | .value // \"[SECRET]\"")
            if [ "$value" = "null" ] || [ -z "$value" ]; then
                echo -e "  ${RED}✗${NC} ${var}: ${RED}NOT SET${NC}"
            else
                # Mask the value for security
                masked_value="${value:0:20}..."
                echo -e "  ${GREEN}✓${NC} ${var}: ${GREEN}SET${NC} (${masked_value})"
            fi
        else
            echo -e "  ${RED}✗${NC} ${var}: ${RED}MISSING${NC}"
        fi
    done
    
    echo ""
}

echo "Checking Sentry configuration across all services..."
echo ""

# Check Frontend service
check_service "pc-solutions-frontend" "VITE_SENTRY_DSN VITE_SENTRY_RELEASE"

# Check Admin service  
check_service "pc-solutions-admin" "VITE_SENTRY_DSN VITE_SENTRY_RELEASE"

# Check API service
check_service "pc-solutions-v2" "SENTRY_DSN SENTRY_RELEASE"

echo -e "${BLUE}=== Summary ===${NC}"
echo ""
echo "If any variables show as MISSING or NOT SET, you need to:"
echo "1. Go to Render Dashboard"
echo "2. Navigate to the service"
echo "3. Go to Environment tab"
echo "4. Add the missing Sentry environment variables"
echo ""
echo "Required DSN variables:"
echo "  - Frontend: VITE_SENTRY_DSN"
echo "  - Admin:    VITE_SENTRY_DSN"
echo "  - API:      SENTRY_DSN"
echo ""
echo "Optional variables:"
echo "  - VITE_SENTRY_RELEASE / SENTRY_RELEASE"
echo "  - SENTRY_ORG"
echo "  - SENTRY_PROJECT"
echo "  - SENTRY_AUTH_TOKEN"
