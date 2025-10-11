# PC Solutions V2 - UI/UX Guide

**Last Updated:** October 2025  
**Status:** Current  
**Applies To:** Admin Panel, Frontend Application

---

## Overview

PC Solutions V2 is a multi-tenant childcare management platform with three main applications:
1. **Frontend** - Parent & educator portal (React + Vite)
2. **Admin** - Administrative dashboard (React + Vite)
3. **API** - Backend services (NestJS + Prisma)

---

## Admin Panel UI Architecture

### Design System

The admin panel uses a custom design system with:
- **Components:** `admin/src/components/design-system/`
- **Tokens:** `admin/src/constants/design-system.ts`
- **Theme:** Tailwind CSS with custom Swiss Mint color palette

#### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Card` | `design-system/Card.tsx` | Container with hover effects, clickable variants |
| `Button` | `design-system/Button.tsx` | Primary, secondary, outline variants |
| `Tabs` | `design-system/Tabs.tsx` | Multi-tab navigation |
| `ToggleSwitch` | `design-system/ToggleSwitch.tsx` | Boolean settings |
| `ChipInput` | `design-system/ChipInput.tsx` | Tag/keyword input with autocomplete |
| `FileUploadZone` | `design-system/FileUploadZone.tsx` | Drag-and-drop file uploads |
| `QuantityInput` | `design-system/QuantityInput.tsx` | Numeric input with +/- buttons |
| `RadioPills` | `design-system/RadioPills.tsx` | Pill-style radio button groups |
| `LanguageSwitcher` | `design-system/LanguageSwitcher.tsx` | Language selection cards |

### Page Structure

```text
admin/src/pages/
├── Dashboard.tsx          # Main admin dashboard with KPI cards
├── Users.tsx             # User management with role assignment
├── Content.tsx           # Multi-tab content management
├── SystemMonitor.tsx     # System health, logs, metrics
├── Settings.tsx          # Platform settings
└── DesignSystem.tsx      # Design system showcase/docs
```

### Key Features

#### 1. Dashboard
- **Path:** `/admin/dashboard`
- **Components:** 6 main KPI cards
- **Cards:**
  - Users Management
  - Content Management
  - System Monitor
  - Platform Settings
  - Organizations
  - Analytics

#### 2. Content Management
- **Path:** `/admin/content`
- **Tabs:**
  - E-Learning Content (videos, courses, materials)
  - HR Procedures (internal documents)
  - State Policies (regulatory documents)
  - Policy Alerts (notifications, updates)
- **Features:**
  - Multi-file upload with drag-and-drop
  - Categorization and tagging
  - Publish/archive workflow
  - Dashboard with statistics

#### 3. System Monitor
- **Path:** `/admin/system-monitor`
- **Tabs:**
  - Overview (system health, uptime, API status)
  - Logs (error logs, access logs)
  - Metrics (performance, database stats)
  - Analytics (user activity, popular content)
  - Security (auth events, suspicious activity)

#### 4. Settings
- **Path:** `/admin/settings`
- **Sections:**
  - **General:** Platform name, description, maintenance mode
  - **Branding:** Logo, favicon, primary color
  - **Email:** SMTP configuration, templates
  - **Advanced:** API keys, webhooks, feature flags

#### 5. User Management
- **Path:** `/admin/users`
- **Features:**
  - User list with search/filter
  - Role assignment (SUPER_ADMIN, ADMIN, EDUCATOR, etc.)
  - User details modal
  - Bulk actions

---

## Frontend Application UI

### Public Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Landing page with features, pricing |
| Login | `/sign-in` | Clerk authentication |
| Signup | `/sign-up` | Multi-step registration |
| Forgot Password | `/forgot-password` | Password reset flow |

### Authenticated Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Role-specific landing page |
| Profile | `/profile` | User profile management |
| Messages | `/messages` | Internal messaging system |
| Organizations | `/organizations` | Organization directory |
| Products | `/products` | Product marketplace |
| Services | `/services` | Service marketplace |
| E-Learning | `/elearning` | Course library |
| HR Procedures | `/hr-procedures` | Internal documents |
| State Policies | `/state-policies` | Regulatory documents |
| Settings | `/settings` | User settings |

### Role-Specific Features

#### SUPER_ADMIN
- Full system access
- User role management
- Platform configuration
- System monitoring
- Content management

#### ADMIN
- Organization management
- User management (within org)
- Content management
- Settings configuration

#### EDUCATOR
- E-learning content access
- HR procedures
- State policies
- Profile management
- Course enrollment

#### PARENT
- Child profiles
- Marketplace browsing
- Service booking
- Document access
- Messaging

---

## Design Patterns

### 1. Card-Based Layout
```tsx
<Card 
  title="Feature Name" 
  icon={Icon}
  hoverEffect
  onClick={() => navigate('/path')}
>
  Content here
</Card>
```

### 2. Tab Navigation
```tsx
<Tabs
  tabs={[
    { label: 'Tab 1', content: <Tab1Content /> },
    { label: 'Tab 2', content: <Tab2Content /> },
  ]}
  defaultActiveTab={0}
/>
```

### 3. Form Patterns
- Use `STANDARD_INPUT_FIELD` constant for consistent styling
- Real-time validation with error messages
- Loading states during submission
- Success/error toasts (react-hot-toast)

### 4. File Upload Pattern
```tsx
<FileUploadZone
  acceptedMimeTypes="image/*,application/pdf"
  maxFileSizeMB={5}
  onFileSelect={handleFileSelect}
  label="Upload Document"
/>
```

---

## Internationalization (i18n)

### Current Setup
- **Package:** `@workspace/translations` (monorepo shared)
- **Languages:** English, French, German
- **Coverage:** 96.9% (879/924 keys)
- **Implementation:** react-i18next

### Usage
```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('common.welcome')}</h1>;
}
```

### Key Namespaces
- `common` - Shared UI strings
- `auth` - Authentication flows
- `dashboard` - Dashboard content
- `forms` - Form labels and validation
- `errors` - Error messages

---

## Styling Guidelines

### Colors (Tailwind Classes)
- **Primary:** `swiss-mint` (#48CFAE)
- **Secondary:** `swiss-teal` (#227C9D)
- **Success:** `green-600`
- **Warning:** `yellow-500`
- **Error:** `red-600`
- **Neutral:** `gray-100` to `gray-900`

### Typography
- **Headings:** `text-2xl font-bold text-gray-900`
- **Body:** `text-base text-gray-700`
- **Labels:** `text-sm font-medium text-gray-700`
- **Captions:** `text-xs text-gray-500`

### Spacing
- **Sections:** `mb-6` (24px)
- **Cards:** `p-6` (24px padding)
- **Forms:** `space-y-4` (16px vertical)
- **Inline:** `space-x-2` (8px horizontal)

### Responsive Breakpoints
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px
- `2xl:` 1536px

---

## User Flows

### 1. Admin - Upload Content
1. Navigate to `/admin/content`
2. Select tab (E-Learning, HR, Policies, Alerts)
3. Click "Upload" button
4. Drag files or click to browse
5. Fill in metadata (title, description, category)
6. Click "Upload"
7. View in content list

### 2. Admin - Create User
1. Navigate to `/admin/users`
2. Click "Add User" button
3. Fill in user details
4. Select role from dropdown
5. Assign organization (if applicable)
6. Click "Create User"
7. User receives invitation email

### 3. Admin - Platform Settings
1. Navigate to `/admin/settings`
2. Select settings tab (General, Branding, Email, Advanced)
3. Update settings
4. Click "Save Changes"
5. See success toast
6. Changes reflected immediately

### 4. Educator - Access E-Learning
1. Login with credentials
2. Navigate to `/elearning`
3. Browse courses by category
4. Click course to view details
5. Enroll in course
6. Access lessons and quizzes

---

## Accessibility

### ARIA Labels
- All interactive elements have `aria-label` or `aria-labelledby`
- Form inputs use proper `label` associations
- Role attributes on custom components

### Keyboard Navigation
- Tab order follows visual order
- Focus indicators visible
- Escape closes modals
- Enter/Space activates buttons

### Screen Reader Support
- Semantic HTML elements
- Alternative text for images
- Status messages announced via `aria-live`

---

## Performance Optimizations

### Code Splitting
- Route-based lazy loading
- Dynamic imports for large components

### Image Optimization
- WebP format where supported
- Lazy loading with `loading="lazy"`
- Responsive images with `srcset`

### Caching
- API responses cached with React Query
- Static assets cached by browser
- CDN for translation files

---

## Testing

### Component Testing
```bash
# Admin panel
cd admin && npm test

# Frontend
cd frontend && npm test
```

### E2E Testing
```bash
# Using Playwright
npm run test:e2e
```

### Accessibility Testing
- Lighthouse audits
- axe DevTools
- Keyboard-only navigation testing

---

## Deployment

### Build Commands
```bash
# Admin
cd admin && npm run build

# Frontend
cd frontend && npm run build
```

### Environment Variables
See `ENVIRONMENT_SETUP.md` for complete list

---

## Resources

- **Design System Showcase:** `/admin/design-system`
- **Translations:** `TRANSLATIONS_README.md`
- **API Documentation:** `api/README.md`
- **Setup Guide:** `LOCAL_SETUP_QUICKSTART.md`

---

## Support

For questions or issues:
1. Check this guide first
2. Review component source code
3. Check GitHub issues
4. Contact development team
