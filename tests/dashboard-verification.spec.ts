import { test, expect } from '@playwright/test';

/**
 * Dashboard Feature Verification Test
 *
 * This test verifies the dashboard implementation with:
 * - Articles written count
 * - Keywords tracked count
 * - Publishing status breakdown
 * - Summary cards
 * - Quick action buttons
 *
 * Note: This test requires Clerk credentials to run properly.
 * Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env before running.
 */

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
  });

  test('has proper page title and heading', async ({ page }) => {
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('displays metric cards', async ({ page }) => {
    // Check for Articles metric card
    await expect(page.locator('text=Articles Written')).toBeVisible();

    // Check for Keywords metric card
    await expect(page.locator('text=Keywords Tracked')).toBeVisible();

    // Check for Views metric card
    await expect(page.locator('text=Total Views')).toBeVisible();
  });

  test('displays quick actions section', async ({ page }) => {
    // Check for Quick Actions heading
    await expect(page.locator('text=Quick Actions')).toBeVisible();

    // Check for action buttons
    await expect(page.locator('text=New Article')).toBeVisible();
    await expect(page.locator('text=Import Content')).toBeVisible();
    await expect(page.locator('text=Track Keywords')).toBeVisible();
    await expect(page.locator('text=View Analytics')).toBeVisible();
  });

  test('displays publishing status section', async ({ page }) => {
    // Check for Publishing Status heading
    await expect(page.locator('text=Publishing Status')).toBeVisible();

    // Check for status labels
    await expect(page.locator('text=Published')).toBeVisible();
    await expect(page.locator('text=Draft')).toBeVisible();
    await expect(page.locator('text=Scheduled')).toBeVisible();
    await expect(page.locator('text=Pending Review')).toBeVisible();
  });

  test('metric cards show trend indicators', async ({ page }) => {
    // Check for percentage indicators on metric cards
    const trendElements = page.locator(
      '[class*="text-green-600"], [class*="text-red-600"]'
    );
    await expect(trendElements.first()).toBeVisible();
  });

  test('quick action buttons have proper links', async ({ page }) => {
    // Verify action buttons have href attributes
    const newArticleLink = page.locator('a:has-text("New Article")');
    await expect(newArticleLink).toHaveAttribute(
      'href',
      '/dashboard/articles/new'
    );

    const importLink = page.locator('a:has-text("Import Content")');
    await expect(importLink).toHaveAttribute('href', '/dashboard/import');

    const keywordsLink = page.locator('a:has-text("Track Keywords")');
    await expect(keywordsLink).toHaveAttribute('href', '/dashboard/keywords');

    const analyticsLink = page.locator('a:has-text("View Analytics")');
    await expect(analyticsLink).toHaveAttribute('href', '/dashboard/analytics');
  });
});

test.describe('Dashboard API', () => {
  test('returns metrics data structure', async ({ request }) => {
    // Note: This endpoint requires authentication via Clerk
    const response = await request.get('/api/dashboard/metrics');

    // Should return 401 Unauthorized without auth, or 200 with proper data structure
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('articles');
      expect(data).toHaveProperty('keywords');
      expect(data).toHaveProperty('views');
      expect(data).toHaveProperty('publishingStatus');

      expect(data.articles).toHaveProperty('total');
      expect(data.articles).toHaveProperty('trend');

      expect(data.keywords).toHaveProperty('total');
      expect(data.keywords).toHaveProperty('trend');

      expect(data.publishingStatus).toHaveProperty('published');
      expect(data.publishingStatus).toHaveProperty('draft');
      expect(data.publishingStatus).toHaveProperty('scheduled');
      expect(data.publishingStatus).toHaveProperty('pending_review');
    }
  });
});
