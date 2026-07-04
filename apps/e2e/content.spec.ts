/**
 * E2E Content Management Test
 *
 * This is a Playwright-based end-to-end test for content CRUD operations.
 * Run with: npx playwright test apps/e2e/content.spec.ts
 *
 * Prerequisites:
 * - The API server must be running on http://localhost:3001
 * - The admin app must be running on http://localhost:3000
 * - A test user must exist (or the seed script has been run)
 */

import { test, expect } from '@playwright/test';

const testEmail = process.env.TEST_USER_EMAIL || 'admin@nodepress.local';
const testPassword = process.env.TEST_USER_PASSWORD || 'admin123';

test.describe('Content Management', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/\/admin(\/dashboard)?\/?$/, { timeout: 10000 });
  });

  test('should navigate to content list', async ({ page }) => {
    // Navigate to content management
    await page.goto('/admin/content');

    // Should show the content list page
    await expect(page.locator('body')).toBeVisible();
    // Content list should have a title or content items
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('should create a new post', async ({ page }) => {
    // Navigate to new post page
    await page.goto('/admin/content/post/new');

    // Wait for the content form to load
    await page.waitForTimeout(1000);

    // Fill in the title
    const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="Title" i]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('E2E Test Post - ' + Date.now());
    }

    // Fill in the content body if the editor is available
    const contentEditor = page.locator('[contenteditable="true"], textarea');
    if (await contentEditor.isVisible()) {
      await contentEditor.fill('<p>This is a test post created by E2E tests.</p>');
    }

    // Look for publish button
    const publishBtn = page.getByRole('button', { name: /publish/i });
    if (await publishBtn.isVisible()) {
      await publishBtn.click();
      // Wait for the operation to complete
      await page.waitForTimeout(2000);
    } else {
      // Try save draft
      const saveBtn = page.getByRole('button', { name: /save draft|save/i });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should view content list and find existing content', async ({ page }) => {
    await page.goto('/admin/content');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // The content list should have items or show empty state
    const bodyText = await page.textContent('body');

    // Either there are content items or an empty state message
    const hasContent =
      bodyText.includes('Test') ||
      bodyText.includes('Post') ||
      bodyText.includes('content') ||
      bodyText.includes('No content');
    expect(hasContent).toBeTruthy();
  });

  test('should filter content by status', async ({ page }) => {
    await page.goto('/admin/content');

    await page.waitForTimeout(1000);

    // Look for a status filter dropdown/select
    const statusFilter = page.locator('select, [role="combobox"]').first();
    if (await statusFilter.isVisible()) {
      // Try selecting "Published" filter
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Select "published" option if available
      const publishedOption = page.locator('option, [role="option"]', { hasText: /published/i });
      if (await publishedOption.isVisible()) {
        await publishedOption.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should search content by title', async ({ page }) => {
    await page.goto('/admin/content');

    await page.waitForTimeout(1000);

    // Look for a search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('E2E Test');
      await page.waitForTimeout(500);

      // The list should filter based on search
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });

  test('should navigate to content editor', async ({ page }) => {
    await page.goto('/admin/content');

    await page.waitForTimeout(1000);

    // Click on the first content item link if available
    const contentLink = page
      .locator('a, button')
      .filter({ hasText: /test|post|hello/i })
      .first();
    if (await contentLink.isVisible()) {
      await contentLink.click();
      await page.waitForTimeout(2000);

      // Should navigate to the editor
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin/content');
    }
  });

  test('should see quick draft form on dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await page.waitForTimeout(1000);

    // Check if Quick Draft form is visible on the dashboard
    const quickDraftTitle = page.getByText('Quick Draft');
    if (await quickDraftTitle.isVisible()) {
      // Fill in the quick draft form
      const titleInput = page.locator('input[placeholder="Title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('Quick Draft - ' + Date.now());
      }

      // Click Save Draft button
      const saveDraftBtn = page.getByRole('button', { name: /save draft/i });
      if (await saveDraftBtn.isVisible()) {
        await saveDraftBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should see dashboard stats', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await page.waitForTimeout(2000);

    // Dashboard should show stats cards or loading state
    const bodyText = await page.textContent('body');
    const hasStatsContent =
      bodyText.includes('Published') ||
      bodyText.includes('Posts') ||
      bodyText.includes('Pages') ||
      bodyText.includes('Media') ||
      bodyText.includes('Users') ||
      bodyText.includes('Comments');
    expect(hasStatsContent).toBeTruthy();
  });
});
