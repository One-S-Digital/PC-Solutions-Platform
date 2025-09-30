# PC Solutions Monorepo

A comprehensive daycare management platform built with modern web technologies.

## 🏗️ Architecture

This monorepo contains multiple applications and shared packages:

### Applications
- **`apps/web-client`** - Main user-facing application (React + Vite + TypeScript)
- **`admin/`** - Admin dashboard for platform management
- **`api/`** - Backend API (NestJS + Prisma + PostgreSQL)

### Packages
- **`packages/api-client`** - Typed API client with authentication
- **`packages/api-types`** - Shared TypeScript types
- **`packages/ui`** - Shared UI components
- **`packages/typescript-config`** - Shared TypeScript configurations
- **`packages/eslint-config`** - Shared ESLint configurations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- PostgreSQL 14+

### Installation
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development servers
pnpm dev
```

### Development Commands
```bash
# Start all applications
pnpm dev

# Start specific application
pnpm -F web-client dev
pnpm -F admin dev
pnpm -F api dev

# Build all applications
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint
```

## 📱 Applications

### Web Client (`apps/web-client`)
The main user-facing application for daycare centers, parents, and service providers.

**Features:**
- Role-based dashboards
- Marketplace for products and services
- Recruitment and job management
- Real-time messaging
- User settings and organization management

**Tech Stack:**
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- TanStack Query for data fetching
- Clerk for authentication

**Routes:**
- `/login` - Authentication
- `/dashboard` - Role-based dashboard
- `/marketplace` - Products and services
- `/recruitment` - Job listings and candidates
- `/messages` - Real-time messaging
- `/settings` - User and organization settings
- `/pricing` - Subscription plans

### Admin Dashboard (`admin/`)
Administrative interface for platform management and super-admin features.

**Features:**
- User and organization management
- Content moderation
- System monitoring
- Platform settings
- Audit and compliance
- Analytics and reporting

**Tech Stack:**
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- TanStack Query for data fetching

**Routes:**
- `/dashboard` - Admin overview
- `/users` - User management
- `/organizations` - Organization management
- `/content-management` - Content moderation (Super Admin)
- `/advanced-monitoring` - System monitoring (Super Admin)
- `/platform-settings` - Platform configuration (Super Admin)
- `/audit-compliance` - Audit logs and compliance (Super Admin)

### API (`api/`)
Backend API providing REST endpoints and business logic.

**Features:**
- User authentication and authorization
- Organization management
- Marketplace functionality
- Recruitment system
- Messaging system
- File upload and management
- Analytics and reporting

**Tech Stack:**
- NestJS framework
- Prisma ORM
- PostgreSQL database
- Swagger for API documentation
- JWT authentication
- File upload handling

## 🔧 Configuration

### Environment Variables

#### Web Client (`apps/web-client/.env.local`)
```env
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_SKIP_AUTH=false
```

#### Admin (`admin/.env.local`)
```env
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

#### API (`api/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/pc_solutions
JWT_SECRET=your_jwt_secret
CLERK_SECRET_KEY=your_clerk_secret
PORT=3000
```

### Database Setup
```bash
# Generate Prisma client
cd api
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# Seed database (optional)
pnpm prisma db seed
```

## 🎨 Design System

The platform uses a consistent design system with Swiss-themed colors:

- **Swiss Mint** (`#00C896`) - Primary brand color
- **Swiss Teal** (`#008B8B`) - Secondary color
- **Swiss Sand** (`#F4E4C1`) - Accent color
- **Swiss Coral** (`#FF6B6B`) - Alert color
- **Swiss Charcoal** (`#2C3E50`) - Text color

## 🔐 Authentication

The platform uses Clerk for authentication with role-based access control:

### User Roles
- **SUPER_ADMIN** - Full platform access
- **ADMIN** - Administrative access
- **FOUNDATION** - Daycare center management
- **PRODUCT_SUPPLIER** - Product marketplace
- **SERVICE_PROVIDER** - Service marketplace
- **EDUCATOR** - Job board and applications
- **PARENT** - Parent portal access

### Authentication Flow
1. User signs in with Clerk
2. JWT token obtained from Clerk
3. Token sent to API for user resolution
4. User role and permissions loaded
5. Role-based UI and access control applied

## 📊 Data Flow

### API Client Architecture
- **Typed API Client** (`packages/api-client`) - HTTP client with authentication
- **Data Adapters** - Transform API DTOs to UI models
- **React Query Hooks** - Data fetching and caching
- **Component State** - UI state management

### Data Sources
- **PostgreSQL** - Primary database
- **Clerk** - User authentication and profiles
- **File Storage** - Document and image uploads
- **External APIs** - Third-party integrations

## 🧪 Testing

### Test Structure
- **Unit Tests** - Component and utility testing
- **Integration Tests** - API and data flow testing
- **E2E Tests** - Full user journey testing
- **Visual Regression** - UI consistency testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm -F web-client test
pnpm -F admin test
pnpm -F api test

# Run E2E tests
pnpm e2e

# Run visual regression tests
pnpm test:visual
```

## 🚀 Deployment

### Production Build
```bash
# Build all applications
pnpm build

# Build specific application
pnpm -F web-client build
pnpm -F admin build
pnpm -F api build
```

### Docker Deployment
```bash
# Build Docker images
docker-compose build

# Start production environment
docker-compose up -d
```

### Environment-Specific Configuration
- **Development** - Local development with hot reload
- **Staging** - Pre-production testing environment
- **Production** - Live production environment

## 📚 Documentation

### Key Documents
- **`docs/design-inventory.md`** - Design system inventory
- **`docs/transplant-plan.md`** - Implementation plan
- **`docs/admin-feature-gap.md`** - Admin feature analysis
- **`docs/ui-data-map.md`** - UI data mapping documentation

### API Documentation
- **Swagger UI** - Available at `/api/docs` when API is running
- **OpenAPI Spec** - Generated from NestJS decorators
- **Type Definitions** - Available in `packages/api-types`

## 🔧 Development Guidelines

### Code Style
- **TypeScript** - Strict type checking enabled
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **Husky** - Git hooks for quality gates

### Git Workflow
- **Feature Branches** - Develop features in isolated branches
- **Pull Requests** - Code review and testing
- **Conventional Commits** - Standardized commit messages
- **Semantic Versioning** - Version management

### Performance Guidelines
- **Code Splitting** - Lazy load routes and components
- **Image Optimization** - Optimize and lazy load images
- **Bundle Analysis** - Monitor bundle sizes
- **Caching Strategy** - Implement effective caching

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear build cache
pnpm clean
pnpm build
```

#### Database Issues
```bash
# Reset database
cd api
pnpm prisma migrate reset

# Regenerate Prisma client
pnpm prisma generate
```

#### Authentication Issues
- Verify Clerk configuration
- Check environment variables
- Ensure JWT tokens are valid
- Verify API endpoints are accessible

### Debug Mode
```bash
# Enable debug logging
DEBUG=* pnpm dev

# Enable specific debug namespaces
DEBUG=api:*,web-client:* pnpm dev
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Review Process
1. Automated checks (linting, testing)
2. Code review by team members
3. Manual testing in staging
4. Approval and merge

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation** - Check this README and docs folder
- **Issues** - Create GitHub issues for bugs
- **Discussions** - Use GitHub discussions for questions
- **Email** - Contact the development team

### Reporting Bugs
When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Screenshots or logs

### Feature Requests
When requesting features, please include:
- Use case description
- Expected functionality
- Potential implementation approach
- Priority level

---

**Built with ❤️ for the daycare community**