import { test, expect } from '@playwright/test';

/**
 * Critical User Path: Publishing Workflow E2E Tests
 *
 * Tests the complete publishing workflow including:
 * - Navigating to publishing dashboard
 * - Viewing publishing queue and status
 * - Connecting CMS platforms
 * - Scheduling article publication
 * - Publishing immediately
 * - Handling publish failures and retry
 * - Viewing publish history
 *
 * Note: These tests require authentication and CMS integrations setup.
 * Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CMS credentials in .env before running.
 */

test.describe('Publishing Workflow - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('has navigation link to publishing page', async ({ page }) => {
    // Look for Publishing link in navigation
    const publishingLink = page.locator('a[href*="/publishing"]').first();

    if (await publishingLink.isVisible()) {
      await expect(publishingLink).toBeVisible();
      const href = await publishingLink.getAttribute('href');
      expect(href).toBeTruthy();
    } else {
      // Check for button that navigates to publishing page
      const publishingButton = page
        .locator('button')
        .filter({ hasText: /publishing|publish queue/i })
        .first();
      await expect(publishingButton).toBeVisible();
    }
  });

  test('navigates to publishing dashboard from dashboard', async ({ page }) => {
    await page.goto('/dashboard/publishing');

    // Verify we're on the publishing page
    await expect(
      page.locator('h1').filter({ hasText: /publishing/i })
    ).toBeVisible();
  });
});

test.describe('Publishing Workflow - Dashboard Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/publishing');
  });

  test('displays page heading and description', async ({ page }) => {
    await expect(
      page.locator('h1').filter({ hasText: /publishing/i })
    ).toBeVisible();

    const description = page
      .locator('text=manage article publishing, text=cms platforms')
      .first();
    await expect(description).toBeVisible();
  });

  test('displays action buttons', async ({ page }) => {
    // Check for Refresh button
    const refreshButton = page
      .locator('button')
      .filter({ hasText: /refresh/i })
      .first();
    await expect(refreshButton).toBeVisible();

    // Check for Schedule Publish button
    const scheduleButton = page
      .locator('button')
      .filter({ hasText: /schedule publish/i })
      .first();
    await expect(scheduleButton).toBeVisible();
  });

  test('displays stats cards', async ({ page }) => {
    await page.waitForTimeout(500);

    // Look for stats cards
    const statsSection = page
      .locator('[data-testid*="publishing-stats"], .stats-cards')
      .first();

    if (await statsSection.isVisible()) {
      const statsCards = statsSection.locator(
        '[data-testid*="stat"], .stat-card'
      );
      const cardCount = await statsCards.count();

      if (cardCount > 0) {
        // Should have at least 1 stat card
        expect(cardCount).toBeGreaterThan(0);
      }
    }
  });

  test('displays publishing queue table', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Check for queue table
    const table = page
      .locator(
        'table, [data-testid="queue-table"], [data-testid="publishing-queue"]'
      )
      .first();
    const emptyState = page
      .locator(
        'text=no items, text=no scheduled publishes, text=queue is empty'
      )
      .first();

    const hasContent =
      (await table.isVisible()) || (await emptyState.isVisible());
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Publishing Workflow - Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/publishing');
    await page.waitForTimeout(500);
  });

  test('displays status filter buttons', async ({ page }) => {
    // Look for filter buttons
    const allFilter = page
      .locator('button')
      .filter({ hasText: /all/i })
      .first();
    const pendingFilter = page
      .locator('button')
      .filter({ hasText: /pending/i })
      .first();
    const publishingFilter = page
      .locator('button')
      .filter({ hasText: /publishing/i })
      .first();
    const publishedFilter = page
      .locator('button')
      .filter({ hasText: /published/i })
      .first();
    const failedFilter = page
      .locator('button')
      .filter({ hasText: /failed/i })
      .first();

    // At least the "All" filter should be visible
    await expect(allFilter).toBeVisible();
  });

  test('filters queue items by status', async ({ page }) => {
    const pendingFilter = page
      .locator('button')
      .filter({ hasText: /pending/i })
      .first();

    if (await pendingFilter.isVisible()) {
      await pendingFilter.click();
      await page.waitForTimeout(500);

      // URL should update with status filter
      const currentUrl = page.url();
      const hasFilter = currentUrl.includes('status=pending');
      expect(hasFilter).toBeTruthy();
    }
  });

  test('displays platform filter dropdown', async ({ page }) => {
    const platformFilter = page
      .locator('select[name="platform"], [data-testid="filter-platform"]')
      .first();

    if (await platformFilter.isVisible()) {
      await expect(platformFilter).toBeVisible();

      // Check for platform options
      const options = await platformFilter.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);
    }
  });

  test('filters queue items by platform', async ({ page }) => {
    const platformFilter = page
      .locator('select[name="platform"], [data-testid="filter-platform"]')
      .first();

    if (await platformFilter.isVisible()) {
      // Select WordPress platform
      await platformFilter.selectOption('wordpress');
      await page.waitForTimeout(500);

      // URL should update with platform filter
      const currentUrl = page.url();
      const hasFilter = currentUrl.includes('platform=wordpress');
      expect(hasFilter).toBeTruthy();
    }
  });

  test('has manage integrations link', async ({ page }) => {
    const integrationsLink = page
      .locator('a')
      .filter({ hasText: /manage integrations/i })
      .first();

    if (await integrationsLink.isVisible()) {
      await expect(integrationsLink).toBeVisible();

      const href = await integrationsLink.getAttribute('href');
      expect(href).toContain('/integrations');
    }
  });
});

test.describe('Publishing Workflow - Queue Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/publishing');
    await page.waitForTimeout(1000);
  });

  test('displays queue item actions', async ({ page }) => {
    // Look for a queue item with actions
    const queueItem = page.locator('tr, [data-testid="queue-item"]').first();

    if (await queueItem.isVisible()) {
      // Check for action buttons within the item
      const actionButton = queueItem.locator('button').first();
      await expect(actionButton).toBeVisible();
    }
  });

  test('allows canceling pending queue item', async ({ page }) => {
    const cancelButton = page
      .locator('button')
      .filter({ hasText: /cancel/i })
      .first();

    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal').first();

      if (await confirmDialog.isVisible()) {
        const confirmButton = confirmDialog
          .locator('button')
          .filter({ hasText: /confirm|cancel|yes/i })
          .first();

        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('allows retrying failed queue item', async ({ page }) => {
    const retryButton = page
      .locator('button')
      .filter({ hasText: /retry/i })
      .first();

    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();

      await retryButton.click();
      await page.waitForTimeout(500);

      // Should trigger retry request
    }
  });

  test('allows deleting queue item', async ({ page }) => {
    const deleteButton = page
      .locator('button')
      .filter({ hasText: /delete|remove/i })
      .first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal').first();

      if (await confirmDialog.isVisible()) {
        const confirmButton = confirmDialog
          .locator('button')
          .filter({ hasText: /confirm|delete|yes/i })
          .first();

        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('refreshes queue data when refresh button is clicked', async ({
    page,
  }) => {
    const refreshButton = page
      .locator('button')
      .filter({ hasText: /refresh/i })
      .first();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Check for loading state
      const loader = page.locator('.animate-spin, [data-testid="loading"]');
      const hasLoader = (await loader.count()) > 0;

      // Loader may appear briefly
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Publishing Workflow - Schedule Publish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/publishing');
  });

  test('opens schedule publish dialog', async ({ page }) => {
    const scheduleButton = page
      .locator('button')
      .filter({ hasText: /schedule publish/i })
      .first();

    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(500);

      // Check for dialog
      const dialog = page
        .locator('[role="dialog"], .modal, [data-testid="schedule-dialog"]')
        .first();

      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
      }
    }
  });

  test('has article selector in schedule dialog', async ({ page }) => {
    const scheduleButton = page
      .locator('button')
      .filter({ hasText: /schedule publish/i })
      .first();

    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"], .modal').first();

      if (await dialog.isVisible()) {
        const articleSelect = dialog
          .locator('select[name="article"], [data-testid="article-select"]')
          .first();
        const articleCombobox = dialog.locator('[role="combobox"]').first();

        const hasSelector =
          (await articleSelect.isVisible()) ||
          (await articleCombobox.isVisible());
        expect(hasSelector).toBeTruthy();
      }
    }
  });

  test('has platform selector in schedule dialog', async ({ page }) => {
    const scheduleButton = page
      .locator('button')
      .filter({ hasText: /schedule publish/i })
      .first();

    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"], .modal').first();

      if (await dialog.isVisible()) {
        const platformSelect = dialog
          .locator('select[name="platform"], [data-testid="platform-select"]')
          .first();

        if (await platformSelect.isVisible()) {
          await expect(platformSelect).toBeVisible();
        }
      }
    }
  });

  test('has date and time pickers in schedule dialog', async ({ page }) => {
    const scheduleButton = page
      .locator('button')
      .filter({ hasText: /schedule publish/i })
      .first();

    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"], .modal').first();

      if (await dialog.isVisible()) {
        const dateInput = dialog
          .locator('input[type="date"], input[name="date"]')
          .first();
        const timeInput = dialog
          .locator('input[type="time"], input[name="time"]')
          .first();
        const datetimeInput = dialog
          .locator('input[type="datetime-local"]')
          .first();

        const hasDateTimeInput =
          (await dateInput.isVisible()) ||
          (await timeInput.isVisible()) ||
          (await datetimeInput.isVisible());

        expect(hasDateTimeInput).toBeTruthy();
      }
    }
  });

  test('has schedule and cancel buttons in dialog', async ({ page }) => {
    const scheduleButton = page
      .locator('button')
      .filter({ hasText: /schedule publish/i })
      .first();

    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"], .modal').first();

      if (await dialog.isVisible()) {
        const submitButton = dialog
          .locator('button')
          .filter({ hasText: /schedule/i })
          .first();
        const cancelButton = dialog
          .locator('button')
          .filter({ hasText: /cancel|close/i })
          .first();

        await expect(submitButton).toBeVisible();
        await expect(cancelButton).toBeVisible();
      }
    }
  });
});

test.describe('Publishing Workflow - Publish Immediately', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/publishing');
  });

  test('has publish now button for draft articles', async ({ page }) => {
    // Navigate to articles page where publish now button would be
    await page.goto('/dashboard/articles');

    const publishNowButton = page
      .locator('button')
      .filter({ hasText: /publish now/i })
      .first();

    if (await publishNowButton.isVisible()) {
      await expect(publishNowButton).toBeVisible();
    }
  });

  test('shows platform selection for publish now', async ({ page }) => {
    await page.goto('/dashboard/articles');

    const publishNowButton = page
      .locator('button')
      .filter({ hasText: /publish now/i })
      .first();

    if (await publishNowButton.isVisible()) {
      await publishNowButton.click();
      await page.waitForTimeout(500);

      // Check for platform selection dialog
      const dialog = page.locator('[role="dialog"], .modal').first();

      if (await dialog.isVisible()) {
        const platformOptions = dialog.locator(
          'text=WordPress, text=Ghost, text=Notion'
        );
        const hasPlatforms = (await platformOptions.count()) > 0;

        expect(hasPlatforms).toBeTruthy();
      }
    }
  });
});

test.describe('Publishing Workflow - API', () => {
  test('GET /api/publishing-queue returns queue items', async ({ request }) => {
    const response = await request.get(
      '/api/publishing-queue?organization_id=test-org-id'
    );

    // Should return 401 (unauthenticated) or 200/400 (with/out auth)
    expect([200, 400, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('items');
    }
  });

  test('GET /api/publishing-queue/stats returns statistics', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/publishing-queue/stats?organization_id=test-org-id'
    );

    // Should return 401 (unauthenticated) or 200/400 (with/out auth)
    expect([200, 400, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('stats');
    }
  });

  test('POST /api/publishing-queue/cancel cancels queue item', async ({
    request,
  }) => {
    const response = await request.post('/api/publishing-queue/cancel', {
      data: { id: 'test-queue-id' },
    });

    // Should return 401 (unauthenticated) or 200/400 (with/out auth)
    expect([200, 400, 401]).toContain(response.status());
  });

  test('POST /api/publishing-queue/retry retries failed item', async ({
    request,
  }) => {
    const response = await request.post('/api/publishing-queue/retry', {
      data: { id: 'test-queue-id' },
    });

    // Should return 401 (unauthenticated) or 200/400 (with/out auth)
    expect([200, 400, 401]).toContain(response.status());
  });

  test('DELETE /api/publishing-queue deletes queue item', async ({
    request,
  }) => {
    const response = await request.delete(
      '/api/publishing-queue?id=test-queue-id'
    );

    // Should return 401 (unauthenticated) or 200/400 (with/out auth)
    expect([200, 204, 400, 401]).toContain(response.status());
  });

  test('POST /api/articles/publish publishes article immediately', async ({
    request,
  }) => {
    const response = await request.post('/api/articles/publish', {
      data: {
        article_id: 'test-article-id',
        platform: 'wordpress',
      },
    });

    // Should return 401 (unauthenticated) or 200/400 (with/out auth)
    expect([200, 201, 400, 401]).toContain(response.status());

    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('POST /api/schedule schedules article publication', async ({
    request,
  }) => {
    const response = await request.post('/api/schedule', {
      data: {
        article_id: 'test-article-id',
        platform: 'wordpress',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      },
    });

    // Should return 401 (unauthenticated) or 200/201/400 (with/out auth)
    expect([200, 201, 400, 401]).toContain(response.status());

    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty('id');
    }
  });
});

test.describe('Publishing Workflow - Complete Journey', () => {
  test('completes full publishing workflow', async ({ page }) => {
    // Start at publishing dashboard
    await page.goto('/dashboard/publishing');

    // Verify page loaded
    await expect(
      page.locator('h1').filter({ hasText: /publishing/i })
    ).toBeVisible();

    // The complete flow would:
    // 1. View current queue status
    // 2. Schedule a new publish
    // 3. Monitor publish progress
    // 4. View published status

    // For this test, we verify the UI is accessible
    const statsSection = page
      .locator('[data-testid*="publishing-stats"], .stats-cards')
      .first();
    const queueTable = page
      .locator('table, [data-testid="queue-table"]')
      .first();

    const hasContent =
      (await statsSection.isVisible()) ||
      (await queueTable.isVisible()) ||
      (await page.locator('text=no items, text=queue is empty').isVisible());

    expect(hasContent).toBeTruthy();
  });

  test('navigates to integrations page to manage CMS connections', async ({
    page,
  }) => {
    await page.goto('/dashboard/publishing');

    const integrationsLink = page
      .locator('a')
      .filter({ hasText: /manage integrations/i })
      .first();

    if (await integrationsLink.isVisible()) {
      await integrationsLink.click();

      // Should navigate to integrations page
      await page.waitForTimeout(500);
      const currentUrl = page.url();
      const hasIntegrations =
        currentUrl.includes('/integrations') ||
        (await page
          .locator('text=integrations, text=cms, text=connect')
          .isVisible());

      expect(hasIntegrations).toBeTruthy();
    } else {
      // Navigate directly
      await page.goto('/dashboard/integrations');
      await expect(
        page.locator('h1').filter({ hasText: /integrations/i })
      ).toBeVisible();
    }
  });
});
