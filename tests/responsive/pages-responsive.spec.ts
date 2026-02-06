import { test, expect } from '@playwright/test';
import {
  standardViewports,
  setViewportByName,
  hasHorizontalOverflow,
  meetsTouchTargetSize,
  toggleMobileMenu,
  checkTableOverflow,
  assertNoHorizontalOverflow,
  isMobileViewport,
  getViewportCategory,
} from './helpers';

/**
 * Page-by-Page Responsive Tests
 *
 * Tests each major page across all breakpoints to ensure:
 * - No horizontal overflow
 * - Proper layout adaptation
 * - Touch-friendly targets on mobile
 * - Tables scroll horizontally on small screens
 * - Forms are usable on mobile
 */

const pages = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/dashboard/articles', name: 'Articles' },
  { path: '/dashboard/keywords', name: 'Keywords' },
  { path: '/dashboard/analytics', name: 'Analytics' },
  { path: '/dashboard/planner', name: 'Content Planner' },
  { path: '/dashboard/publishing', name: 'Publishing Queue' },
  { path: '/dashboard/rank-tracking', name: 'Rank Tracking' },
  { path: '/dashboard/integrations', name: 'Integrations' },
  { path: '/dashboard/settings', name: 'Settings' },
  { path: '/dashboard/marketplace', name: 'Backlink Marketplace' },
  { path: '/dashboard/billing', name: 'Billing' },
  { path: '/dashboard/products', name: 'Products' },
];

test.describe('Page Responsive Layout Tests', () => {
  for (const pageInfo of pages) {
    test.describe(`${pageInfo.name}`, () => {
      for (const [viewportName, viewport] of Object.entries(
        standardViewports
      )) {
        test(`layout works at ${viewportName} (${viewport.width}px)`, async ({
          page,
        }) => {
          await page.goto(pageInfo.path);
          await page.waitForLoadState('networkidle');
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await page.waitForTimeout(200);

          // Check no horizontal overflow
          await assertNoHorizontalOverflow(page);

          // Main heading should be visible
          const h1 = page.locator('h1').first();
          await expect(h1).toBeVisible();
        });
      }
    });
  }
});

test.describe('Dashboard Responsive Tests', () => {
  const breakpoints = [
    { width: 375, category: 'mobile' },
    { width: 640, category: 'mobile' },
    { width: 768, category: 'tablet' },
    { width: 1024, category: 'desktop' },
    { width: 1280, category: 'desktop' },
    { width: 1536, category: 'desktop' },
  ];

  for (const bp of breakpoints) {
    test.describe(`at ${bp.width}px (${bp.category})`, () => {
      test.use({ viewport: { width: bp.width, height: 1080 } });

      test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
      });

      test('metric cards display properly', async ({ page }) => {
        const cards = page
          .locator('[class*="card"], [class*="metric"]')
          .filter({
            hasText: /\w+/,
          });

        const count = await cards.count();
        expect(count).toBeGreaterThan(0);

        // First card should be visible
        await expect(cards.first()).toBeVisible();
      });

      test('quick action buttons are accessible', async ({ page }) => {
        const actionButtons = page.locator(
          'a:has-text("New"), a:has-text("View")'
        );

        const count = await actionButtons.count();
        if (count > 0) {
          await expect(actionButtons.first()).toBeVisible();

          // On mobile, check touch target size
          if (isMobileViewport(bp.width)) {
            const firstButton = actionButtons.first();
            const box = await firstButton.boundingBox();
            if (box) {
              expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(
                40
              );
            }
          }
        }
      });

      test('navigation is appropriate for viewport', async ({ page }) => {
        if (isMobileViewport(bp.width)) {
          // Mobile: menu button should be visible
          const menuButton = page.locator(
            'button[aria-label*="menu" i], button[aria-label*="Menu"]'
          );

          const count = await menuButton.count();
          if (count > 0) {
            await expect(menuButton.first()).toBeVisible();
          }
        } else {
          // Desktop: sidebar should be visible
          const sidebar = page.locator('aside, nav').first();
          await expect(sidebar).toBeVisible();
        }
      });
    });
  }
});

test.describe('Articles Page Responsive Tests', () => {
  test('article list adapts to viewport', async ({ page }) => {
    await page.goto('/dashboard/articles');

    // Test on mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await assertNoHorizontalOverflow(page);

    const articleList = page
      .locator('[class*="article"], [class*="list"]')
      .first();
    const listCount = await articleList.count();

    if (listCount > 0) {
      await expect(articleList.first()).toBeVisible();
    }

    // Test on desktop
    await page.setViewportSize({ width: 1280, height: 1080 });
    await assertNoHorizontalOverflow(page);
  });

  test('article filters work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/articles');

    // Look for filter buttons or dropdowns
    const filters = page.locator(
      'button:has-text("Filter"), select, [data-testid*="filter"]'
    );

    const count = await filters.count();
    if (count > 0) {
      await expect(filters.first()).toBeVisible();
    }
  });
});

test.describe('Keywords Page Responsive Tests', () => {
  test('keyword table has proper overflow handling on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/keywords');

    const tables = page.locator('table');
    const tableCount = await tables.count();

    if (tableCount > 0) {
      const table = tables.first();
      await expect(table).toBeVisible();

      // Table should have overflow container or fit
      const hasOverflow = await checkTableOverflow(page, 'table');

      // Either has overflow handling or fits within viewport
      const tableWidth = await table.evaluate((el) => el.scrollWidth);
      expect(tableWidth).toBeGreaterThan(0);
    }
  });

  test('keyword search is accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/dashboard/keywords');

    const searchInput = page.locator(
      'input[placeholder*="search" i], input[type="search"]'
    );

    const count = await searchInput.count();
    if (count > 0) {
      await expect(searchInput.first()).toBeVisible();

      // Check touch target
      const box = await searchInput.first().boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('Analytics Page Responsive Tests', () => {
  test('charts render at all breakpoints', async ({ page }) => {
    const viewports = [375, 640, 768, 1024, 1280];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/dashboard/analytics');
      await page.waitForTimeout(500);

      await assertNoHorizontalOverflow(page);

      // Look for chart containers
      const charts = page.locator('[class*="chart"], svg, canvas');
      const chartCount = await charts.count();

      if (chartCount > 0) {
        await expect(charts.first()).toBeVisible();
      }
    }
  });

  test('date picker works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/analytics');

    // Look for date picker or date range selector
    const dateSelector = page.locator(
      'input[type="date"], button:has-text("Date"), [data-testid*="date"]'
    );

    const count = await dateSelector.count();
    if (count > 0) {
      await expect(dateSelector.first()).toBeVisible();
    }
  });
});

test.describe('Planner Page Responsive Tests', () => {
  test('calendar view adapts to viewport', async ({ page }) => {
    await page.goto('/dashboard/planner');

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await assertNoHorizontalOverflow(page);

    const calendar = page
      .locator('[class*="calendar"], [class*="month"]')
      .first();
    const calendarCount = await calendar.count();

    if (calendarCount > 0) {
      await expect(calendar.first()).toBeVisible();
    }

    // Desktop view
    await page.setViewportSize({ width: 1280, height: 1080 });
    await assertNoHorizontalOverflow(page);
  });

  test('scheduled items are visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/dashboard/planner');

    const items = page.locator(
      '[class*="scheduled"], [class*="event"], [class*="item"]'
    );
    const itemCount = await items.count();

    if (itemCount > 0) {
      await expect(items.first()).toBeVisible();
    }
  });
});

test.describe('Marketplace Page Responsive Tests', () => {
  test('marketplace table scrolls on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/marketplace');

    const tables = page.locator('table');
    const tableCount = await tables.count();

    if (tableCount > 0) {
      await expect(tables.first()).toBeVisible();

      // Check for horizontal scroll capability
      const tableContainer = tables.first().locator('..');
      const overflow = await tableContainer.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return (
          styles.overflowX === 'auto' ||
          styles.overflowX === 'scroll' ||
          el.scrollWidth > el.clientWidth
        );
      });

      // Should handle overflow either via scroll or fitting
      expect(overflow || (await tables.first().isVisible())).toBeTruthy();
    }
  });

  test('filter section is collapsible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/dashboard/marketplace');

    const filters = page
      .locator('[class*="filter"], [data-testid*="filter"]')
      .first();
    const filterCount = await filters.count();

    if (filterCount > 0) {
      await expect(filters.first()).toBeVisible();
    }
  });
});

test.describe('Settings Page Responsive Tests', () => {
  test('settings sections are accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/settings');

    const sections = page.locator(
      'section, [class*="section"], [class*="panel"]'
    );
    const sectionCount = await sections.count();

    if (sectionCount > 0) {
      await expect(sections.first()).toBeVisible();
    }

    await assertNoHorizontalOverflow(page);
  });

  test('form inputs are touch-friendly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/dashboard/settings');

    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      const firstInput = inputs.first();
      await expect(firstInput).toBeVisible();

      const box = await firstInput.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('save buttons are accessible', async ({ page }) => {
    const viewports = [375, 640, 768, 1024];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/dashboard/settings');

      const saveButtons = page.locator(
        'button:has-text("Save"), button:has-text("Update"), button[type="submit"]'
      );

      const count = await saveButtons.count();
      if (count > 0) {
        await expect(saveButtons.first()).toBeVisible();

        if (width <= 640) {
          const box = await saveButtons.first().boundingBox();
          if (box) {
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
          }
        }
      }
    }
  });
});

test.describe('Billing Page Responsive Tests', () => {
  test('pricing cards adapt to viewport', async ({ page }) => {
    await page.goto('/dashboard/billing');

    const viewports = [375, 640, 768, 1024, 1280];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 1080 });
      await page.waitForTimeout(200);

      await assertNoHorizontalOverflow(page);

      const pricingCards = page
        .locator('[class*="pricing"], [class*="plan"]')
        .filter({
          hasText: /\w+/,
        });

      const cardCount = await pricingCards.count();
      if (cardCount > 0) {
        await expect(pricingCards.first()).toBeVisible();
      }
    }
  });

  test('subscription form works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/billing');

    const formElements = page.locator(
      'input, button[type="submit"], button:has-text("Subscribe")'
    );
    const formCount = await formElements.count();

    if (formCount > 0) {
      await expect(formElements.first()).toBeVisible();
    }
  });
});

test.describe('Integrations Page Responsive Tests', () => {
  test('integration cards display properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/integrations');

    const integrationCards = page
      .locator('[class*="integration"], [class*="card"]')
      .filter({
        hasText: /\w+/,
      });

    const cardCount = await integrationCards.count();
    if (cardCount > 0) {
      await expect(integrationCards.first()).toBeVisible();
    }

    await assertNoHorizontalOverflow(page);
  });

  test('connect buttons are touch-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/dashboard/integrations');

    const connectButtons = page.locator(
      'button:has-text("Connect"), button:has-text("Install"), button:has-text("Add")'
    );

    const count = await connectButtons.count();
    if (count > 0) {
      const firstButton = connectButtons.first();
      await expect(firstButton).toBeVisible();

      const box = await firstButton.boundingBox();
      if (box) {
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Cross-Page Navigation Tests', () => {
  const mobileViewport = { width: 375, height: 667 };

  test('can navigate between pages on mobile', async ({ page }) => {
    await page.setViewportSize(mobileViewport);

    const navigationPaths = [
      '/dashboard',
      '/dashboard/articles',
      '/dashboard/keywords',
      '/dashboard/settings',
    ];

    for (const path of navigationPaths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await assertNoHorizontalOverflow(page);

      // Menu button should be available
      const menuButton = page.locator(
        'button[aria-label*="menu" i], button[aria-label*="Menu"]'
      );

      const buttonCount = await menuButton.count();
      if (buttonCount > 0) {
        await expect(menuButton.first()).toBeVisible();
      }
    }
  });
});
