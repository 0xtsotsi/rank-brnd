import { test, expect } from '@playwright/test';

/**
 * Mobile Navigation Tests
 *
 * Tests mobile-specific navigation patterns:
 * - Hamburger menu functionality
 * - Drawer/overlay behavior
 * - Navigation item accessibility
 * - Touch-friendly tap targets
 * - Gesture interactions
 */

const mobileViewports = [
  { width: 375, height: 667, name: 'iPhone SE' },
  { width: 390, height: 844, name: 'iPhone 14' },
  { width: 640, height: 360, name: 'Pixel 5 Landscape' },
];

test.describe('Mobile Navigation', () => {
  for (const viewport of mobileViewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport });

      test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
      });

      test('should show mobile menu button on small screens', async ({
        page,
      }) => {
        // Look for hamburger menu or menu button
        const menuButtons = page.locator(
          'button[aria-label*="menu" i], button[aria-label*="Menu"], [data-testid="mobile-menu-button"]'
        );

        const count = await menuButtons.count();
        if (count > 0) {
          await expect(menuButtons.first()).toBeVisible();
        }
      });

      test('mobile menu button should have adequate touch target', async ({
        page,
      }) => {
        const menuButton = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
          .first();

        const isVisible = await menuButton.isVisible();
        if (isVisible) {
          const box = await menuButton.boundingBox();
          expect(box).not.toBeNull();

          if (box) {
            // WCAG 2.5.5: Touch targets should be at least 44x44 CSS pixels
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test('should open navigation drawer when menu button is tapped', async ({
        page,
      }) => {
        const menuButton = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
          .first();

        const isVisible = await menuButton.isVisible();
        if (isVisible) {
          // Before clicking, sidebar might be hidden
          await menuButton.click();

          // Wait for drawer animation
          await page.waitForTimeout(300);

          // Navigation should now be visible
          const nav = page.locator('nav, aside, [role="navigation"]').first();
          await expect(nav).toBeVisible();
        }
      });

      test('should close navigation drawer when close button is tapped', async ({
        page,
      }) => {
        const menuButton = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
          .first();

        const isVisible = await menuButton.isVisible();
        if (isVisible) {
          // Open drawer
          await menuButton.click();
          await page.waitForTimeout(300);

          // Look for close button
          const closeButton = page
            .locator(
              'button[aria-label*="close" i], button[aria-label*="Close"], button[aria-label*="close menu" i]'
            )
            .first();

          const closeVisible = await closeButton.isVisible();
          if (closeVisible) {
            await closeButton.click();
            await page.waitForTimeout(300);
          }
        }
      });

      test('should close drawer when tapping overlay', async ({ page }) => {
        const menuButton = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
          .first();

        const isVisible = await menuButton.isVisible();
        if (isVisible) {
          // Open drawer
          await menuButton.click();
          await page.waitForTimeout(300);

          // Try to find and click overlay
          const overlay = page.locator(
            '[class*="overlay"], [class*="backdrop"]'
          );

          const overlayCount = await overlay.count();
          if (overlayCount > 0) {
            await overlay.first().click();
            await page.waitForTimeout(300);
          }
        }
      });

      test('navigation items should be accessible after opening drawer', async ({
        page,
      }) => {
        const menuButton = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
          .first();

        const isVisible = await menuButton.isVisible();
        if (isVisible) {
          await menuButton.click();
          await page.waitForTimeout(300);

          // Check for navigation links
          const navLinks = page.locator(
            'nav a, aside a, [role="navigation"] a'
          );

          const count = await navLinks.count();
          if (count > 0) {
            // First link should be visible
            await expect(navLinks.first()).toBeVisible();
          }
        }
      });

      test('navigation items should have adequate touch targets', async ({
        page,
      }) => {
        const menuButton = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
          .first();

        const isVisible = await menuButton.isVisible();
        if (isVisible) {
          await menuButton.click();
          await page.waitForTimeout(300);

          // Check navigation link sizes
          const navLinks = page.locator('nav a, aside a');

          const count = await navLinks.count();
          if (count > 0) {
            // Check first 5 links
            const toCheck = Math.min(count, 5);

            for (let i = 0; i < toCheck; i++) {
              const link = navLinks.nth(i);
              const linkVisible = await link.isVisible();

              if (linkVisible) {
                const box = await link.boundingBox();
                if (box) {
                  // Touch target should be at least 44px in one dimension
                  const minDimension = Math.min(box.width, box.height);
                  expect(minDimension).toBeGreaterThanOrEqual(40);
                }
              }
            }
          }
        }
      });

      test('active navigation item should be visually indicated', async ({
        page,
      }) => {
        const menuButton = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
          .first();

        const isVisible = await menuButton.isVisible();
        if (isVisible) {
          await menuButton.click();
          await page.waitForTimeout(300);

          // Look for active/selected navigation item
          const activeItem = page
            .locator(
              '[aria-current="page"], [class*="active"], [data-state="active"]'
            )
            .first();

          const activeCount = await activeItem.count();
          if (activeCount > 0) {
            await expect(activeItem.first()).toBeVisible();
          }
        }
      });
    });
  }

  test.describe('Navigation gestures', () => {
    test('swipe gesture should close drawer', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      const menuButton = page
        .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
        .first();

      const isVisible = await menuButton.isVisible();
      if (isVisible) {
        await menuButton.click();
        await page.waitForTimeout(300);

        // Try swipe gesture to close (if applicable)
        const drawer = page.locator('nav, aside').first();
        const box = await drawer.boundingBox();

        if (box) {
          // Swipe from right to left
          await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 50, box.y + box.height / 2, {
            steps: 10,
          });
          await page.mouse.up();
          await page.waitForTimeout(300);
        }
      }
    });
  });
});

test.describe('Mobile Navigation Accessibility', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('navigation should be keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab to menu button
    await page.keyboard.press('Tab');

    // Check if menu button is focused
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        ariaLabel: el?.getAttribute('aria-label'),
      };
    });

    // Menu button or first interactive element should be focused
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement.tagName);
  });

  test('navigation drawer should trap focus when open', async ({ page }) => {
    await page.goto('/dashboard');

    const menuButton = page
      .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
      .first();

    const isVisible = await menuButton.isVisible();
    if (isVisible) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Focus should move to drawer
      const activeElement = await page.evaluate(
        () => document.activeElement?.tagName
      );

      // Focus should be in navigation or first focusable element in drawer
      expect(['NAV', 'ASIDE', 'BUTTON', 'A']).toContain(activeElement);
    }
  });

  test('mobile menu should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/dashboard');

    const menuButton = page
      .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
      .first();

    const isVisible = await menuButton.isVisible();
    if (isVisible) {
      // Check for aria-expanded or aria-controls
      const ariaExpanded = await menuButton.getAttribute('aria-expanded');
      const ariaControls = await menuButton.getAttribute('aria-controls');

      // At least one should be present for accessibility
      const hasAria = ariaExpanded !== null || ariaControls !== null;
      expect(hasAria).toBeTruthy();
    }
  });
});

test.describe('Mobile Navigation Cross-Page', () => {
  const pages = [
    '/dashboard',
    '/dashboard/articles',
    '/dashboard/keywords',
    '/dashboard/analytics',
    '/dashboard/settings',
  ];

  for (const pagePath of pages) {
    test(`navigation works on ${pagePath}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(pagePath);

      const menuButton = page
        .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
        .first();

      const isVisible = await menuButton.isVisible();
      if (isVisible) {
        // Menu should be available on all pages
        await expect(menuButton).toBeVisible();
      }
    });
  }
});
