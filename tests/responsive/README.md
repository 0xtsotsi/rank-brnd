# Responsive Testing Suite

This directory contains comprehensive responsive design tests for the Rank.brnd application.

## Overview

The responsive testing suite verifies that the application works correctly across all major breakpoints:

- **Mobile Small**: 375px (iPhone SE)
- **Mobile Medium**: 390px (iPhone 14)
- **Mobile Large**: 640px (Pixel 5)
- **Tablet Portrait**: 768px (iPad Mini)
- **Tablet Landscape**: 1024px (iPad Mini)
- **Desktop Small**: 1280px
- **Desktop Medium**: 1536px
- **Desktop Large**: 1920px

## Test Files

### `responsive-layout.spec.ts`

Core layout tests that verify:

- No horizontal scroll at any breakpoint
- Proper navigation adaptation (sidebar on desktop, drawer on mobile)
- Legible text sizes
- Adequate touch targets on mobile (minimum 44x44px per WCAG)
- Proper table overflow handling
- Form usability on mobile
- Responsive card grids
- Image scaling

### `mobile-navigation.spec.ts`

Mobile-specific navigation tests:

- Hamburger menu visibility and functionality
- Drawer open/close behavior
- Touch target sizes for navigation items
- Overlay/backdrop interaction
- Active navigation item indication
- Keyboard accessibility
- ARIA attributes verification
- Gesture support (swipe to close)

### `orientation-change.spec.ts`

Device orientation tests:

- Portrait to landscape transitions
- Landscape to portrait transitions
- Layout preservation during rotation
- Scroll position maintenance
- Content preservation
- Multiple rapid rotations
- Component visibility changes

### `pages-responsive.spec.ts`

Page-by-page responsive tests for:

- Dashboard (metric cards, quick actions)
- Articles (list view, filters)
- Keywords (table, search)
- Analytics (charts, date picker)
- Planner (calendar, scheduled items)
- Marketplace (data tables, filters)
- Settings (forms, sections)
- Billing (pricing cards, subscription form)
- Integrations (integration cards, connect buttons)

### `helpers.ts`

Utility functions for responsive testing:

- `setViewportByName()` - Set viewport by standard name
- `hasHorizontalOverflow()` - Check for horizontal overflow
- `meetsTouchTargetSize()` - Verify 44x44px minimum
- `findInsufficientTouchTargets()` - Find all undersized touch targets
- `toggleMobileMenu()` - Open/close mobile drawer
- `isMobileDrawerOpen()` - Check drawer state
- `testAtViewports()` - Run test at multiple viewports
- `getVisibilityBreakpoints()` - Find where elements show/hide
- `checkTableOverflow()` - Verify table overflow handling
- `rotateDevice()` - Simulate orientation change

## Running Tests

### Run all responsive tests

```bash
npx playwright test tests/responsive/
```

### Run specific test file

```bash
npx playwright test tests/responsive/responsive-layout.spec.ts
```

### Run only mobile tests

```bash
npx playwright test --project="mobile-small"
```

### Run with headed browser (see what's happening)

```bash
npx playwright test tests/responsive/ --headed
```

### Run with debug mode

```bash
npx playwright test tests/responsive/ --debug
```

### Run specific viewport

```bash
npx playwright test --project="mobile-large"
npx playwright test --project="tablet-portrait"
npx playwright test --project="desktop-medium"
```

## Playwright Configuration

The `playwright.config.ts` has been updated with responsive testing projects:

```typescript
projects: [
  { name: 'mobile-small', use: { ...devices['iPhone SE'] } },
  { name: 'mobile-medium', use: { ...devices['iPhone 14'] } },
  { name: 'mobile-large', use: { ...devices['Pixel 5'] } },
  { name: 'tablet-portrait', use: { ...devices['iPad Mini'] } },
  {
    name: 'tablet-landscape',
    use: { ...devices['iPad Mini'], viewport: { width: 1024, height: 768 } },
  },
  { name: 'desktop-small', use: { viewport: { width: 1280, height: 1080 } } },
  { name: 'desktop-medium', use: { viewport: { width: 1536, height: 1080 } } },
  // ...
];
```

## Adding New Responsive Tests

When adding new features or pages, include responsive tests:

```typescript
import { test, expect } from '@playwright/test';
import {
  assertNoHorizontalOverflow,
  isMobileViewport,
} from '../responsive/helpers';

test.describe('My New Feature', () => {
  const breakpoints = [375, 640, 768, 1024, 1280];

  for (const width of breakpoints) {
    test(`works at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/my-new-feature');

      // Always check for no horizontal overflow
      await assertNoHorizontalOverflow(page);

      // Your feature-specific tests here
      const featureElement = page.locator('[data-testid="my-feature"]');
      await expect(featureElement).toBeVisible();

      // Check touch targets on mobile
      if (isMobileViewport(width)) {
        const buttons = page.locator('button');
        const count = await buttons.count();
        if (count > 0) {
          const box = await buttons.first().boundingBox();
          if (box) {
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  }
});
```

## Accessibility Guidelines

These tests verify WCAG 2.1 Level AA compliance for:

1. **Touch Targets**: At least 44x44 CSS pixels (WCAG 2.5.5)
2. **Reflow**: Content can be presented without loss of information or functionality (WCAG 1.4.10)
3. **Text Spacing**: Text remains readable when resized (WCAG 1.4.12)

## Continuous Integration

In CI, responsive tests run across all configured viewport projects. Tests that fail will:

- Capture screenshots
- Record video
- Generate trace files

View the HTML report:

```bash
npx playwright show-report
```

## Troubleshooting

### Tests timing out on mobile

- Increase timeout for mobile-specific tests
- Use `page.waitForTimeout()` after orientation changes

### Horizontal overflow detected

- Check for fixed-width elements
- Verify `max-width: 100%` on images and tables
- Use `overflow-x: auto` for wide tables

### Touch targets too small

- Ensure buttons and links have at least 44px minimum dimension
- Use padding instead of fixed heights
- Check for inherited styles that might reduce clickable area

### Flaky tests after orientation change

- Add longer wait times after `setViewportSize()`
- Use `page.waitForLoadState('networkidle')` when appropriate
- Check for async layout shifts

## Resources

- [Playwright Viewport Documentation](https://playwright.dev/docs/emulation)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
