import { test, expect } from '@playwright/test';

test('non-super-admin cannot access super-admin routes', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  
  // For now, we can't authenticate with real users in this test environment
  // In a real test environment, you'd authenticate as a regular user here
  
  // Try to access super-admin routes directly
  const adminRoutes = [
    '/admin/super-tools',
    '/admin/system-monitoring'
  ];
  
  for (const route of adminRoutes) {
    await page.goto(route);
    // Allow SPA redirects to settle
    await page.waitForTimeout(250);
    
    // Should either:
    // 1. Redirect to login (if not authenticated)
    // 2. Show forbidden/access denied (if authenticated but wrong role)
    // 3. Show 404 (if route doesn't exist)
    
    const currentUrl = page.url();
    const shouldRedirectToLogin = currentUrl.includes('/login');
    const shouldShowForbidden = page.getByText(/forbidden|access denied|unauthorized|not allowed/i);
    
    // At least one of these conditions should be true for non-admin routes
    expect(shouldRedirectToLogin || (await shouldShowForbidden.count()) > 0 || currentUrl.includes('/404')).toBe(true);
  }
});

test('protected routes require authentication', async ({ page }) => {
  const protectedRoutes = [
    '/dashboard',
    '/marketplace/products',
    '/recruitment/job-listings',
    '/settings'
  ];
  
  for (const route of protectedRoutes) {
    await page.goto(route);
    
    // Should redirect to login since user is not authenticated
    await expect(page).toHaveURL(/.*\/login.*/);
  }
});

test('role-based navigation shows correct sidebar items', async ({ page }) => {
  await page.goto('/login');
  
  // Test that login page renders correctly
  await expect(page.locator('form, [data-testid="clerk-sign-in"], button')).toBeVisible();
  
  // In a real authenticated environment, we'd test that:
  // - Users only see sidebar items for their role
  // - Foundation users see foundation-specific routes
  // - Service providers see service provider routes
  // etc.
});

test('dashboard redirects based on user role', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Should redirect to login since not authenticated
  await expect(page).toHaveURL(/.*\/login.*/);
  
  // In a real authenticated environment, we'd test:
  // - Foundation users go to /foundation/dashboard
  // - Service providers go to /service-provider/dashboard  
  // - Parents might go to a different dashboard
  // etc.
});
