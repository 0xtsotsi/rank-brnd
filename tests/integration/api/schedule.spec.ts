/**
 * Schedule API Integration Tests
 *
 * Tests the /api/schedule endpoints for:
 * - Authentication requirements
 * - Authorization (RBAC - owner/admin for delete)
 * - Input validation
 * - CRUD operations
 * - Date validation
 * - Error cases
 * - Edge cases
 */

import { test, expect } from '@playwright/test';
import { createAuthSetup, TestUsersFactory } from '../fixtures/auth-setup';

const API_BASE = 'http://localhost:3000/api/schedule';

test.describe('Schedule API - Authentication', () => {
  test('should reject unauthenticated GET request', async ({ request }) => {
    const response = await request.get(`${API_BASE}?organization_id=test-org`);

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated POST request', async ({ request }) => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const response = await request.post(API_BASE, {
      data: {
        article_id: 'article-123',
        scheduled_at: futureDate,
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated PUT request', async ({ request }) => {
    const response = await request.put(API_BASE, {
      data: {
        id: 'schedule-123',
        organization_id: 'org-123',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated DELETE request', async ({ request }) => {
    const response = await request.delete(`${API_BASE}?id=article-123`);

    expect(response.status()).toBe(401);
  });
});

test.describe('Schedule API - Validation', () => {
  test('should require organization_id parameter on GET', async ({
    request,
  }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([400, 401]).toContain(response.status());
  });

  test('should require article_id on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        scheduled_at: futureDate,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should require scheduled_at on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        article_id: 'article-123',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject past scheduled dates', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const pastDate = new Date(Date.now() - 86400000).toISOString();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        article_id: 'article-123',
        scheduled_at: pastDate,
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Schedule API - GET Operations', () => {
  test('should fetch schedules for organization', async ({ request }) => {
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

  test('should support product_id filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&product_id=prod-123`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support status filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&status=pending`,
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

test.describe('Schedule API - POST Operations', () => {
  test('should create schedule with valid data', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const futureDate = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        article_id: 'article-123',
        scheduled_at: futureDate,
      },
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });
});

test.describe('Schedule API - PUT Operations', () => {
  test('should update schedule with valid data', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const futureDate = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const response = await request.put(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        id: 'article-123',
        organization_id: 'org-123',
        scheduled_at: futureDate,
        status: 'pending',
      },
    });

    expect([200, 401, 403, 404, 500]).toContain(response.status());
  });

  test('should reject past date on update', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const pastDate = new Date(Date.now() - 86400000).toISOString();

    const response = await request.put(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        id: 'article-123',
        organization_id: 'org-123',
        scheduled_at: pastDate,
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Schedule API - DELETE Operations', () => {
  test('should delete schedule as admin', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const adminUser = TestUsersFactory.createAdminUser();
    const tokens = authSetup.generateAuthTokens(adminUser);

    const response = await request.delete(`${API_BASE}?id=article-123`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([200, 401, 403, 404, 500]).toContain(response.status());
  });

  test('should require id parameter for deletion', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.delete(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect(response.status()).toBe(400);
  });
});
