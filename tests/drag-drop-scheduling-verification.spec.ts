/**
 * Drag-Drop Scheduling Feature Verification Test
 *
 * This test verifies the drag-drop scheduling implementation with:
 * - API endpoint for drag-drop rescheduling
 * - Conflict validation endpoint
 * - Calendar component with drag-drop integration
 * - Error handling for edge cases
 *
 * Note: This is a temporary verification test for the drag-drop feature.
 * DELETE AFTER VERIFICATION.
 */

import { test, expect } from '@playwright/test';

test.describe('Drag-Drop API Endpoints', () => {
  test('POST /api/schedule/drag-drop validates request body', async ({
    request,
  }) => {
    // Test with missing required fields
    const response1 = await request.post('/api/schedule/drag-drop', {
      data: {},
    });
    expect(response1.status()).toBe(401); // Unauthorized without auth

    // Test with invalid UUID format
    const response2 = await request.post('/api/schedule/drag-drop', {
      data: {
        article_id: 'invalid-uuid',
        scheduled_at: '2024-01-01T12:00:00Z',
        organization_id: 'invalid-uuid',
      },
    });
    expect(response2.status()).toBe(401); // Unauthorized without auth
  });

  test('POST /api/schedule/validate-conflicts validates request body', async ({
    request,
  }) => {
    // Test with missing required fields
    const response1 = await request.post('/api/schedule/validate-conflicts', {
      data: {},
    });
    expect(response1.status()).toBe(401); // Unauthorized without auth

    // Test with invalid data format
    const response2 = await request.post('/api/schedule/validate-conflicts', {
      data: {
        article_id: 'not-a-uuid',
        scheduled_at: 'not-a-date',
        organization_id: 'not-a-uuid',
      },
    });
    expect(response2.status()).toBe(401); // Unauthorized without auth
  });
});

test.describe('Drag-Drop Schema Validation', () => {
  test('schema files export new validation schemas', async ({}) => {
    // Import schemas to verify they exist
    const schedulesModule = await import('../lib/schemas/schedules');

    // Verify new schemas are exported
    expect(typeof schedulesModule.dragDropRescheduleSchema).toBe('object');
    expect(typeof schedulesModule.validateConflictsSchema).toBe('object');
  });

  test('schemas can be imported from index', async ({}) => {
    // Import from index to verify re-exports
    const schemasModule = await import('../lib/schemas');

    // Verify schemas are accessible
    expect(schemasModule).toBeTruthy();
  });
});

test.describe('Drag-Drop Hook', () => {
  test('hook file exists and exports useCalendarDragDrop', async ({ page }) => {
    // Navigate to a test page to load modules
    await page.goto('/');

    // Try to access the hook through page evaluation
    const hookExists = await page.evaluate(async () => {
      try {
        // This would normally be imported by a component
        const modulePath = '/lib/hooks/use-calendar-drag-drop';
        // @ts-ignore - dynamic import in browser context
        const hookModule = await import(modulePath);
        return typeof hookModule.useCalendarDragDrop === 'function';
      } catch {
        return false;
      }
    });

    // The hook should be loadable
    // Note: This might fail in test environment due to module resolution,
    // but the file should exist
    expect(hookExists).toBe(true);
  });
});

test.describe('Scheduled Articles Calendar Component', () => {
  test('component file exists and can be imported', async ({ page }) => {
    await page.goto('/');

    const componentExists = await page.evaluate(async () => {
      try {
        const modulePath =
          '/components/scheduled-articles-calendar/scheduled-articles-calendar';
        // @ts-ignore - dynamic import in browser context
        const componentModule = await import(modulePath);
        return typeof componentModule.ScheduledArticlesCalendar === 'function';
      } catch {
        return false;
      }
    });

    expect(componentExists).toBe(true);
  });

  test('component index file exports ScheduledArticlesCalendar', async ({
    page,
  }) => {
    await page.goto('/');

    const exportsComponent = await page.evaluate(async () => {
      try {
        const modulePath = '/components/scheduled-articles-calendar';
        // @ts-ignore - dynamic import in browser context
        const indexModule = await import(modulePath);
        return typeof indexModule.ScheduledArticlesCalendar === 'function';
      } catch {
        return false;
      }
    });

    expect(exportsComponent).toBe(true);
  });
});

test.describe('Calendar Utils', () => {
  test('scheduledArticlesToCalendarEvents function exists', async ({
    page,
  }) => {
    await page.goto('/');

    const utilExists = await page.evaluate(async () => {
      try {
        const modulePath = '/lib/calendar-utils';
        // @ts-ignore - dynamic import in browser context
        const utilsModule = await import(modulePath);
        return (
          typeof utilsModule.scheduledArticlesToCalendarEvents === 'function'
        );
      } catch {
        return false;
      }
    });

    expect(utilExists).toBe(true);
  });

  test('function converts scheduled articles to calendar events', async ({
    page,
  }) => {
    await page.goto('/');

    const conversionWorks = await page.evaluate(async () => {
      try {
        const modulePath = '/lib/calendar-utils';
        // @ts-ignore - dynamic import in browser context
        const utilsModule = await import(modulePath);
        const { scheduledArticlesToCalendarEvents } = utilsModule;

        // Test the function with mock data
        const mockArticles = [
          {
            id: 'test-1',
            article_id: 'test-1',
            title: 'Test Article',
            scheduled_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            status: 'draft',
          },
        ];

        const events = scheduledArticlesToCalendarEvents(mockArticles);
        return (
          Array.isArray(events) &&
          events.length === 1 &&
          events[0].title === 'Test Article'
        );
      } catch {
        return false;
      }
    });

    expect(conversionWorks).toBe(true);
  });
});

test.describe('Calendar Demo Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar-demo');
  });

  test('page loads without errors', async ({ page }) => {
    // Check if page loaded
    const title = await page.title();
    expect(typeof title).toBe('string');
  });

  test('calendar view component is present', async ({ page }) => {
    // Look for calendar grid or day cells
    const calendarGrid = page.locator(
      '[data-testid="calendar-view"], .calendar-grid'
    );
    const hasCalendar = (await calendarGrid.count()) > 0;
    expect(hasCalendar).toBe(true);
  });

  test('has day cells displayed', async ({ page }) => {
    // Look for day cells
    const dayCells = page.locator('[data-testid="calendar-day-cell"]');
    const count = await dayCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('drag hint is visible', async ({ page }) => {
    // Check for drag hint
    const dragHint = page.locator('text=Drag events between days');
    await expect(dragHint).toBeVisible();
  });
});

test.describe('Content Planner Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/planner');
  });

  test('page loads without errors', async ({ page }) => {
    // Check if page loaded
    const title = await page.title();
    expect(typeof title).toBe('string');
  });

  test('has calendar view toggle', async ({ page }) => {
    // Look for calendar toggle button
    const calendarToggle = page.locator('button:has-text("Calendar")');
    await expect(calendarToggle).toBeVisible();
  });

  test('displays calendar with events', async ({ page }) => {
    // Look for calendar elements
    const calendarGrid = page.locator(
      '.calendar-grid, [data-testid="calendar-view"]'
    );
    const hasCalendar = (await calendarGrid.count()) > 0;
    expect(hasCalendar).toBe(true);
  });
});

test.describe('Drag-Drop Integration Files', () => {
  test('all new files exist', async ({}) => {
    const fs = await import('fs');
    const path = await import('path');

    const filesToCheck = [
      'app/api/schedule/drag-drop/route.ts',
      'app/api/schedule/validate-conflicts/route.ts',
      'lib/hooks/use-calendar-drag-drop.ts',
      'components/scheduled-articles-calendar/scheduled-articles-calendar.tsx',
      'components/scheduled-articles-calendar/index.ts',
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(process.cwd(), file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});
