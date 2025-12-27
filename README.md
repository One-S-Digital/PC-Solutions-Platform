# PC-Solutions Platform

A modern, secure, and scalable platform for childcare solutions in Switzerland, built from the ground up with TypeScript, React, NestJS, and PostgreSQL.

## Architecture

This is a monorepo containing three main applications:

- **Frontend** (`apps/frontend`): Main user-facing application for all non-admin roles (Parents, Educators, Foundations, etc.)
- **Admin** (`apps/admin`): Protected admin dashboard for administrative users
- **API** (`apps/api`): Centralized NestJS backend API server

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Authentication**: Clerk with JWT validation and RBAC
- **Storage**: Cloudflare R2
- **Monitoring**: Sentry (error tracking, performance monitoring, user feedback)
- **Deployment**: Docker + Render

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL 14+
- Clerk account (for authentication)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` files in each app directory
   - See [Environment Setup Guide](./ENVIRONMENT_SETUP.md) for detailed instructions
   - See [Authentication Setup Guide](./AUTHENTICATION_SETUP.md) for Clerk configuration

4. Set up the database:
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   pnpm prisma generate
   ```

5. Start the development servers:
   ```bash
   pnpm dev
   ```

This will start all three applications:
- Frontend: http://localhost:5173
- Admin: http://localhost:5174
- API: http://localhost:3000

## Authentication System

The platform uses Clerk for authentication with comprehensive role-based access control:

- **User Roles**: SUPER_ADMIN, ADMIN, FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, EDUCATOR, PARENT
- **JWT Validation**: Secure token validation on the backend
- **RBAC**: Role-based access control for all endpoints
- **User Sync**: Automatic user synchronization from Clerk

See [Authentication Setup Guide](./AUTHENTICATION_SETUP.md) for detailed setup instructions.

## Available Scripts

- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications
- `pnpm lint` - Lint all applications
- `pnpm lint:fix` - Fix linting issues
- `pnpm type-check` - Run TypeScript type checking
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm clean` - Clean all build artifacts

## Project Structure

```
├── apps/
│   ├── frontend/          # Main React application
│   ├── admin/             # Admin dashboard
│   └── api/               # NestJS backend
├── packages/
│   ├── eslint-config/     # Shared ESLint configuration
│   ├── typescript-config/ # Shared TypeScript configuration
│   └── ui/                # Shared UI components and types
├── docs/                  # Documentation
├── ENVIRONMENT_SETUP.md   # Environment variables guide
├── AUTHENTICATION_SETUP.md # Authentication setup guide
└── render.yaml           # Render deployment configuration
```

## Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write tests for all new features
- Follow the established architecture patterns
- Use conventional commits for git messages
- Implement proper error handling and logging
- Use the shared UI package for consistent components

## Deployment

The platform is designed for deployment on Render with the following services:

- **API Service**: NestJS backend with PostgreSQL database
- **Frontend Service**: React application
- **Admin Service**: Admin dashboard

See [Environment Setup Guide](./ENVIRONMENT_SETUP.md) for production deployment instructions.

## Documentation

- [Environment Setup Guide](./ENVIRONMENT_SETUP.md) - Complete guide for environment variables
- [Authentication Setup Guide](./AUTHENTICATION_SETUP.md) - Clerk authentication setup
- [Sentry Integration Guide](./SENTRY_INTEGRATION_GUIDE.md) - Error tracking and monitoring setup
- [Rebuild Specification](./docs/rebuild-specification.md) - Technical requirements
- [UI Guide](./docs/ui-guide.md) - User interface specifications
- [i18n Specification](./docs/i18n-specification.md) - Internationalization guide

## License

Private - All rights reserved