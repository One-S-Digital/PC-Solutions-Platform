# PC Solutions V2 - Developer Guide

**Last Updated:** October 2025  
**Audience:** Developers setting up and working with the codebase

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Development Workflow](#development-workflow)
5. [Code Style & Standards](#code-style--standards)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm/pnpm
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)
- Clerk account (for authentication)

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd PC-Solutions-V2

# Install dependencies (monorepo)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run database migrations
cd api && npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start all services
npm run dev
```

### Access Points
- Frontend: <http://localhost:3000>
- Admin: <http://localhost:3001>
- API: <http://localhost:3002>
- API Docs: <http://localhost:3002/api>

---

## Project Structure

```text
PC-Solutions-V2/
├── admin/                 # Admin dashboard (React + Vite)
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── design-system/  # Reusable UI components
│   │   │   ├── settings/       # Settings pages
│   │   │   └── forms/          # Form components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API clients
│   │   ├── constants/    # Constants and config
│   │   └── utils/        # Utility functions
│   ├── public/           # Static assets
│   └── vite.config.ts    # Vite configuration
│
├── frontend/             # User-facing app (React + Vite)
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API clients
│   └── vite.config.ts    # Vite configuration
│
├── api/                  # Backend API (NestJS)
│   ├── src/
│   │   ├── auth/         # Authentication & authorization
│   │   ├── users/        # User management
│   │   ├── content/      # Content management
│   │   ├── elearning/    # E-learning platform
│   │   ├── upload/       # File upload services
│   │   └── prisma/       # Database service
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   ├── seed.ts       # Database seeding
│   │   └── migrations/   # Migration files
│   └── test/             # Test files
│
├── packages/             # Shared packages
│   └── translations/     # i18n translations
│       ├── locales/
│       │   ├── en/       # English translations
│       │   ├── fr/       # French translations
│       │   └── de/       # German translations
│       └── index.ts      # Export configuration
│
├── docs/                 # Documentation
├── scripts/              # Build/deployment scripts
└── docker-compose.yml    # Docker services
```

---

## Technology Stack

### Frontend & Admin
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3
- **State Management:** React Query (TanStack Query)
- **Forms:** React Hook Form
- **Routing:** React Router v6
- **Authentication:** Clerk
- **i18n:** react-i18next
- **HTTP Client:** Axios
- **Notifications:** react-hot-toast

### Backend (API)
- **Framework:** NestJS 10
- **Language:** TypeScript
- **Database:** PostgreSQL 14
- **ORM:** Prisma 5
- **Authentication:** Clerk + JWT
- **Validation:** class-validator
- **Documentation:** Swagger/OpenAPI
- **File Storage:** Cloudflare R2 (S3-compatible)
- **Testing:** Jest

### DevOps
- **Containers:** Docker
- **Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions
- **Deployment:** Render.com
- **Monitoring:** Built-in health checks

---

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `cursor/*` - AI-assisted development branches

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test locally**
   ```bash
   npm run dev        # Start all services
   npm test           # Run tests
   npm run lint       # Check code style
   ```

3. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   **Commit Message Format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding/updating tests
   - `chore:` Maintenance tasks

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

### Running Individual Services

```bash
# Frontend only
cd frontend && npm run dev

# Admin only
cd admin && npm run dev

# API only
cd api && npm run start

# API with watch mode
cd api && npm run start:dev

# Build for production
npm run build        # Builds all services
cd admin && npm run build    # Admin only
cd frontend && npm run build # Frontend only
cd api && npm run build      # API only
```

---

## Code Style & Standards

### TypeScript
- **Strict mode enabled**
- **No implicit any**
- **Proper type definitions for all functions**
- **Use interfaces for object shapes**
- **Use type for unions/intersections**

### React Components

**Good:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
};
```

**Bad:**
```typescript
export const Button = (props: any) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};
```

### NestJS Services

**Good:**
```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}
```

### File Naming Conventions
- **Components:** PascalCase (`Button.tsx`, `UserCard.tsx`)
- **Utilities:** camelCase (`formatDate.ts`, `apiClient.ts`)
- **Constants:** UPPER_SNAKE_CASE or camelCase (`API_URL`, `defaultConfig.ts`)
- **Types/Interfaces:** PascalCase (`User.ts`, `ApiResponse.ts`)

### Import Order
```typescript
// 1. External dependencies
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

// 3. Relative imports
import { formatDate } from '../utils';
import type { User } from '../types';

// 4. Styles
import './styles.css';
```

---

## Testing

### Unit Tests (Frontend/Admin)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

**Example Test:**
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click" onClick={handleClick} />);
    screen.getByText('Click').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### API Tests (NestJS)

```bash
cd api

# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

**Example Test:**
```typescript
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, PrismaService],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should find user by id', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

    const result = await service.findById('1');
    expect(result).toEqual(mockUser);
  });
});
```

### E2E Tests (Playwright)

```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e -- --ui
```

---

## Deployment

### Environment Variables

**Required for all environments:**
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `CLERK_SECRET_KEY` - Clerk authentication
- `NODE_ENV` - Environment (development/production)

**API-specific:**
- `R2_ACCOUNT_ID` - Cloudflare R2 account
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - R2 bucket name

**Frontend/Admin:**
- `VITE_API_URL` - Backend API URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk key

### Build Process

```bash
# Build all services
npm run build

# Builds are output to:
# - admin/dist/
# - frontend/dist/
# - api/dist/
```

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Render.com Deployment

1. Connect GitHub repository
2. Create services:
   - **Web Service** (API) - `api/`
   - **Static Site** (Frontend) - `frontend/dist/`
   - **Static Site** (Admin) - `admin/dist/`
3. Set environment variables
4. Deploy

See `RENDER_DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## Troubleshooting

### Common Issues

#### Database Connection Error
```text
Error: P1001: Can't reach database server
```
**Solution:** Check DATABASE_URL, ensure PostgreSQL is running

#### Module Not Found
```text
Cannot find module '@/components/Button'
```
**Solution:** Check tsconfig.json paths, run `npm install`

#### Clerk Authentication Error
```text
Clerk: Missing publishable key
```
**Solution:** Set VITE_CLERK_PUBLISHABLE_KEY in .env

#### Port Already in Use
```text
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Kill process on port or change port in config

### Debug Mode

**Frontend/Admin:**
```typescript
// Add to .env
VITE_DEBUG=true
```

**API:**
```typescript
// Add to .env
LOG_LEVEL=debug
```

### Database Issues

```bash
# Reset database
cd api
npx prisma migrate reset

# View current migrations
npx prisma migrate status

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

---

## Best Practices

1. **Always use TypeScript** - No `any` types
2. **Write tests** - Aim for >80% coverage
3. **Use design system components** - Don't create one-off styles
4. **Handle errors** - Proper try/catch, error boundaries
5. **Optimize images** - Use WebP, lazy loading
6. **Internationalize** - Use `t()` for all user-facing text
7. **Validate input** - Client and server side
8. **Use React Query** - For API calls and caching
9. **Keep components small** - < 200 lines ideally
10. **Document complex logic** - Clear comments

---

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Clerk Documentation](https://clerk.com/docs)

---

## Getting Help

1. **Check documentation** - This guide and others in `/docs`
2. **Search codebase** - Use grep/search for examples
3. **Review PR history** - See how similar features were implemented
4. **Ask the team** - Don't hesitate to reach out

Happy coding! 🚀
