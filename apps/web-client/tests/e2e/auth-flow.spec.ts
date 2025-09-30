import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should show login form with all required elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check for required form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for links to other pages
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
    await expect(page.locator('a[href="/pricing"]')).toBeVisible();
    await expect(page.locator('a[href="/parent-lead-form"]')).toBeVisible();
  });

  test('should navigate to pricing page from login', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/pricing"]');
    await expect(page).toHaveURL('/pricing');
  });

  test('should navigate to signup page from login', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/signup"]');
    await expect(page).toHaveURL('/signup');
  });

  test('should navigate to parent lead form from login', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/parent-lead-form"]');
    await expect(page).toHaveURL('/parent-lead-form');
  });
});