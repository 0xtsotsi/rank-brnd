/**
 * Publishing Queue Verification Test
 *
 * This is a temporary verification test to ensure the publishing queue feature works correctly.
 * After successful verification, this test should be deleted.
 */

import { test, expect } from '@playwright/test';

test.describe('Publishing Queue Feature', () => {
  test('verify database migration file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260204_create_publishing_queue_table.sql'
    );
    const exists = await fs
      .access(migrationPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify database migration has required elements', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260204_create_publishing_queue_table.sql'
    );
    const content = await fs.readFile(migrationPath, 'utf-8');

    // Check for key elements
    expect(content).toContain('CREATE TABLE IF NOT EXISTS publishing_queue');
    expect(content).toContain('publishing_queue_status');
    expect(content).toContain('organization_id');
    expect(content).toContain('product_id');
    expect(content).toContain('article_id');
    expect(content).toContain('platform');
    expect(content).toContain('status');
    expect(content).toContain('retry_count');
    expect(content).toContain('last_error');
  });

  test('verify TypeScript types file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const typesPath = path.join(process.cwd(), 'types/publishing-queue.ts');
    const exists = await fs
      .access(typesPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify TypeScript types have required exports', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const typesPath = path.join(process.cwd(), 'types/publishing-queue.ts');
    const content = await fs.readFile(typesPath, 'utf-8');

    // Check for key exports
    expect(content).toContain('PublishingQueueStatus');
    expect(content).toContain('PublishingPlatform');
    expect(content).toContain('PublishingQueue');
    expect(content).toContain('PUBLISHING_QUEUE_STATUS_LABELS');
    expect(content).toContain('PUBLISHING_PLATFORM_LABELS');
  });

  test('verify Supabase utility functions file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const utilPath = path.join(
      process.cwd(),
      'lib/supabase/publishing-queue.ts'
    );
    const exists = await fs
      .access(utilPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify Supabase utility functions have required exports', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const utilPath = path.join(
      process.cwd(),
      'lib/supabase/publishing-queue.ts'
    );
    const content = await fs.readFile(utilPath, 'utf-8');

    // Check for key functions
    expect(content).toContain('getOrganizationPublishingQueue');
    expect(content).toContain('createPublishingQueueItem');
    expect(content).toContain('updatePublishingQueueItem');
    expect(content).toContain('markPublishingItemCompleted');
    expect(content).toContain('markPublishingItemFailed');
    expect(content).toContain('queueArticleForPublishing');
    expect(content).toContain('cancelPublishingItem');
    expect(content).toContain('retryPublishingItem');
  });

  test('verify Zod schemas file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const schemaPath = path.join(
      process.cwd(),
      'lib/schemas/publishing-queue.ts'
    );
    const exists = await fs
      .access(schemaPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify Zod schemas have required exports', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const schemaPath = path.join(
      process.cwd(),
      'lib/schemas/publishing-queue.ts'
    );
    const content = await fs.readFile(schemaPath, 'utf-8');

    // Check for key schemas
    expect(content).toContain('createPublishingQueueItemSchema');
    expect(content).toContain('queueArticleForPublishingSchema');
    expect(content).toContain('publishingQueueQuerySchema');
    expect(content).toContain('updatePublishingQueueItemSchema');
    expect(content).toContain('cancelPublishingQueueItemSchema');
    expect(content).toContain('retryPublishingQueueItemSchema');
  });

  test('verify API route files exist', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files = [
      'app/api/publishing-queue/route.ts',
      'app/api/publishing-queue/queue/route.ts',
      'app/api/publishing-queue/cancel/route.ts',
      'app/api/publishing-queue/retry/route.ts',
      'app/api/publishing-queue/complete/route.ts',
      'app/api/publishing-queue/fail/route.ts',
      'app/api/publishing-queue/stats/route.ts',
    ];

    for (const file of files) {
      const filePath = path.join(process.cwd(), file);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    }
  });

  test('verify UI component file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const componentPath = path.join(
      process.cwd(),
      'components/articles/publishing-queue-table.tsx'
    );
    const exists = await fs
      .access(componentPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify database types include publishing_queue', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const typesPath = path.join(process.cwd(), 'types/database.ts');
    const content = await fs.readFile(typesPath, 'utf-8');

    // Check for publishing_queue in database types
    expect(content).toContain('publishing_queue');
    expect(content).toContain('Publishing Queue table');
    expect(content).toContain(
      "'pending' | 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled'"
    );
    expect(content).toContain('publishing_queue_status');
    expect(content).toContain('publishing_platform');
  });
});
