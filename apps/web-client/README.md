# Web Client

The production user interface for Pro Crèche Solutions, built with React, TypeScript, and Tailwind CSS.

## Features

- **Authentication**: Clerk integration for secure user authentication
- **Role-based Access**: Different dashboards and features based on user roles
- **Responsive Design**: Mobile-first design that works on all devices
- **Internationalization**: Multi-language support (EN/FR/DE)
- **Real-time Features**: Messaging, notifications, and live updates
- **File Management**: Upload and manage documents and media
- **Marketplace**: Browse and purchase products and services
- **Recruitment**: Job postings and candidate management

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6+
- **State Management**: TanStack Query + React Context
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Clerk
- **HTTP Client**: Axios
- **Testing**: Vitest + Playwright
- **Linting**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Clerk account for authentication

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Configure environment variables:
   - `VITE_API_URL`: Backend API URL
   - `VITE_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
   - `VITE_SKIP_AUTH`: Skip authentication in development (optional)

### Development

Start the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:3001`

### Building

Build for production:
```bash
pnpm build
```

Preview production build:
```bash
pnpm preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   ├── layout/         # Layout components
│   └── ...
├── pages/              # Page components
├── layouts/            # Layout wrappers
├── hooks/              # Custom React hooks
├── services/           # API services
├── adapters/           # Data transformation
├── contexts/           # React contexts
├── utils/              # Utility functions
├── types/              # TypeScript types
├── styles/             # Styling
└── test/               # Test utilities
```

## Authentication

The app uses Clerk for authentication. Users can:

- Sign in with email/password
- Sign up for new accounts
- Reset passwords
- Manage profile information

## Role-Based Access

Different user roles have access to different features:

- **Foundation**: Daycare management, parent leads, recruitment
- **Product Supplier**: Product listings, order management, analytics
- **Service Provider**: Service listings, appointment management, analytics
- **Educator**: Job applications, profile management, messaging
- **Parent**: Daycare search, enquiries, messaging
- **Admin**: User management, system monitoring, platform settings
- **Super Admin**: All admin features plus advanced system controls

## API Integration

The app communicates with the NestJS backend through a typed API client:

- All API calls are typed with TypeScript
- Automatic authentication token handling
- Error handling and retry logic
- Request/response interceptors

## Styling

The app uses Tailwind CSS with a custom design system:

- Swiss-themed color palette
- Consistent spacing and typography
- Responsive design patterns
- Component-based styling

## Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm e2e
```

### Visual Regression Tests
```bash
pnpm e2e:visual
```

## Deployment

The app is designed to be deployed as a static site:

1. Build the app: `pnpm build`
2. Deploy the `dist` folder to your hosting provider
3. Configure environment variables in your hosting platform

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `VITE_SKIP_AUTH` | Skip authentication in development | No |

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

Private - Pro Crèche Solutions