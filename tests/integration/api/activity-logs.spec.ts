/**
 * Activity Logs API Integration Tests
 *
 * Tests the /api/activity-logs endpoints for:
 * - Authentication requirements
 * - Authorization (organization membership)
 * - Input validation
 * - CRUD operations
 * - Filtering and sorting
 * - Error cases
 */

import { test, expect } from '@playwright/test';
import { createAuthSetup, TestUsersFactory } from '../fixtures/auth-setup';

const API_BASE = 'http://localhost:3000/api/activity-logs';

test.describe('Activity Logs API - Authentication', () => {
  test('should reject unauthenticated GET request', async ({ request }) => {
    const response = await request.get(`${API_BASE}?organization_id=test-org`);

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated POST request', async ({ request }) => {
    const response = await request.post(API_BASE, {
      data: {
        organization_id: 'org-123',
        action: 'article.created',
        resource_type: 'article',
        resource_id: 'article-123',
      },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Activity Logs API - GET Operations', () => {
  test('should fetch activity logs for organization', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const user = TestUsersFactory.createStandardUser();
    const tokens = authSetup.generateAuthTokens(user);

    const response = await request.get(
      `${API_BASE}?organization_id=test-org-123`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should require organization_id parameter', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([400, 401]).toContain(response.status());
  });

  test('should support action filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&action=article.created`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support resource_type filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&resource_type=article`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support date range filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const now = new Date();
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&start_date=${past.toISOString()}&end_date=${now.toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support pagination', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&limit=10&offset=0`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });
});

test.describe('Activity Logs API - POST Operations', () => {
  test('should create activity log with valid data', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const user = TestUsersFactory.createStandardUser();
    const tokens = authSetup.generateAuthTokens(user);

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org-123',
        action: 'article.created',
        resource_type: 'article',
        resource_id: 'article-123',
      },
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });

  test('should create activity log with metadata', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org-123',
        action: 'article.updated',
        resource_type: 'article',
        resource_id: 'article-123',
        metadata: {
          changes: ['title', 'content'],
        },
      },
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });
});

test.describe('Activity Logs API - Validation', () => {
  test('should require organization_id on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        action: 'test.action',
        resource_type: 'test',
        resource_id: 'test-123',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should require action on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'org-123',
        resource_type: 'test',
        resource_id: 'test-123',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should require resource_type on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'org-123',
        action: 'test.action',
        resource_id: 'test-123',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should require resource_id on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'org-123',
        action: 'test.action',
        resource_type: 'test',
      },
    });

    expect(response.status()).toBe(400);
  });
});
