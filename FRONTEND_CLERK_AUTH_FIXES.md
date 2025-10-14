# Frontend Clerk Authentication - Detailed Fixes

This document provides specific code fixes for all issues identified in `FRONTEND_CLERK_AUTH_INVESTIGATION.md`.

---

## Phase 1: Critical Fixes (Must Do Immediately)

### Fix #1: Install Dependencies

```bash
cd /workspace/frontend
npm install
# or if using pnpm
pnpm install

# Verify installation
npm list @clerk/clerk-react
# Should show: @clerk/clerk-react@5.0.0
```

---

### Fix #2: Fix Logout Function

**File**: `frontend/providers/AuthProvider.tsx`

**Find** (lines 80-88):
```typescript
const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
  // Clerk handles authentication, this is just for compatibility
  return { success: true };
};

const logout = () => {
  setCurrentUser(null);
  // Clerk will handle the actual logout
};
```

**Replace with**:
```typescript
const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
  // Clerk handles authentication, this is just for compatibility
  return { success: true };
};

const logout = async () => {
  try {
    setCurrentUser(null);
    // Properly sign out from Clerk
    const { signOut } = await import('@clerk/clerk-react');
    // Note: We need to access signOut from useClerk hook
    // This will be fixed in the component refactor below
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

**Better approach - Refactor AuthProviderInner**:

```typescript
const AuthProviderInner: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  const { getToken, signOut } = useAuth(); // Add signOut here
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!currentUser && !!clerkUser;

  // ... existing useEffect ...

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    // Clerk handles authentication, this is just for compatibility
    return { success: true };
  };

  const logout = async () => {
    try {
      setCurrentUser(null);
      await signOut(); // Now we have access to signOut from useAuth
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if Clerk signOut fails
    }
  };

  // ... rest of code ...
```

**Update Navbar.tsx logout call** (line 39-43):

```typescript
const handleLogout = async () => {
  await logout(); // Make it async
  setDropdownOpen(false);
  navigate('/login', { replace: true });
};
```

---

### Fix #3: Create Environment Configuration

**File**: `frontend/.env` (create new file)

```env
# Clerk Authentication
# Get your key from: https://dashboard.clerk.com/
VITE_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_ACTUAL_KEY

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Environment
VITE_NODE_ENV=development
```

**For Production** (add to Render environment variables):
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_REPLACE_WITH_YOUR_PRODUCTION_KEY
VITE_API_URL=https://your-api-service.onrender.com/api
VITE_NODE_ENV=production
```

**Update .gitignore** to ensure .env is never committed:
```
# Environment files
.env
.env.local
.env.*.local
```

---

### Fix #4: Remove Client-Side Role Assignment (Security Fix)

**File**: `frontend/pages/SignupPage.tsx`

**Find** (lines 143-154):
```typescript
const result = await signUp.create({
  emailAddress: formData.email,
  password: formData.password,
  firstName: firstName,
  lastName: lastName,
  unsafeMetadata: {
    role: selectedRole,
    organisationName: formData.organisationName,
    phone: formData.phone,
    canton: formData.canton,
  },
});
```

**Replace with**:
```typescript
const result = await signUp.create({
  emailAddress: formData.email,
  password: formData.password,
  firstName: firstName,
  lastName: lastName,
  unsafeMetadata: {
    // Store signup intent - backend will assign actual role
    signupType: selectedRole,
    organisationName: formData.organisationName,
    phone: formData.phone,
    canton: formData.canton,
    pendingRole: selectedRole, // For backend webhook to process
  },
});
```

**Backend Fix Required** - Add to `api/src/webhooks/clerk.webhook.ts`:

```typescript
@Post('user.created')
async handleUserCreated(@Body() body: any) {
  const { data } = body;
  
  // Extract signup metadata
  const pendingRole = data.unsafe_metadata?.pendingRole || 'PARENT';
  
  // Create user in database
  const user = await this.prisma.user.create({
    data: {
      clerkId: data.id,
      email: data.email_addresses[0].email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      role: this.validateAndAssignRole(pendingRole),
      // ... other fields
    },
  });
  
  // Update Clerk user with secure public metadata
  await this.clerkClient.users.updateUserMetadata(data.id, {
    publicMetadata: {
      role: user.role,
      userId: user.id,
      orgId: user.orgId,
    },
  });
  
  return { success: true };
}

private validateAndAssignRole(requestedRole: string): UserRole {
  // Validate role is not admin (prevent privilege escalation)
  const allowedRoles = ['PARENT', 'FOUNDATION', 'EDUCATOR', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER'];
  
  if (allowedRoles.includes(requestedRole)) {
    return requestedRole as UserRole;
  }
  
  // Default to PARENT for safety
  return UserRole.PARENT;
}
```

---

## Phase 2: High Priority Fixes

### Fix #5: Add Email Verification Flow

**File**: `frontend/pages/SignupPage.tsx`

**Add new state** (after line 38):
```typescript
const [showVerificationStep, setShowVerificationStep] = useState(false);
const [verificationCode, setVerificationCode] = useState('');
const [verificationError, setVerificationError] = useState('');
```

**Update handleSubmit** (replace lines 131-196):
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if (!validateStep2() || !selectedRole || !isLoaded || !signUp) return;
  
  setIsLoading(true);

  try {
    // Split contact person into first and last name
    const nameParts = formData.contactPerson.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const result = await signUp.create({
      emailAddress: formData.email,
      password: formData.password,
      firstName: firstName,
      lastName: lastName,
      unsafeMetadata: {
        signupType: selectedRole,
        organisationName: formData.organisationName,
        phone: formData.phone,
        canton: formData.canton,
        pendingRole: selectedRole,
      },
    });

    // Check if email verification is required
    if (result.status === 'missing_requirements') {
      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setShowVerificationStep(true);
      setIsLoading(false);
      return;
    }

    if (result.status === 'complete') {
      await setActive({ session: result.createdSessionId });
      
      // Redirect based on role
      if ([SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole)) {
        navigate('/pricing', { state: { fromSignup: true, role: selectedRole } });
      } else {
        setCurrentStep(3);
      }
    }
  } catch (err: any) {
    console.error('Signup error:', err);
    let errorMessage = 'An error occurred during signup';
    
    if (err.errors && err.errors.length > 0) {
      const clerkError = err.errors[0];
      switch (clerkError.code) {
        case 'form_identifier_exists':
          errorMessage = t('errors.accountExists', 'An account with this email already exists');
          break;
        case 'form_password_pwned':
          errorMessage = t('errors.passwordPwned', 'This password has been found in a data breach. Please choose a different password');
          break;
        case 'form_password_not_strong_enough':
          errorMessage = t('errors.passwordWeak', 'Password is not strong enough');
          break;
        case 'form_identifier_invalid':
          errorMessage = t('errors.emailInvalid', 'Please enter a valid email address');
          break;
        default:
          errorMessage = clerkError.message || 'Invalid email or password';
      }
    }
    
    setErrors({ email: errorMessage });
  } finally {
    setIsLoading(false);
  }
};

// Add verification handler
const handleVerification = async (e: FormEvent) => {
  e.preventDefault();
  if (!signUp || !verificationCode) return;
  
  setIsLoading(true);
  setVerificationError('');
  
  try {
    const result = await signUp.attemptEmailAddressVerification({
      code: verificationCode,
    });
    
    if (result.status === 'complete') {
      await setActive({ session: result.createdSessionId });
      
      // Redirect based on role
      if ([SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole!)) {
        navigate('/pricing', { state: { fromSignup: true, role: selectedRole } });
      } else {
        setCurrentStep(3);
      }
    }
  } catch (err: any) {
    console.error('Verification error:', err);
    const errorMessage = err.errors?.[0]?.message || 'Invalid verification code';
    setVerificationError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};
```

**Add verification UI** (after line 289, before the </form> closing tag):

```typescript
{showVerificationStep && (
  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <h3 className="text-lg font-semibold text-swiss-charcoal mb-2">
      {t('verifyEmail')}
    </h3>
    <p className="text-sm text-gray-600 mb-4">
      {t('verifyEmailMessage', { email: formData.email })}
    </p>
    <form onSubmit={handleVerification} className="space-y-4">
      <div>
        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
          {t('labels.verificationCode')}
        </label>
        <input
          type="text"
          id="verificationCode"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className={STANDARD_INPUT_FIELD}
          placeholder="000000"
          maxLength={6}
          required
        />
        {verificationError && (
          <p className="text-xs text-swiss-coral mt-1">{verificationError}</p>
        )}
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? t('verifying') : t('buttons.verifyEmail')}
      </Button>
    </form>
  </div>
)}
```

**Add translations** to `packages/translations/locales/en/signup.json`:
```json
{
  "verifyEmail": "Verify Your Email",
  "verifyEmailMessage": "We've sent a verification code to {{email}}. Please enter it below.",
  "verifying": "Verifying...",
  "labels": {
    "verificationCode": "Verification Code"
  },
  "buttons": {
    "verifyEmail": "Verify Email"
  }
}
```

---

### Fix #6: Fix Social Login Redirects

**File**: `frontend/pages/LoginPage.tsx`

**Find** (lines 107-123):
```typescript
const handleSocialLogin = async (provider: 'oauth_google' | 'oauth_facebook') => {
  if (!isLoaded || !signIn) {
    setError('Authentication service not ready. Please try again.');
    return;
  }

  try {
    await signIn.authenticateWithRedirect({
      strategy: provider,
      redirectUrl: '/dashboard',
      redirectUrlComplete: '/dashboard',
    });
  } catch (error) {
    console.error('Social login error:', error);
    setError('Social login failed. Please try again.');
  }
};
```

**Replace with**:
```typescript
const handleSocialLogin = async (provider: 'oauth_google' | 'oauth_facebook') => {
  if (!isLoaded || !signIn) {
    setError('Authentication service not ready. Please try again.');
    return;
  }

  try {
    // Use full URL for redirects (Clerk v5 requirement)
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    await signIn.authenticateWithRedirect({
      strategy: provider,
      redirectUrl: redirectUrl,
      redirectUrlComplete: redirectUrl,
    });
  } catch (error: any) {
    console.error('Social login error:', error);
    const errorMessage = error.errors?.[0]?.message || 'Social login failed. Please try again.';
    setError(errorMessage);
  }
};
```

**Better approach**: Configure OAuth redirects in Clerk Dashboard:
1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to: **User & Authentication** → **Social Connections**
4. For each enabled provider (Google, Facebook):
   - Configure authorized redirect URIs
   - Add: `https://your-domain.com/dashboard`
   - Add: `http://localhost:3001/dashboard` (for development)

---

### Fix #7: Add Error Handling for setActive

**File**: `frontend/pages/LoginPage.tsx` and `frontend/pages/SignupPage.tsx`

**LoginPage - Find** (lines 69-71):
```typescript
if (result.status === 'complete') {
  await setActive({ session: result.createdSessionId });
  navigate('/dashboard', { replace: true });
}
```

**Replace with**:
```typescript
if (result.status === 'complete') {
  try {
    await setActive({ session: result.createdSessionId });
    navigate('/dashboard', { replace: true });
  } catch (setActiveError: any) {
    console.error('Session activation failed:', setActiveError);
    setError('Failed to activate session. Please try logging in again.');
  }
}
```

Apply the same fix to SignupPage.tsx at the corresponding locations.

---

### Fix #8: Remove Fallback User Creation

**File**: `frontend/providers/AuthProvider.tsx`

**Find** (lines 45-74):
```typescript
try {
  // Sync user with backend API
  await syncUserWithBackend(clerkUser, getToken);
} catch (error) {
  console.error('Failed to sync user with backend:', error);
  
  // Fallback to creating a basic user from Clerk data if backend is unavailable
  const fallbackUser: User = {
    id: clerkUser.id,
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    firstName: clerkUser.firstName || '',
    lastName: clerkUser.lastName || '',
    role: UserRole.PARENT, // Default role
    certifications: [],
    skills: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Legacy fields for UI compatibility
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
    status: 'Active',
    lastLogin: new Date().toISOString(),
    memberSince: new Date().toISOString(),
  };
  
  setCurrentUser(fallbackUser);
}
```

**Replace with**:
```typescript
try {
  // Sync user with backend API
  await syncUserWithBackend(clerkUser, getToken);
} catch (error) {
  console.error('Failed to sync user with backend:', error);
  
  // Set user to null and show error state
  setCurrentUser(null);
  
  // Show error notification to user
  // TODO: Add error notification system
  console.error('Unable to load user profile. Please check your connection and try again.');
  
  // Optionally: Retry after a delay
  setTimeout(() => {
    syncUser();
  }, 5000);
}
```

**Add error UI component** (optional enhancement):

Create `frontend/components/shared/BackendConnectionError.tsx`:
```typescript
import React from 'react';
import Button from '../ui/Button';

interface Props {
  onRetry: () => void;
}

export const BackendConnectionError: React.FC<Props> = ({ onRetry }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
        <p className="text-gray-600 mb-6">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        <Button onClick={onRetry} variant="primary" size="lg" className="w-full">
          Retry Connection
        </Button>
      </div>
    </div>
  );
};
```

---

## Phase 3: Medium Priority Fixes

### Fix #9: Add Session Persistence Configuration

**File**: `frontend/providers/AuthProvider.tsx`

**Find** (lines 234-238):
```typescript
return (
  <ClerkProvider publishableKey={publishableKey}>
    <AuthProviderInner>{children}</AuthProviderInner>
  </ClerkProvider>
);
```

**Replace with**:
```typescript
return (
  <ClerkProvider 
    publishableKey={publishableKey}
    appearance={{
      elements: {
        // Customize Clerk UI to match your theme
        formButtonPrimary: 'bg-swiss-mint hover:bg-swiss-teal text-white',
        card: 'shadow-lg',
      },
    }}
    // Configure paths
    signInUrl="/login"
    signUpUrl="/signup"
    afterSignInUrl="/dashboard"
    afterSignUpUrl="/dashboard"
    // Session persistence
    clerkJSVariant="headless" // Optional: for custom UI
  >
    <AuthProviderInner>{children}</AuthProviderInner>
  </ClerkProvider>
);
```

---

### Fix #10: Add Clerk Route Protection Components

**File**: `frontend/App.tsx`

**Add import** (line 4):
```typescript
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
```

**Wrap ProtectedLayout** (lines 304-322):

**Before**:
```typescript
const App: React.FC = () => {
  return (
    <AppContextProvider>
      <CartProvider>
        <MessagingProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </NotificationProvider>
        </MessagingProvider>
      </CartProvider>
    </AppContextProvider>
  );
};
```

**After**:
```typescript
const App: React.FC = () => {
  return (
    <AppContextProvider>
      <CartProvider>
        <MessagingProvider>
          <NotificationProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
              
              {/* Protected routes */}
              <Route path="/*" element={
                <>
                  <SignedIn>
                    <ProtectedLayout />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              } />
            </Routes>
          </NotificationProvider>
        </MessagingProvider>
      </CartProvider>
    </AppContextProvider>
  );
};
```

---

### Fix #11: Complete Internationalization for Auth Errors

**File**: `packages/translations/locales/en/common.json`

Add missing error translations:
```json
{
  "loginPage": {
    "errorBothFields": "Please enter both email and password",
    "incorrectPassword": "Incorrect password. Please try again.",
    "accountNotFound": "No account found with this email address.",
    "invalidEmail": "Please enter a valid email address.",
    "authServiceNotReady": "Authentication service not ready. Please try again.",
    "twoFactorRequired": "Two-factor authentication required",
    "loginIncomplete": "Login incomplete. Please try again.",
    "socialLoginFailed": "Social login failed. Please try again.",
    "sessionActivationFailed": "Failed to activate session. Please try logging in again."
  },
  "signupPage": {
    "accountExists": "An account with this email already exists",
    "passwordPwned": "This password has been found in a data breach. Please choose a different password",
    "passwordWeak": "Password is not strong enough. Use at least 8 characters with letters and numbers.",
    "signupError": "An error occurred during signup. Please try again.",
    "verificationSent": "Verification code sent to your email",
    "invalidVerificationCode": "Invalid verification code. Please try again.",
    "verificationRequired": "Please verify your email address to continue"
  },
  "errors": {
    "unknown": "An unexpected error occurred. Please try again.",
    "networkError": "Network error. Please check your connection.",
    "serverError": "Server error. Please try again later.",
    "connectionFailed": "Unable to connect to server. Please check your connection and try again."
  }
}
```

Repeat for FR and DE locales.

---

## Additional Recommendations

### 1. Add Loading Spinner Component

Create `frontend/components/ui/LoadingSpinner.tsx`:
```typescript
import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-swiss-mint ${sizeClasses[size]} ${className}`} />
  );
};
```

Use in buttons:
```typescript
<Button type="submit" variant="primary" disabled={isLoading}>
  {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
  {isLoading ? 'Logging in...' : 'Log In'}
</Button>
```

---

### 2. Downgrade React (if needed)

**File**: `frontend/package.json`

```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.0.0",
    "@heroicons/react": "^2.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.6.2",
    // ... other dependencies
  }
}
```

Then run:
```bash
npm install
```

---

### 3. Add Error Boundary

Create `frontend/components/shared/ErrorBoundary.tsx`:
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-swiss-mint text-white rounded-md hover:bg-swiss-teal"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap App in `frontend/index.tsx`:
```typescript
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppWithProviders />
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

## Testing After Fixes

### Manual Testing Checklist

- [ ] Dependencies installed successfully
- [ ] App starts without errors
- [ ] Login with email/password works
- [ ] Logout works and clears session
- [ ] Signup creates new account
- [ ] Email verification flow works (if enabled)
- [ ] Social login with Google works
- [ ] Social login with Facebook works
- [ ] Protected routes redirect to login
- [ ] Role-based access control works
- [ ] Session persists after page refresh
- [ ] Error messages display correctly
- [ ] All translations work (EN, FR, DE)

### Automated Testing

Add E2E tests for authentication flows:

```typescript
// frontend/tests/e2e/auth-full-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should complete full signup and login flow', async ({ page }) => {
    // Test signup
    await page.goto('/signup');
    await page.selectOption('role', 'PARENT');
    await page.fill('input[name="contactPerson"]', 'Test User');
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.check('input[name="termsAccepted"]');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Test logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Sign Out');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
  
  test('should handle login errors correctly', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.text-red-700')).toBeVisible();
  });
});
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All Phase 1 fixes implemented
- [ ] All Phase 2 fixes implemented
- [ ] Dependencies installed
- [ ] .env file created with production keys
- [ ] Clerk publishable key configured
- [ ] API URL configured
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Error handling verified
- [ ] Translations complete
- [ ] Security review completed
- [ ] Backend webhooks configured
- [ ] OAuth providers configured in Clerk
- [ ] Redirect URLs configured
- [ ] Rate limiting enabled
- [ ] Monitoring/logging set up

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready for Implementation
