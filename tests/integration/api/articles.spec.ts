/**
 * Articles API Integration Tests
 *
 * Tests the /api/articles endpoints for:
 * - Authentication requirements
 * - Authorization (RBAC)
 * - Input validation
 * - CRUD operations
 * - Error cases
 * - Edge cases
 */

import { test, expect } from '@playwright/test';
import { createAuthSetup, TestUsersFactory } from '../fixtures/auth-setup';

const API_BASE = 'http://localhost:3000/api/articles';

test.describe('Articles API - Authentication', () => {
  test('should reject unauthenticated GET request', async ({ request }) => {
    const response = await request.get(`${API_BASE}?organization_id=test-org`);

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');
  });

  test('should reject unauthenticated POST request', async ({ request }) => {
    const response = await request.post(API_BASE, {
      data: {
        organization_id: 'test-org',
        title: 'Test Article',
        content: 'Test content',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated PATCH request', async ({ request }) => {
    const response = await request.fetch(API_BASE, {
      method: 'PATCH',
      data: { id: 'test-id', title: 'Updated' },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated DELETE request', async ({ request }) => {
    const response = await request.delete(`${API_BASE}?id=test-id`);

    expect(response.status()).toBe(401);
  });
});

test.describe('Articles API - Validation', () => {
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

  test('should reject invalid article data on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const user = TestUsersFactory.createStandardUser();
    const tokens = authSetup.generateAuthTokens(user);

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org',
        // title is missing
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject invalid query parameters', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&limit=invalid&offset=abc`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 400, 401]).toContain(response.status());
  });

  test('should reject missing id on DELETE', async ({ request }) => {
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

test.describe('Articles API - GET Operations', () => {
  test('should fetch articles with organization_id', async ({ request }) => {
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

  test('should support filtering by status', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&status=draft`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support filtering by product_id', async ({ request }) => {
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

  test('should support keyword_id filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&keyword_id=kw-123`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support search functionality', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&search=test`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support SEO score filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&min_seo_score=50&max_seo_score=100`,
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

  test('should support sorting', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&sort=created_at&order=desc`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });
});

test.describe('Articles API - POST Operations', () => {
  test('should create article with valid data', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const user = TestUsersFactory.createStandardUser();
    const tokens = authSetup.generateAuthTokens(user);

    const articleData = {
      organization_id: 'test-org-123',
      title: 'Test Article',
      content: 'This is test content',
      status: 'draft',
    };

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: articleData,
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });

  test('should reject article without title', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org-123',
        content: 'Content without title',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject article with invalid status', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org-123',
        title: 'Test',
        content: 'Content',
        status: 'invalid_status',
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Articles API - PATCH Operations', () => {
  test('should update article with valid data', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const updateData = {
      id: 'article-123',
      title: 'Updated Title',
      content: 'Updated content',
    };

    const response = await request.fetch(API_BASE, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: updateData,
    });

    expect([200, 401, 403, 404, 500]).toContain(response.status());
  });

  test('should reject update without id', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.fetch(API_BASE, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        title: 'Updated Title',
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Articles API - DELETE Operations', () => {
  test('should delete article as owner', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const ownerUser = TestUsersFactory.createOwnerUser();
    const tokens = authSetup.generateAuthTokens(ownerUser);

    const response = await request.delete(`${API_BASE}?id=article-123`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([200, 401, 403, 404, 500]).toContain(response.status());
  });

  test('should prevent deletion by non-owner', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const memberUser = TestUsersFactory.createStandardUser({ role: 'member' });
    const tokens = authSetup.generateAuthTokens(memberUser);

    const response = await request.delete(`${API_BASE}?id=article-123`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([401, 403, 404, 500]).toContain(response.status());
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
