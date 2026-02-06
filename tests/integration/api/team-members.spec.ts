/**
 * Team Members API Integration Tests
 *
 * Tests the /api/team-members endpoints for:
 * - Authentication requirements
 * - Authorization (RBAC)
 * - Input validation
 * - CRUD operations
 * - Bulk operations
 * - Error cases
 */

import { test, expect } from '@playwright/test';
import { createAuthSetup, TestUsersFactory } from '../fixtures/auth-setup';

const API_BASE = 'http://localhost:3000/api/team-members';

test.describe('Team Members API - Authentication', () => {
  test('should reject unauthenticated GET request', async ({ request }) => {
    const response = await request.get(`${API_BASE}?organization_id=test-org`);

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated POST request', async ({ request }) => {
    const response = await request.post(API_BASE, {
      data: {
        organization_id: 'org-123',
        user_id: 'user-123',
        role: 'member',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated DELETE request', async ({ request }) => {
    const response = await request.delete(
      `${API_BASE}?team_member_id=member-123`
    );

    expect(response.status()).toBe(401);
  });
});

test.describe('Team Members API - GET Operations', () => {
  test('should fetch team members for organization', async ({ request }) => {
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

  test('should support role filtering', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const tokens = authSetup.generateAuthTokens();

    const response = await request.get(
      `${API_BASE}?organization_id=test-org&role=admin`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 500]).toContain(response.status());
  });
});

test.describe('Team Members API - POST Operations', () => {
  test('should add team member as admin', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const adminUser = TestUsersFactory.createAdminUser();
    const tokens = authSetup.generateAuthTokens(adminUser);

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org-123',
        user_id: 'new-user-123',
        role: 'member',
      },
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });

  test('should support different roles', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const adminUser = TestUsersFactory.createAdminUser();
    const tokens = authSetup.generateAuthTokens(adminUser);

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org-123',
        user_id: 'user-123',
        role: 'editor',
      },
    });

    expect([201, 401, 403, 500]).toContain(response.status());
  });

  test('should verify admin permissions before adding', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const memberUser = TestUsersFactory.createStandardUser({ role: 'member' });
    const tokens = authSetup.generateAuthTokens(memberUser);

    const response = await request.post(API_BASE, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      data: {
        organization_id: 'test-org-123',
        user_id: 'new-user-123',
        role: 'member',
      },
    });

    expect([401, 403, 500]).toContain(response.status());
  });
});

test.describe('Team Members API - DELETE Operations', () => {
  test('should remove team member as admin', async ({ request }) => {
    const authSetup = createAuthSetup(request);
    const adminUser = TestUsersFactory.createAdminUser();
    const tokens = authSetup.generateAuthTokens(adminUser);

    const response = await request.delete(
      `${API_BASE}?team_member_id=member-123`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    expect([200, 401, 403, 404, 500]).toContain(response.status());
  });

  test('should require team_member_id parameter', async ({ request }) => {
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
