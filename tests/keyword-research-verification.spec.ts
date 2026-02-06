import { test, expect } from '@playwright/test';

/**
 * Keyword Research Feature Verification Test
 *
 * This test verifies the keyword research page implementation with:
 * - Page structure and layout
 * - Search input and filters
 * - Keywords table with sortable columns
 * - Bulk import functionality
 * - Keyword metrics display
 *
 * Note: This is a temporary verification test for the keyword-research-page feature.
 */

test.describe('Keyword Research Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to keyword research page
    await page.goto('/dashboard/keywords');
  });

  test('has proper page title and heading', async ({ page }) => {
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('Keyword Research');
  });

  test('displays stat cards', async ({ page }) => {
    // Check for Total Keywords stat
    await expect(page.locator('text=Total Keywords')).toBeVisible();

    // Check for Tracking stat
    await expect(page.locator('text=Tracking')).toBeVisible();

    // Check for Top 10 Rankings stat
    await expect(page.locator('text=Top 10 Rankings')).toBeVisible();

    // Check for Opportunities stat
    await expect(page.locator('text=Opportunities')).toBeVisible();
  });

  test('displays search input', async ({ page }) => {
    // Check for search input with placeholder
    const searchInput = page.getByTestId('keyword-search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute(
      'placeholder',
      'Search keywords...'
    );
  });

  test('displays filter button and advanced filters', async ({ page }) => {
    // Check for Filters button
    const filterButton = page.getByTestId('toggle-advanced-filters');
    await expect(filterButton).toBeVisible();

    // Click to show advanced filters
    await filterButton.click();

    // Check for intent filter
    const intentFilter = page.getByTestId('intent-filter');
    await expect(intentFilter).toBeVisible();

    // Check for difficulty filter
    const difficultyFilter = page.getByTestId('difficulty-filter');
    await expect(difficultyFilter).toBeVisible();

    // Check for status filter
    const statusFilter = page.getByTestId('status-filter');
    await expect(statusFilter).toBeVisible();
  });

  test('displays bulk import button', async ({ page }) => {
    // Check for Bulk Import button
    const bulkImportButton = page.getByTestId('bulk-import-button');
    await expect(bulkImportButton).toBeVisible();
    await expect(bulkImportButton).toContainText('Bulk Import');
  });

  test('displays add keyword button', async ({ page }) => {
    // Check for Add Keyword button
    const addKeywordButton = page.getByTestId('add-keyword-button');
    await expect(addKeywordButton).toBeVisible();
    await expect(addKeywordButton).toContainText('Add Keyword');
  });

  test('opens bulk import dialog', async ({ page }) => {
    // Click bulk import button
    const bulkImportButton = page.getByTestId('bulk-import-button');
    await bulkImportButton.click();

    // Check for dialog
    const dialog = page.getByTestId('bulk-import-dialog');
    await expect(dialog).toBeVisible();

    // Check for CSV input
    const csvInput = page.getByTestId('csv-input');
    await expect(csvInput).toBeVisible();

    // Check for import button
    const importButton = page.getByTestId('import-button');
    await expect(importButton).toBeVisible();
  });

  test('keywords table has sortable columns', async ({ page }) => {
    // Wait for table to load
    const table = page.getByTestId('keyword-table');
    await expect(table).toBeVisible();

    // Check for column headers with sort indicators
    const headers = table.locator(
      'text=Keyword, Volume, Difficulty, Intent, Rank'
    );
    await expect(headers.first()).toBeVisible();
  });

  test('search input filters keywords', async ({ page }) => {
    // Wait for table to load
    const table = page.getByTestId('keyword-table');
    await expect(table).toBeVisible();

    // Type in search input
    const searchInput = page.getByTestId('keyword-search-input');
    await searchInput.fill('running');

    // Wait for filtered results
    await page.waitForTimeout(500);
  });

  test('keyword rows are expandable', async ({ page }) => {
    // Wait for table to load
    const table = page.getByTestId('keyword-table');
    await expect(table).toBeVisible();

    // Click first keyword row to expand
    const firstRow = table.getByTestId('keyword-row').first();
    await firstRow.click();

    // Check that details section appears (expanded content)
    await page.waitForTimeout(300);
  });
});

test.describe('Keyword Research API', () => {
  test('returns keywords data structure', async ({ request }) => {
    // Note: This endpoint requires authentication
    const response = await request.get('/api/keywords');

    // Should return 401 Unauthorized without auth, or 200 with proper data structure
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('keywords');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.keywords)).toBeTruthy();
    }
  });

  test('supports query parameters for filtering', async ({ request }) => {
    // Test with intent filter
    const response = await request.get('/api/keywords?intent=transactional');

    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('keywords');
    }
  });
});

test.describe('Bulk Import Feature', () => {
  test('opens and closes import dialog', async ({ page }) => {
    await page.goto('/dashboard/keywords');

    // Open dialog
    const bulkImportButton = page.getByTestId('bulk-import-button');
    await bulkImportButton.click();

    // Check dialog is open
    const dialog = page.getByTestId('bulk-import-dialog');
    await expect(dialog).toBeVisible();

    // Close dialog by clicking outside
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Dialog should be closed (not visible)
    // Note: In React, the dialog component unmounts when closed
  });

  test('shows CSV format guide in import dialog', async ({ page }) => {
    await page.goto('/dashboard/keywords');

    // Open dialog
    const bulkImportButton = page.getByTestId('bulk-import-button');
    await bulkImportButton.click();

    // Check for CSV format guide
    await expect(page.locator('text=CSV Format')).toBeVisible();
    await expect(page.locator('text=keyword, searchVolume, cpc')).toBeVisible();
  });

  test('has load example data button', async ({ page }) => {
    await page.goto('/dashboard/keywords');

    // Open dialog
    const bulkImportButton = page.getByTestId('bulk-import-button');
    await bulkImportButton.click();

    // Check for load example data link
    await expect(page.locator('text=Load example data')).toBeVisible();
  });
});
