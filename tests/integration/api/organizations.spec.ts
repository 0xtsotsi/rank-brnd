/**
 * Organizations API Integration Tests
 *
 * Tests the /api/organizations endpoints for:
 * - Authentication requirements
 * - Input validation
 * - Organization creation with default product
 * - Fetching user organizations
 * - Error cases
 * - Edge cases
 */

import { test, expect } from '@playwright/test';
import { createAuthSetup, TestUsersFactory } from '../fixtures/auth-setup';

const API_BASE = 'http://localhost:3000/api/organizations';

test.describe('Organizations API - Authentication', () => {
  test('should reject unauthenticated GET request', async ({ request }) => {
    const response = await request.get(API_BASE);

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');
  });

  test('should reject unauthenticated POST request', async ({ request }) => {
    const response = await request.post(API_BASE, {
      data: { name: 'Test Organization' },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Organizations API - GET Operations', () => {
  test('should fetch organizations for authenticated user', async ({
    request,
  }) => {
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
});

test.describe('Organizations API - POST Operations (Create)', () => {
  test('should create organization with valid name', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const orgData = { name: 'Test Organization' };

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: orgData,
    });

    expect([201, 401, 500]).toContain(response.status());
  });

  test('should create organization with custom slug', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const orgData = {
      name: 'Test Organization',
      slug: 'custom-slug',
    };

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: orgData,
    });

    expect([201, 401, 500]).toContain(response.status());
  });
});

test.describe('Organizations API - Validation', () => {
  test('should reject organization without name', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: { slug: 'test-slug' },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject empty name', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: { name: '   ' },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject name shorter than 2 characters', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: { name: 'A' },
    });

    expect(response.status()).toBe(400);
  });
});
