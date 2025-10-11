# @workspace/types

Shared TypeScript types and interfaces for PC Solutions V2 monorepo.

## Purpose

This package provides type definitions used across multiple applications (API, Admin, Frontend) to ensure type safety and prevent drift.

## Installation

This package is internal to the monorepo and should be referenced via workspace protocol:

```json
{
  "dependencies": {
    "@workspace/types": "workspace:*"
  }
}
```

## Usage

### In API (Backend)
```typescript
import { ApiEnvelope, ContentItem, PolicyAlert } from '@workspace/types';

function wrapResponse<T>(data: T): ApiEnvelope<T> {
  return {
    success: true,
    version: 1,
    timestamp: new Date().toISOString(),
    data,
  };
}
```

### In Frontend/Admin
```typescript
import { User, UserRole, AlertType } from '@workspace/types';

const user: User = {
  id: '123',
  email: 'user@example.com',
  role: UserRole.ADMIN,
  // ...
};
```

## Building

```bash
cd packages/types
npm run build
```

## Watching (Development)

```bash
npm run watch
```

## What's Included

### Core Types
- `ApiEnvelope<T>` - Standard API response wrapper
- `ApiError` - Error structure
- `PaginationMeta` - Pagination metadata

### Domain Types
- `ContentItem`, `ContentCategory` - Content management
- `PolicyAlert` - Policy alerts and notifications
- `User`, `UserProfile` - User management
- `PlatformSettings` - Platform configuration

### Enums
- `UserRole` - User role types
- `ContentType` - Content types
- `AlertType` - Alert severity levels
- `SwissRegion` - Swiss cantons/regions

## Type Guards

```typescript
import { isSuccessResponse, isErrorResponse } from '@workspace/types';

const response = await api.get<User>('/users/123');

if (isSuccessResponse(response)) {
  console.log(response.data.email); // TypeScript knows data exists
}

if (isErrorResponse(response)) {
  console.error(response.error.message); // TypeScript knows error exists
}
```

## Versioning

This package follows semantic versioning. Update the version when:
- **Major (1.0.0 → 2.0.0):** Breaking changes to existing types
- **Minor (1.0.0 → 1.1.0):** New types added
- **Patch (1.0.0 → 1.0.1):** Bug fixes, documentation

## Contributing

1. Add new types to appropriate files in `src/`
2. Export from `src/index.ts`
3. Run `npm run build` to test
4. Update this README if adding new modules
