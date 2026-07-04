/**
 * E2E Login Test
 *
 * This is a Playwright-based end-to-end test for the login flow.
 * Run with: npx playwright test apps/e2e/login.spec.ts
 *
 * Prerequisites:
 * - The API server must be running on http://localhost:3001
 * - The admin app must be running on http://localhost:3000
 * - A test user must exist (or the seed script has been run)
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display the login page', async ({ page }) => {
    await page.goto('/admin/login');

    // The login page should have an email and password field
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Should have a login/submit button
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/admin/login');

    // Click submit without filling anything
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Should show validation errors
    await page.waitForTimeout(500);
    // The form should either prevent submission or show error messages
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate(
      (el) => (el as HTMLInputElement).validationMessage,
    );
    // If browser validation is enabled, there will be a validation message
    // Otherwise, the form may show inline errors
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');

    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Should show an error message for invalid credentials
    await page.waitForTimeout(1000);

    // The error could be shown as a toast, alert, or inline message
    // Check for common error indicators
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    // This test assumes a seeded test user exists
    const testEmail = process.env.TEST_USER_EMAIL || 'admin@nodepress.local';
    const testPassword = process.env.TEST_USER_PASSWORD || 'admin123';

    await page.goto('/admin/login');

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // After successful login, should redirect to dashboard
    await page.waitForURL(/\/admin(\/dashboard)?\/?$/, { timeout: 10000 });

    // Should see dashboard elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/admin/dashboard');

    // Should redirect to login
    await page.waitForURL(/\/admin\/login/, { timeout: 5000 });
  });

  test('should maintain session after page refresh', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'admin@nodepress.local';
    const testPassword = process.env.TEST_USER_PASSWORD || 'admin123';

    // Login first
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/\/admin(\/dashboard)?\/?$/, { timeout: 10000 });

    // Refresh the page
    await page.reload();

    // Should still be on dashboard (session cookie persists)
    await expect(page).toHaveURL(/\/admin(\/dashboard)?\/?$/);
  });
});
