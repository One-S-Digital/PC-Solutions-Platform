#!/bin/bash

# Comprehensive Role System Testing Script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_PATH="$API_DIR/prisma/schema.prisma"

cd "$API_DIR"

echo "🧪 Role System Comprehensive Testing"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0

# Function to run a test phase
run_test() {
    local name=$1
    local command=$2
    
    echo -e "\n${BLUE}🔧 Testing: ${name}${NC}"
    echo "----------------------------------------"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ ${name} - PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ ${name} - FAILED${NC}"
        ((FAILED++))
    fi
}

# 1. Environment Check
run_test "Environment Setup" "[ -f .env.test ] && echo 'Test environment configured'"

# 2. Database Connection
run_test "Database Connection" "npx prisma db execute --schema $SCHEMA_PATH --sql 'SELECT 1' > /dev/null 2>&1"

# 3. Schema Validation
run_test "Schema Validation" "npx prisma validate"

# 4. Unit Tests
run_test "Unit Tests" "npm run test:unit"

# 5. Integration Tests
echo -e "\n${YELLOW}⚠️  Integration tests require valid Clerk tokens${NC}"
echo "Set these environment variables for full testing:"
echo "  - TEST_SUPER_ADMIN_TOKEN"
echo "  - TEST_ADMIN_TOKEN"
echo "  - TEST_PARENT_TOKEN"
run_test "Integration Tests" "npm run test:integration"

# 6. Manual Test Scenarios
echo -e "\n${BLUE}📋 Manual Test Checklist${NC}"
echo "----------------------------------------"
cat << EOF
1. Authentication Flow:
   [ ] Login with Clerk
   [ ] Token includes user ID
   [ ] Invalid tokens rejected

2. Role Loading:
   [ ] Role loaded from database
   [ ] New users get PARENT role
   [ ] Context attached to requests

3. Authorization:
   [ ] Super Admin can access all endpoints
   [ ] Admin cannot promote to Super Admin
   [ ] Role-specific endpoints protected

4. Role Changes:
   [ ] Admin can change roles
   [ ] Audit trail created
   [ ] Outbox entry created
   [ ] Clerk metadata updated

5. Webhooks:
   [ ] User creation handled
   [ ] Role sync works
   [ ] Signature validation
   [ ] Idempotency works

6. Sync Mechanisms:
   [ ] Outbox worker processes jobs
   [ ] Retry on failure
   [ ] Reconciliation runs hourly
   [ ] Drift detection works
EOF

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "----------------------------------------"
echo -e "Tests Passed: ${GREEN}${PASSED}${NC}"
echo -e "Tests Failed: ${RED}${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All automated tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi