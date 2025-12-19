#!/bin/bash

# PC Solutions Platform - Service Test Script
# This script tests if all services are running correctly

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test function
test_service() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    
    print_header "Testing $name ($url)"
    
    if response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null); then
        if [ "$response" = "$expected_code" ]; then
            print_status "$name is responding correctly (HTTP $response)"
            return 0
        else
            print_error "$name returned HTTP $response, expected $expected_code"
            return 1
        fi
    else
        print_error "$name is not accessible"
        return 1
    fi
}

# Test multiple URLs for API
test_api() {
    print_header "Testing API endpoints"
    
    # Test health endpoint
    test_service "API Health" "http://localhost:3000/api/health" "200"
    api_health=$?
    
    # Test main API endpoint
    test_service "API Root" "http://localhost:3000/api" "200"
    api_root=$?
    
    # Test Swagger docs
    test_service "API Documentation" "http://localhost:3000/api/docs" "200"
    api_docs=$?
    
    if [ $api_health -eq 0 ] && [ $api_root -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Main test function
main() {
    echo "🧪 PC Solutions Platform - Service Test"
    echo "======================================"
    echo ""
    
    local total_tests=0
    local passed_tests=0
    
    # Test frontend
    print_header "Testing Frontend Application"
    if test_service "Frontend" "http://localhost:5173" "200"; then
        passed_tests=$((passed_tests + 1))
    fi
    total_tests=$((total_tests + 1))
    
    # Test admin
    print_header "Testing Admin Dashboard"
    if test_service "Admin Dashboard" "http://localhost:5174" "200"; then
        passed_tests=$((passed_tests + 1))
    fi
    total_tests=$((total_tests + 1))
    
    # Test API
    if test_api; then
        passed_tests=$((passed_tests + 1))
    fi
    total_tests=$((total_tests + 1))
    
    # Test Mailpit
    print_header "Testing Mailpit Email Service"
    if test_service "Mailpit" "http://localhost:8025/api/v1/messages" "200"; then
        passed_tests=$((passed_tests + 1))
    fi
    total_tests=$((total_tests + 1))
    
    # Test Database (indirect through API)
    print_header "Testing Database Connection"
    if curl -s "http://localhost:3000/api/health" | grep -q "healthy" 2>/dev/null; then
        print_status "Database connection is working (via API health check)"
        passed_tests=$((passed_tests + 1))
    else
        print_error "Database connection test failed"
    fi
    total_tests=$((total_tests + 1))
    
    echo ""
    echo "📊 Test Results"
    echo "================"
    echo "Tests passed: $passed_tests/$total_tests"
    
    if [ $passed_tests -eq $total_tests ]; then
        echo ""
        print_status "All services are running correctly! 🎉"
        echo ""
        echo "Access your applications:"
        echo "• Frontend: http://localhost:5173"
        echo "• Admin: http://localhost:5174"
        echo "• API: http://localhost:3000"
        echo "• Mailpit: http://localhost:8025"
        return 0
    else
        echo ""
        print_error "Some services are not running correctly! ❌"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check if Docker services are running: docker compose ps"
        echo "2. Start services: docker compose up -d"
        echo "3. Run setup script: ./scripts/setup-local-dev.sh"
        echo "4. Start development apps: ./scripts/start-dev.sh"
        return 1
    fi
}

# Run main function
main "$@"
