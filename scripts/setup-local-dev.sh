#!/bin/bash

# PC Solutions Platform - Local Development Setup Script
# This script automates the setup of the local development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if required software is installed
check_requirements() {
    print_header "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 18.0.16"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="18.0.16"
    if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is older than required version $REQUIRED_NODE_VERSION"
        exit 1
    fi
    
    print_status "Node.js version: $NODE_VERSION ✓"
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm >= 9.0.0"
        exit 1
    fi
    
    PNPM_VERSION=$(pnpm --version)
    REQUIRED_PNPM_VERSION="9.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_PNPM_VERSION" "$PNPM_VERSION" | sort -V | head -n1)" != "$REQUIRED_PNPM_VERSION" ]; then
        print_error "pnpm version $PNPM_VERSION is older than required version $REQUIRED_PNPM_VERSION"
        exit 1
    fi
    
    print_status "pnpm version: $PNPM_VERSION ✓"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker >= 24.0.0"
        exit 1
    fi
    
    print_status "Docker is installed ✓"
    
    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose >= 2.0.0"
        exit 1
    fi
    
    print_status "Docker Compose is installed ✓"
}

# Create example environment files if they don't exist
setup_environment_files() {
    print_header "Setting up environment files..."
    
    # API .env
    if [ ! -f "api/.env" ]; then
        print_status "Creating api/.env.example template..."
        cp api/.env.example api/.env 2>/dev/null || cat > api/.env << 'EOF'
# Database
DATABASE_URL="postgresql://pc_solutions_user:pc_solutions_password@localhost:5432/pc_solutions_dev"

# Server
PORT=3000
NODE_ENV=development

# Clerk Authentication (REQUIRED - Replace with your actual keys)
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Cloudflare R2 Storage (REQUIRED - Replace with your actual credentials)
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_BUCKET_NAME=your_bucket_name_here
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# Stripe (REQUIRED - Replace with your actual keys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Email Configuration (Uses Mailpit in development)
MAIL_PROVIDER=SMTP
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="PC Solutions <no-reply@notify.pc-solutions.ch>"

# Antivirus (Uses ClamAV in Docker)
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
EOF
        print_warning "Created api/.env - Please update with your actual API keys!"
    else
        print_status "api/.env already exists ✓"
    fi
    
    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        print_status "Creating frontend/.env template..."
        cat > frontend/.env << 'EOF'
# Clerk Authentication (REQUIRED - Replace with your actual keys)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
EOF
        print_warning "Created frontend/.env - Please update with your actual Clerk keys!"
    else
        print_status "frontend/.env already exists ✓"
    fi
    
    # Admin .env
    if [ ! -f "admin/.env" ]; then
        print_status "Creating admin/.env template..."
        cat > admin/.env << 'EOF'
# Clerk Authentication (REQUIRED - Replace with your actual keys)
VITE_CLERK_PUBLISHABLE_KEY=pk_mock_clerk_publishable_key_here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
EOF
        print_warning "Created admin/.env - Please update with your actual Clerk keys!"
    else
        print_status "admin/.env already exists ✓"
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing dependencies..."
    
    print_status "Installing root dependencies..."
    pnpm install
    
    print_status "Installing individual service dependencies..."
    # pnpm will handle workspace dependencies automatically
}

# Start Docker services
start_docker_services() {
    print_header "Starting Docker services..."
    
    print_status "Starting PostgreSQL, ClamAV, and Mailpit..."
    docker compose up -d postgres clamav mailpit
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if postgres is ready
    print_status "Checking PostgreSQL connection..."
    until docker compose exec -T postgres pg_isready -U pc_solutions_user -d pc_solutions_dev; do
        print_status "Waiting for PostgreSQL to be ready..."
        sleep 2
    done
    
    print_status "PostgreSQL is ready ✓"
}

# Setup database
setup_database() {
    print_header "Setting up database..."
    
    print_status "Generating Prisma client..."
    cd api
    pnpm run prisma:generate
    
    print_status "Running database migrations..."
    pnpm run prisma:migrate
    
    cd ..
    print_status "Database setup complete ✓"
}

# Start applications
start_applications() {
    print_header "Starting applications..."
    
    print_status "Building API service..."
    cd api
    docker compose build api
    
    print_status "Starting API service..."
    docker compose up -d api
    
    print_status "Waiting for API to be ready..."
    sleep 15
    
    # Check API health
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_status "API is ready ✓"
    else
        print_error "API health check failed. Check logs: docker compose logs api"
    fi
    
    cd ..
}

# Main setup function
main() {
    echo "🚀 PC Solutions Platform - Local Development Setup"
    echo "=================================================="
    
    # Parse command line arguments
    SKIP_ENV_SETUP=false
    SKIP_DOCKER=false
    SKIP_DB_SETUP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-env)
                SKIP_ENV_SETUP=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-db)
                SKIP_DB_SETUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-env     Skip environment file setup"
                echo "  --skip-docker  Skip Docker services startup"
                echo "  --skip-db      Skip database setup"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option $1"
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_requirements
    
    if [ "$SKIP_ENV_SETUP" = false ]; then
        setup_environment_files
    fi
    
    install_dependencies
    
    if [ "$SKIP_DOCKER" = false ]; then
        start_docker_services
    fi
    
    if [ "$SKIP_DB_SETUP" = false ]; then
        setup_database
    fi
    
    start_applications
    
    print_header "Setup Complete! 🎉"
    echo ""
    echo "Your services are now running:"
    echo "• API: http://localhost:3000"
    echo "• Frontend: http://localhost:5173"
    echo "• Admin: http://localhost:5174" 
    echo "• Mailpit: http://localhost:8025"
    echo ""
    echo "Next steps:"
    echo "1. Update environment files with your actual API keys"
    echo "2. Start frontend services: cd frontend && pnpm run dev"
    echo "3. Start admin dashboard: cd admin && pnpm run dev"
    echo ""
    echo "For more information, see LOCAL_DEPLOYMENT_GUIDE.md"
}

# Run main function
main "$@"
