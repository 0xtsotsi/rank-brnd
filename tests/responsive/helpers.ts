import { Page, Locator } from '@playwright/test';

/**
 * Responsive Testing Helper Utilities
 *
 * Provides reusable functions for testing responsive behavior
 * across different viewport sizes and orientations.
 */

export interface ViewportSize {
  width: number;
  height: number;
  name?: string;
}

export const standardViewports: Record<string, ViewportSize> = {
  'mobile-small': { width: 375, height: 667, name: 'iPhone SE' },
  'mobile-medium': { width: 390, height: 844, name: 'iPhone 14' },
  'mobile-large': { width: 640, height: 360, name: 'Pixel 5' },
  'tablet-portrait': { width: 768, height: 1024, name: 'iPad Mini Portrait' },
  'tablet-landscape': { width: 1024, height: 768, name: 'iPad Mini Landscape' },
  'desktop-small': { width: 1280, height: 1080, name: 'Desktop Small' },
  'desktop-medium': { width: 1536, height: 1080, name: 'Desktop Medium' },
  'desktop-large': { width: 1920, height: 1080, name: 'Desktop Large' },
};

/**
 * Set viewport size by name
 */
export async function setViewportByName(
  page: Page,
  name: string
): Promise<void> {
  const viewport = standardViewports[name];
  if (viewport) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
  }
}

/**
 * Check if page has horizontal overflow
 */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth;
  });
}

/**
 * Get element's computed style property
 */
export async function getComputedStyle(
  page: Page,
  selector: string,
  property: string
): Promise<string> {
  return await page.evaluate(
    ([sel, prop]) => {
      const el = document.querySelector(sel);
      return el ? window.getComputedStyle(el)[prop as any] : '';
    },
    [selector, property]
  );
}

/**
 * Check if element meets minimum touch target size (44x44px per WCAG)
 */
export async function meetsTouchTargetSize(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();

  if (!box) return false;

  return box.width >= 44 && box.height >= 44;
}

/**
 * Find all elements with insufficient touch targets
 */
export async function findInsufficientTouchTargets(
  page: Page,
  selector: string = 'button, a[href], input, select'
): Promise<number> {
  const elements = page.locator(selector);
  const count = await elements.count();
  let insufficient = 0;

  for (let i = 0; i < count; i++) {
    const element = elements.nth(i);
    const isVisible = await element.isVisible();

    if (isVisible) {
      const box = await element.boundingBox();
      if (box) {
        const minDimension = Math.min(box.width, box.height);
        if (minDimension < 44) {
          insufficient++;
        }
      }
    }
  }

  return insufficient;
}

/**
 * Toggle mobile menu drawer
 */
export async function toggleMobileMenu(page: Page): Promise<boolean> {
  const menuButton = page
    .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
    .first();

  const isVisible = await menuButton.isVisible();
  if (isVisible) {
    await menuButton.click();
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

/**
 * Check if mobile drawer is open
 */
export async function isMobileDrawerOpen(page: Page): Promise<boolean> {
  const nav = page.locator('nav, aside, [role="navigation"]').first();
  const isVisible = await nav.isVisible();

  if (!isVisible) return false;

  // Check if it has expanded/open class or attribute
  const isOpen = await nav.evaluate((el) => {
    return (
      el.classList.contains('open') ||
      el.classList.contains('expanded') ||
      el.getAttribute('aria-expanded') === 'true' ||
      el.getAttribute('data-state') === 'open'
    );
  });

  return isOpen;
}

/**
 * Test page at multiple viewports
 */
export async function testAtViewports(
  page: Page,
  viewports: ViewportSize[],
  testFn: (page: Page, viewport: ViewportSize) => Promise<void>
): Promise<void> {
  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.waitForTimeout(200);
    await testFn(page, viewport);
  }
}

/**
 * Get all breakpoints where element visibility changes
 */
export async function getVisibilityBreakpoints(
  page: Page,
  selector: string
): Promise<{ width: number; visible: boolean }[]> {
  const breakpoints: { width: number; visible: boolean }[] = [];
  const widths = [320, 375, 640, 768, 1024, 1280, 1536];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1080 });
    await page.waitForTimeout(100);

    const element = page.locator(selector).first();
    const isVisible = await element.isVisible();

    breakpoints.push({ width, visible: isVisible });
  }

  return breakpoints;
}

/**
 * Check if table has proper overflow handling on mobile
 */
export async function checkTableOverflow(
  page: Page,
  selector: string
): Promise<boolean> {
  const table = page.locator(selector).first();
  const tableExists = await table.count();

  if (tableExists === 0) return true; // No table to check

  const parent = table.locator('..');
  const hasOverflow = await parent.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return styles.overflowX === 'auto' || styles.overflowX === 'scroll';
  });

  return hasOverflow;
}

/**
 * Simulate device orientation change
 */
export async function rotateDevice(
  page: Page,
  orientation: 'portrait' | 'landscape'
): Promise<void> {
  const currentSize = page.viewportSize();
  if (!currentSize) return;

  if (orientation === 'landscape') {
    // Swap to landscape (ensure width > height)
    const maxDimension = Math.max(currentSize.width, currentSize.height);
    const minDimension = Math.min(currentSize.width, currentSize.height);
    await page.setViewportSize({ width: maxDimension, height: minDimension });
  } else {
    // Swap to portrait (ensure height > width)
    const maxDimension = Math.max(currentSize.width, currentSize.height);
    const minDimension = Math.min(currentSize.width, currentSize.height);
    await page.setViewportSize({ width: minDimension, height: maxDimension });
  }

  await page.waitForTimeout(300);
}

/**
 * Get all interactive elements that are visible
 */
export async function getInteractiveElements(page: Page): Promise<Locator[]> {
  const selectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  const elements: Locator[] = [];
  for (const selector of selectors) {
    const located = page.locator(selector);
    const count = await located.count();
    for (let i = 0; i < count; i++) {
      const el = located.nth(i);
      if (await el.isVisible()) {
        elements.push(el);
      }
    }
  }

  return elements;
}

/**
 * Calculate element's minimum dimension (for touch target testing)
 */
export async function getMinTouchDimension(
  page: Page,
  selector: string
): Promise<number | null> {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();

  if (!box) return null;

  return Math.min(box.width, box.height);
}

/**
 * Check if page is in mobile viewport
 */
export function isMobileViewport(width: number): boolean {
  return width <= 640;
}

/**
 * Check if page is in tablet viewport
 */
export function isTabletViewport(width: number): boolean {
  return width > 640 && width <= 1024;
}

/**
 * Check if page is in desktop viewport
 */
export function isDesktopViewport(width: number): boolean {
  return width > 1024;
}

/**
 * Get viewport category name
 */
export function getViewportCategory(width: number): string {
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

/**
 * Assert no horizontal overflow at current viewport
 */
export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await hasHorizontalOverflow(page);
  const viewport = page.viewportSize();

  if (hasOverflow) {
    throw new Error(
      `Horizontal overflow detected at ${viewport?.width}x${viewport?.height}`
    );
  }
}

/**
 * Get responsive breakpoints for an element
 */
export async function getElementResponsiveInfo(
  page: Page,
  selector: string
): Promise<{
  visibleAt: number[];
  hiddenAt: number[];
  breakpoints: { width: number; visible: boolean; display: string }[];
}> {
  const widths = [320, 375, 640, 768, 1024, 1280, 1536];
  const result = {
    visibleAt: [] as number[],
    hiddenAt: [] as number[],
    breakpoints: [] as { width: number; visible: boolean; display: string }[],
  };

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1080 });
    await page.waitForTimeout(100);

    const info = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) {
        return { visible: false, display: 'none' };
      }

      const styles = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      return {
        visible: rect.width > 0 && rect.height > 0 && styles.display !== 'none',
        display: styles.display,
      };
    }, selector);

    result.breakpoints.push({ width, ...info });

    if (info.visible) {
      result.visibleAt.push(width);
    } else {
      result.hiddenAt.push(width);
    }
  }

  return result;
}
