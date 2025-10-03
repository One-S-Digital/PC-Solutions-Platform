#!/bin/bash

# PC Solutions Platform - Development Startup Script
# This script starts the frontend and admin applications for development

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[DEV]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if required services are running
check_services() {
    print_header "Checking if required services are running..."
    
    # Check API
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "API is running ✓"
    else
        print_warning "API is not running. Please start with: docker compose up -d"
        echo "Or run the setup script first: ./scripts/setup-local-dev.sh"
        exit 1
    fi
    
    # Check Database
    if docker compose ps postgres | grep -q "Up"; then
        print_status "Database is running ✓"
    else
        print_warning "Database is not running. Please start with: docker compose up -d postgres"
        exit 1
    fi
}

# Start frontend and admin applications
start_applications() {
    print_header "Starting development applications..."
    
    # Function to start frontend
    start_frontend() {
        print_status "Starting Frontend (http://localhost:5173)..."
        cd frontend
        pnpm run dev &
        FRONTEND_PID=$!
        cd ..
        echo $FRONTEND_PID > .frontend.pid
    }
    
    # Function to start admin
    start_admin() {
        print_status "Starting Admin Dashboard (http://localhost:5174)..."
        cd admin  
        pnpm run dev &
        ADMIN_PID=$!
        cd ..
        echo $ADMIN_PID > .admin.pid
    }
    
    # Check command line arguments
    case "${1:-all}" in
        "frontend")
            start_frontend
            ;;
        "admin")
            start_admin
            ;;
        "all")
            start_frontend
            sleep 2
            start_admin
            ;;
        *)
            echo "Usage: $0 [frontend|admin|all]"
            echo ""
            echo "Options:"
            echo "  frontend  Start only the frontend application"
            echo "  admin     Start only the admin dashboard"
            echo "  all       Start both applications (default)"
            exit 1
            ;;
    esac
}

# Setup cleanup on exit
cleanup() {
    print_status "Shutting down development servers..."
    
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
    
    if [ -f .admin.pid ]; then
        kill $(cat .admin.pid) 2>/dev/null || true
        rm .admin.pid
    fi
    
    print_status "Development servers stopped ✓"
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Main function
main() {
    echo "🚀 PC Solutions Platform - Development Startup"
    echo "=============================================="
    
    check_services
    start_applications
    
    print_header "Development servers started! 🎉"
    echo ""
    echo "Available services:"
    echo "• Frontend: http://localhost:5173"
    echo "• Admin: http://localhost:5174"
    echo "• API: http://localhost:3000"
    echo "• Mailpit: http://localhost:8025"
    echo ""
    echo "Press Ctrl+C to stop all development servers"
    echo ""
    
    # Wait for user interrupt
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"
