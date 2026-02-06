/**
 * Temporary Verification Test
 *
 * This test verifies that:
 * 1. Playwright is properly installed
 * 2. Test fixtures can be imported
 * 3. Test utilities work correctly
 * 4. Mock data is accessible
 *
 * DELETE THIS TEST AFTER VERIFICATION
 */

import { test, expect } from '@playwright/test';
import { createTestHelpers } from './utils/test-helpers';
import { MockUsers, randomTestString } from './mocks/test-data';

test.describe('Playwright Setup Verification', () => {
  test('verify test helpers can be imported and used', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Verify helper methods exist
    expect(typeof helpers.navigateAndWait).toBe('function');
    expect(typeof helpers.waitForVisible).toBe('function');
    expect(typeof helpers.clearStorage).toBe('function');
  });

  test('verify mock data can be imported', async () => {
    // Verify mock data is accessible
    expect(MockUsers.standard.email).toBe('test@example.com');
    expect(MockUsers.standard.password).toBe('TestPassword123!');

    // Verify utility functions work
    const randomString = randomTestString('verify');
    expect(randomString).toContain('verify-');
  });

  test('verify page navigation works', async ({ page }) => {
    await page.goto('/');

    // Page should load
    const url = page.url();
    expect(url).toContain('localhost');
  });

  test('verify test helper functions work', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Test clearStorage
    await helpers.clearStorage();

    // Test evaluate
    const testValue = await helpers.evaluate(() => 'test-value');
    expect(testValue).toBe('test-value');

    // Test getUrl
    await page.goto('/about');
    const url = helpers.getUrl();
    expect(url).toContain('/about');
  });

  test('verify screenshot on failure works', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Just verify the method exists - we don't want to actually fail
    expect(typeof helpers.screenshotOnFailure).toBe('function');
  });

  test('verify API handler can be created', async ({ page }) => {
    const { createApiHandlers } = await import('./mocks/api-handlers');

    const handlers = createApiHandlers(page);
    expect(typeof handlers.mockGet).toBe('function');
    expect(typeof handlers.mockPost).toBe('function');
    expect(typeof handlers.mockError).toBe('function');
  });

  test('verify mock API works', async ({ page }) => {
    const { createApiHandlers } = await import('./mocks/api-handlers');

    const handlers = createApiHandlers(page);

    // Mock a test endpoint
    handlers.mockGet('/api/test', { message: 'Test response' });

    // Navigate and verify mock is active
    await page.goto('/');

    // The mock should be registered (we can't easily test it without a real page calling it)
    expect(handlers).toBeTruthy();
  });
});

test.describe('Test Infrastructure Verification', () => {
  test('verify all test directories exist', async ({}) => {
    const fs = await import('fs');
    const path = await import('path');

    const dirs = ['fixtures', 'utils', 'mocks'];
    const testDir = path.join(process.cwd(), 'tests');

    for (const dir of dirs) {
      const dirPath = path.join(testDir, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    }
  });

  test('verify test files are present', async ({}) => {
    const expectedFiles = [
      'tests/utils/test-helpers.ts',
      'tests/utils/selectors.ts',
      'tests/mocks/test-data.ts',
      'tests/mocks/api-handlers.ts',
      'tests/fixtures/auth.fixture.ts',
      'tests/fixtures/supabase.fixture.ts',
      'tests/global-setup.ts',
      'tests/global-teardown.ts',
    ];

    const fs = await import('fs');
    const path = await import('path');

    for (const file of expectedFiles) {
      const filePath = path.join(process.cwd(), file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});

test.describe('Playwright Browser Capabilities', () => {
  test('verify browser context methods', async ({ page, context }) => {
    // Verify browser context is available
    expect(context).toBeTruthy();
    expect(page).toBeTruthy();

    // Verify cookies can be accessed
    const cookies = await context.cookies();
    expect(Array.isArray(cookies)).toBe(true);
  });

  test('verify page evaluation works', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(typeof title).toBe('string');

    const url = page.url();
    expect(typeof url).toBe('string');
  });

  test('verify locator methods work', async ({ page }) => {
    await page.goto('/');

    // Count elements on page
    const buttonCount = await page.locator('button').count();
    expect(typeof buttonCount).toBe('number');

    const linkCount = await page.locator('a').count();
    expect(typeof linkCount).toBe('number');
  });
});
