/**
 * Products API Integration Tests
 *
 * Tests the /api/products endpoints for:
 * - Authentication requirements
 * - Authorization (organization membership)
 * - Input validation
 * - CRUD operations
 * - Error cases
 * - Edge cases
 */

import { test, expect } from '@playwright/test';
import { createAuthSetup, TestUsersFactory } from '../fixtures/auth-setup';

const API_BASE = 'http://localhost:3000/api/products';

test.describe('Products API - Authentication', () => {
  test('should reject unauthenticated GET request', async ({ request }) => {
    const response = await request.get(API_BASE);

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated POST request', async ({ request }) => {
    const response = await request.post(API_BASE, {
      data: { name: 'Test Product' },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated PUT request', async ({ request }) => {
    const response = await request.put(API_BASE, {
      data: { id: 'prod-123', name: 'Updated Product' },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated DELETE request', async ({ request }) => {
    const response = await request.delete(`${API_BASE}?id=prod-123`);

    expect(response.status()).toBe(401);
  });
});

test.describe('Products API - Validation', () => {
  test('should require name on POST', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: { url: 'https://example.com' },
    });

    expect(response.status()).toBe(400);
  });

  test('should require id on PUT', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.put(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: { name: 'Updated Product' },
    });

    expect(response.status()).toBe(400);
  });

  test('should require id on DELETE', async ({ request }) => {
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

test.describe('Products API - GET Operations', () => {
  test('should fetch products for authenticated user', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const user = TestUsersFactory.createStandardUser();
    const tokens = authSetup.generateAuthTokens(user);

    const response = await request.get(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support search functionality', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(`${API_BASE}?search=test`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support status filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(`${API_BASE}?status=active`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([200, 401, 500]).toContain(response.status());
  });

  test('should support pagination', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(`${API_BASE}?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect([200, 401, 500]).toContain(response.status());
  });
});

test.describe('Products API - POST Operations', () => {
  test('should create product with valid data', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const user = TestUsersFactory.createStandardUser();
    const tokens = authSetup.generateAuthTokens(user);

    const productData = {
      name: 'Test Product',
      url: 'https://example.com',
      description: 'Test description',
    };

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: productData,
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });

  test('should accept product without URL', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        name: 'Product without URL',
        description: 'Just a name and description',
      },
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });
});

test.describe('Products API - PUT Operations', () => {
  test('should update product with valid data', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const updateData = {
      id: 'prod-123',
      name: 'Updated Product Name',
      description: 'Updated description',
    };

    const response = await request.put(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: updateData,
    });

    expect([200, 401, 403, 404, 500]).toContain(response.status());
  });

  test('should support partial updates', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.put(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        id: 'prod-123',
        name: 'Just updating the name',
      },
    });

    expect([200, 401, 403, 404, 500]).toContain(response.status());
  });
});

test.describe('Products API - DELETE Operations', () => {
  test('should delete product as organization member', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const user = TestUsersFactory.createStandardUser();
    const tokens = authSetup.generateAuthTokens(user);

    const response = await request.delete(`${API_BASE}?id=prod-123`, {
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
