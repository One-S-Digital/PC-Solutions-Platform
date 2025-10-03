import { test, expect } from '@playwright/test';

test('login shows link to plans and no demo login', async ({ page }) => {
  await page.goto('/login');
  
  // Check that login page loads without errors
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  
  await page.waitForTimeout(1000);
  await expect.poll(() => errors.length, { message: errors.join('\n') }).toBe(0);
  
  // Check for pricing/plans link
  const plansLink = page.getByRole('link', { name: /plans|pricing/i });
  const plansLinkExists = await plansLink.count() > 0;
  
  // Should have a link to pricing (either explicit plans link or within text)
  if (!plansLinkExists) {
    // Check for pricing in text content
    const pageContent = await page.textContent('body');
    const hasPricingReference = pageContent?.toLowerCase().includes('pricing') || 
                               pageContent?.toLowerCase().includes('plans') ||
                               pageContent?.toLowerCase().includes('tarifs');
    expect(hasPricingReference).toBe(true);
  }
  
  // Ensure no demo/testing login elements exist
  await expect(page.locator('[data-testid="demo-login"]')).toHaveCount(0);
  await expect(page.getByText(/demo account/i)).toHaveCount(0);
  await expect(page.getByText(/test user/i)).toHaveCount(0);
  await expect(page.getByText(/skip.*login/i)).toHaveCount(0);
});

test('login form elements are present', async ({ page }) => {
  await page.goto('/login');
  
  // Check for common login elements
  const formExists = await page.locator('form').count() > 0;
  const clerkSignIn = await page.locator('[data-testid="clerk-sign-in"]').count() > 0;
  const authButtons = await page.locator('button[type="submit"], input[type="submit"]').count() > 0;
  
  // Should have at least one authentication mechanism
  expect(formExists || clerkSignIn || authButtons).toBe(true);
});

test('login page has proper branding and messaging', async ({ page }) => {
  await page.goto('/login');
  
  // Check for main headings/titles
  const headings = page.locator('h1, h2, h3');
  const headingCount = await headings.count();
  expect(headingCount).toBeGreaterThan(0);
  
  // Check for app name or branding
  const pageContent = await page.textContent('body');
  const hasBranding = pageContent && (
    pageContent.includes('PC-Solutions') ||
    pageContent.includes('Pro-crèche') ||
    pageContent.includes('sign in') ||
    pageContent.includes('connexion')
  );
  expect(hasBranding).toBe(true);
});

test('signup link redirects to signup page', async ({ page }) => {
  await page.goto('/login');
  
  // Look for signup links/buttons
  const signupLinks = page.getByRole('link', { name: /sign up|signup|register|s'inscrire/i });
  const signupButtons = page.getByRole('button', { name: /sign up|signup|register/i });
  
  const hasSignupLink = await signupLinks.count() > 0;
  const hasSignupButton = await signupButtons.count() > 0;
  
  if (hasSignupLink) {
    const firstSignupLink = signupLinks.first();
    const href = await firstSignupLink.getAttribute('href');
    expect(href).toContain('/signup');
  }
  
  if (hasSignupButton) {
    await signupButtons.first().click();
    await expect(page).toHaveURL(/.*\/signup.*/);
  }
});

test('forgot password link exists if applicable', async ({ page }) => {
  await page.goto('/login');
  
  // Look for forgot password/reset password links
  const forgotLinks = page.getByText(/forgot.*password|reset.*password|mot.*passe.*oublié/i);
  const forgotLinkCount = await forgotLinks.count();
  
  // Should have some form of password recovery (may or may not be present)
  // This is more of a presence check rather than a requirement
  const hasPasswordRecovery = forgotLinkCount > 0;
  
  // If it exists, it should be a clickable link
  if (hasPasswordRecovery) {
    const forgotPasswordElement = forgotLinks.first();
    const tagName = await forgotPasswordElement.evaluate(el => el.tagName.toLowerCase());
    expect(['a', 'button']).toContain(tagName);
  }
});
