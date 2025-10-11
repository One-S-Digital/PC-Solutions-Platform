#!/bin/bash
set -e

echo "📦 Installing Architecture Improvement Dependencies"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Dependencies
echo "${BLUE}Installing API dependencies...${NC}"
cd api

echo "  - Cache & Redis..."
npm install cache-manager@5.2.0 cache-manager-redis-store@3.0.0

echo "  - WebSockets..."
npm install @nestjs/websockets@10.0.0 @nestjs/platform-socket.io@10.0.0 socket.io@4.6.0

echo "  - Event Emitter..."
npm install @nestjs/event-emitter@2.0.0

echo "  - Authorization (CASL)..."
npm install @casl/ability@6.5.0 @casl/prisma@1.4.0

echo "  - Logging (Pino)..."
npm install nestjs-pino@3.5.0 pino@8.16.0 pino-http@8.5.0 pino-pretty@10.2.0

echo "  - Metrics (Prometheus)..."
npm install prom-client@15.0.0

echo "  - Health Checks..."
npm install @nestjs/terminus@10.0.0

echo "${GREEN}✅ API dependencies installed${NC}"
cd ..

# Admin Dependencies
echo ""
echo "${BLUE}Installing Admin dependencies...${NC}"
cd admin

echo "  - WebSocket Client..."
npm install socket.io-client@4.6.0

echo "  - State Management..."
npm install zustand@4.4.0

echo "${GREEN}✅ Admin dependencies installed${NC}"
cd ..

# Frontend Dependencies (optional)
if [ -d "frontend" ]; then
  echo ""
  echo "${BLUE}Installing Frontend dependencies...${NC}"
  cd frontend
  npm install socket.io-client@4.6.0 zustand@4.4.0
  echo "${GREEN}✅ Frontend dependencies installed${NC}"
  cd ..
fi

# Build shared types
echo ""
echo "${BLUE}Building shared types package...${NC}"
cd packages/types
npm install
npm run build

if [ -d "dist" ]; then
  echo "${GREEN}✅ Shared types built successfully${NC}"
else
  echo "${YELLOW}⚠️  Types build may have failed. Check manually.${NC}"
fi
cd ../..

echo ""
echo "=================================================="
echo "${GREEN}✅ All dependencies installed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and configure"
echo "  2. Run: docker compose up -d"
echo "  3. Run: cd api && npx prisma migrate dev"
echo "  4. Run: npm run dev"
echo ""
echo "See INSTALLATION_GUIDE.md for detailed instructions"
