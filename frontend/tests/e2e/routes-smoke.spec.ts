import { test, expect } from '@playwright/test';

const routes = [
  '/',                 // Home - redirects to dashboard
  '/login',            // Login
  '/signup',           // Signup
  '/pricing',          // Pricing page
  '/parent-lead-form', // Parent lead form
  '/dashboard',        // Dashboard (requires auth)
];

for (const path of routes) {
  test(`route loads without console errors: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    
    await page.goto(path, { waitUntil: 'networkidle' });
    
    // For protected routes, we expect redirect to login, which is normal
    if (path === '/dashboard') {
      // Should redirect to login since user is not authenticated
      await expect(page).toHaveURL(/.*\/login.*/);
    } else {
      // Should load without errors
      await expect.poll(() => errors.length, { message: errors.join('\n') }).toBe(0);
    }
  });
}
