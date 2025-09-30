import { test, expect } from '@playwright/test';

// Visual regression tests for all mock routes
// These tests ensure pixel-perfect parity with the design mock

test.describe('Visual Regression Tests', () => {
  // Test at desktop resolution (1440x900)
  test.describe('Desktop (1440x900)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('Login page visual parity', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveScreenshot('login-desktop.png', {
        threshold: 0.5, // 0.5% threshold
        maxDiffPixels: 2, // Max 2 pixels difference
      });
    });

    test('Pricing page visual parity', async ({ page }) => {
      await page.goto('/pricing');
      await expect(page).toHaveScreenshot('pricing-desktop.png', {
        threshold: 0.5,
        maxDiffPixels: 2,
      });
    });

    test('Signup page visual parity', async ({ page }) => {
      await page.goto('/signup');
      await expect(page).toHaveScreenshot('signup-desktop.png', {
        threshold: 0.5,
        maxDiffPixels: 2,
      });
    });

    test('Parent lead form visual parity', async ({ page }) => {
      await page.goto('/parent-lead-form');
      await expect(page).toHaveScreenshot('parent-lead-form-desktop.png', {
        threshold: 0.5,
        maxDiffPixels: 2,
      });
    });
  });

  // Test at mobile resolution (390x844)
  test.describe('Mobile (390x844)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('Login page mobile visual parity', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveScreenshot('login-mobile.png', {
        threshold: 0.5,
        maxDiffPixels: 2,
      });
    });

    test('Pricing page mobile visual parity', async ({ page }) => {
      await page.goto('/pricing');
      await expect(page).toHaveScreenshot('pricing-mobile.png', {
        threshold: 0.5,
        maxDiffPixels: 2,
      });
    });

    test('Signup page mobile visual parity', async ({ page }) => {
      await page.goto('/signup');
      await expect(page).toHaveScreenshot('signup-mobile.png', {
        threshold: 0.5,
        maxDiffPixels: 2,
      });
    });

    test('Parent lead form mobile visual parity', async ({ page }) => {
      await page.goto('/parent-lead-form');
      await expect(page).toHaveScreenshot('parent-lead-form-mobile.png', {
        threshold: 0.5,
        maxDiffPixels: 2,
      });
    });
  });
});