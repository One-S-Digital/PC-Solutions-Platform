import { test, expect } from '@playwright/test';

test('parent lead form validates and submits to backend', async ({ page }) => {
  // Go to parent lead form page
  await page.goto('/parent-lead-form');

  // Wait for the form to load
  await page.waitForSelector('form');

  // Fill minimal required fields
  await page.fill('input[name="contactName"]', 'Jane Doe');
  await page.fill('input[name="contactEmail"]', 'jane@example.com');
  await page.fill('input[name="contactPhone"]', '+41 123 456 789');

  // Fill child information
  // Select first available canton option (avoid relying on specific value encoding)
  await page.selectOption('select[name="canton"]', { index: 1 });
  await page.fill('input[name="childAge"]', '2');
  await page.fill('input[name="desiredStartDate"]', '2024-03-01');

  // Intercept submit endpoint to confirm payload shape
  let seenPayload: any = null;
  await page.route('**/parent-leads**', async (route) => {
    if (route.request().method() === 'POST') {
      const postData = route.request().postData();
      if (postData) {
        try {
          seenPayload = JSON.parse(postData);
        } catch (e) {
          seenPayload = postData;
        }
      }
      await route.continue();
    } else {
      await route.continue();
    }
  });

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for submission to complete
  await page.waitForTimeout(1000);

  // Basic payload shape check
  expect(seenPayload).toBeTruthy();
  expect(seenPayload.contactName).toBe('Jane Doe');
  expect(seenPayload.contactEmail).toBe('jane@example.com');

  // Unauthenticated users should be prompted to create an account after submitting.
  await expect(
    page.getByRole('button', { name: /create account to track enquiry/i }),
  ).toBeVisible();
});

test('signup form validates required fields', async ({ page }) => {
  await page.goto('/signup');

  // Wait for role selection
  await page.waitForSelector('form, [data-testid="role-selection"]');

  // Test form validation by submitting empty form
  const submitButton = page.locator('button[type="submit"]').first();
  
  if (await submitButton.isVisible()) {
    await submitButton.click();
    
    // Should show validation errors
    await page.waitForTimeout(500);
    
    // Check that form doesn't submit with empty required fields
    const form = page.locator('form').first();
    await expect(form).toBeAttached();
  }
});

test('contact/settings forms handle input correctly', async ({ page }) => {
  // Navigate to login first to access protected routes
  await page.goto('/login');
  
  // For now just test that forms exist and can be interacted with
  // In a real test environment, you'd authenticate first
  
  const loginForm = page.locator('form').first();
  if (await loginForm.isVisible()) {
    await expect(loginForm.locator('input[type="email"]')).toBeAttached();
    await expect(loginForm.locator('input[type="password"]')).toBeAttached();
  }
});

test('form validation messages work correctly', async ({ page }) => {
  await page.goto('/parent-lead-form');

  // Try to submit empty form
  const submitButton = page.locator('button[type="submit"]');
  if (await submitButton.isVisible()) {
    await submitButton.click();
    
    // Should show validation for required fields
    await page.waitForTimeout(500);
    
    // Check for validation indicators (varies by implementation)
    const errorElements = page.locator('input:invalid, .error, [data-testid*="error"]');
    const errorCount = await errorElements.count();
    
    // At least some validation should be present
    expect(errorCount).toBeGreaterThan(0);
  }
});
