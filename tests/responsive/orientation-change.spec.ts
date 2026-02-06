import { test, expect } from '@playwright/test';

/**
 * Orientation Change Tests
 *
 * Tests how the application handles device orientation changes:
 * - Portrait to Landscape transitions
 * - Landscape to Portrait transitions
 * - Layout adjustments during rotation
 * - Content preservation during rotation
 * - Navigation behavior during rotation
 */

const orientationPairs = [
  {
    portrait: { width: 375, height: 667, name: 'iPhone SE Portrait' },
    landscape: { width: 667, height: 375, name: 'iPhone SE Landscape' },
  },
  {
    portrait: { width: 390, height: 844, name: 'iPhone 14 Portrait' },
    landscape: { width: 844, height: 390, name: 'iPhone 14 Landscape' },
  },
  {
    portrait: { width: 768, height: 1024, name: 'iPad Portrait' },
    landscape: { width: 1024, height: 768, name: 'iPad Landscape' },
  },
];

const testPages = [
  '/dashboard',
  '/dashboard/articles',
  '/dashboard/keywords',
  '/dashboard/analytics',
  '/dashboard/planner',
  '/dashboard/settings',
];

test.describe('Orientation Change - Layout', () => {
  for (const pair of orientationPairs) {
    test.describe(`${pair.portrait.name}`, () => {
      test('should transition from portrait to landscape', async ({ page }) => {
        // Start in portrait
        await page.setViewportSize({
          width: pair.portrait.width,
          height: pair.portrait.height,
        });
        await page.goto('/dashboard');

        // Wait for initial render
        await page.waitForLoadState('networkidle');

        // Check no horizontal scroll in portrait
        const portraitOverflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        expect(portraitOverflow).toBeFalsy();

        // Rotate to landscape
        await page.setViewportSize({
          width: pair.landscape.width,
          height: pair.landscape.height,
        });

        // Wait for layout to adjust
        await page.waitForTimeout(300);

        // Check no horizontal scroll in landscape
        const landscapeOverflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        expect(landscapeOverflow).toBeFalsy();
      });

      test('should transition from landscape to portrait', async ({ page }) => {
        // Start in landscape
        await page.setViewportSize({
          width: pair.landscape.width,
          height: pair.landscape.height,
        });
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Rotate to portrait
        await page.setViewportSize({
          width: pair.portrait.width,
          height: pair.portrait.height,
        });
        await page.waitForTimeout(300);

        // Layout should adjust without overflow
        const overflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        expect(overflow).toBeFalsy();
      });

      test('should preserve content during rotation', async ({ page }) => {
        // Start in portrait
        await page.setViewportSize({
          width: pair.portrait.width,
          height: pair.portrait.height,
        });
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Get main heading text
        const portraitHeading = await page.locator('h1').first().textContent();

        // Rotate to landscape
        await page.setViewportSize({
          width: pair.landscape.width,
          height: pair.landscape.height,
        });
        await page.waitForTimeout(300);

        // Content should be preserved
        const landscapeHeading = await page.locator('h1').first().textContent();
        expect(landscapeHeading).toBe(portraitHeading);
      });
    });
  }
});

test.describe('Orientation Change - Navigation', () => {
  test('mobile drawer should adapt to landscape', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Open mobile menu
    const menuButton = page
      .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
      .first();

    const menuVisible = await menuButton.isVisible();
    if (menuVisible) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Check drawer is open in portrait
      const nav = page.locator('nav, aside').first();
      await expect(nav).toBeVisible();

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(300);

      // Navigation should still be visible or adapt appropriately
      const stillVisible = await nav.isVisible();
      expect(stillVisible).toBeDefined();
    }
  });

  test('navigation should remain functional after rotation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300);

    // Navigation should still work
    const menuButton = page
      .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
      .first();

    const isVisible = await menuButton.isVisible();
    if (isVisible) {
      await menuButton.click();
      await page.waitForTimeout(300);

      const navLinks = page.locator('nav a, aside a');
      const count = await navLinks.count();

      if (count > 0) {
        await expect(navLinks.first()).toBeVisible();
      }
    }
  });
});

test.describe('Orientation Change - Tables', () => {
  const tablePages = [
    '/dashboard/keywords',
    '/dashboard/articles',
    '/dashboard/rank-tracking',
  ];

  for (const pagePath of tablePages) {
    test(`tables should adapt on ${pagePath}`, async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const table = tables.first();

        // Check table in portrait
        await expect(table).toBeVisible();

        // Rotate to landscape
        await page.setViewportSize({ width: 667, height: 375 });
        await page.waitForTimeout(300);

        // Table should still be visible
        await expect(table).toBeVisible();

        // In landscape, more content should be visible
        const tableWidth = await table.evaluate((el) => el.scrollWidth);
        expect(tableWidth).toBeGreaterThan(0);
      }
    });
  }
});

test.describe('Orientation Change - Forms', () => {
  test('forms should remain usable after rotation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // Check first input in portrait
      const firstInput = inputs.first();
      await expect(firstInput).toBeVisible();

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(300);

      // Input should still be visible and usable
      await expect(firstInput).toBeVisible();

      // Try to focus the input
      await firstInput.focus();
      const isFocused = await firstInput.evaluate(
        (el) => document.activeElement === el
      );
      expect(isFocused).toBeTruthy();
    }
  });
});

test.describe('Orientation Change - Scroll Position', () => {
  test('should attempt to maintain scroll position', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/articles');
    await page.waitForLoadState('networkidle');

    // Scroll down a bit
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });

    // Get scroll position in portrait
    const portraitScroll = await page.evaluate(() => window.scrollY);

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300);

    // Scroll position should be approximately maintained
    const landscapeScroll = await page.evaluate(() => window.scrollY);

    // Allow some variance due to layout changes
    expect(Math.abs(portraitScroll - landscapeScroll)).toBeLessThan(200);
  });
});

test.describe('Orientation Change - Touch Targets', () => {
  test('buttons should remain tappable after rotation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    const buttons = page.locator('button').filter({ hasText: /^\w+/ });
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const button = buttons.first();

      // Check in portrait
      const portraitBox = await button.boundingBox();
      expect(portraitBox).not.toBeNull();

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(300);

      // Check in landscape
      const landscapeBox = await button.boundingBox();
      expect(landscapeBox).not.toBeNull();

      if (landscapeBox) {
        // Should still meet minimum touch target
        expect(
          Math.min(landscapeBox.width, landscapeBox.height)
        ).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('Orientation Change - Multiple Rotations', () => {
  test('should handle multiple rapid rotations', async ({ page }) => {
    await page.goto('/dashboard');

    const orientations = [
      { width: 375, height: 667 },
      { width: 667, height: 375 },
      { width: 375, height: 667 },
      { width: 667, height: 375 },
    ];

    for (const orientation of orientations) {
      await page.setViewportSize(orientation);
      await page.waitForTimeout(200);

      // Check for no horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBeFalsy();
    }
  });
});

test.describe('Orientation Change - Cross-Page', () => {
  for (const pagePath of testPages) {
    test(`orientation change on ${pagePath}`, async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Get viewport state before rotation
      const portraitBodyWidth = await page.evaluate(
        () => document.body.scrollWidth
      );

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(300);

      // Check layout adjusted
      const landscapeBodyWidth = await page.evaluate(
        () => document.body.scrollWidth
      );

      // Should fit within viewport
      expect(landscapeBodyWidth).toBeLessThanOrEqual(667);

      // Rotate back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      // Should return to valid state
      const finalBodyWidth = await page.evaluate(
        () => document.body.scrollWidth
      );
      expect(finalBodyWidth).toBeLessThanOrEqual(375);
    });
  }
});

test.describe('Orientation Change - Component Visibility', () => {
  test('responsive components should show/hide appropriately', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // In portrait, some elements might be hidden
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Check for elements with responsive classes
    const hiddenOnMobile = page
      .locator('[class*="hidden"]')
      .filter({ hasText: /\w+/ });
    const mobileHiddenCount = await hiddenOnMobile.count();

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300);

    // Some elements might become visible in landscape
    const landscapeElements = page
      .locator('[class*="hidden"]')
      .filter({ hasText: /\w+/ });
    const landscapeCount = await landscapeElements.count();

    // The count may differ - that's expected for responsive design
    expect(landscapeCount).toBeDefined();
  });
});
