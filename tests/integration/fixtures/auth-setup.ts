/**
 * Authentication Setup for Integration Tests
 *
 * Provides utilities for setting up authentication state in tests.
 * This handles Clerk authentication mocking and token generation.
 */

import { APIRequestContext } from '@playwright/test';
import type { AuthTokens, TestUser } from '../api-integration-helpers';

export interface ClerkAuthState {
  userId: string;
  sessionId: string;
  orgId: string | null;
  role: string;
}

/**
 * Mock Clerk authentication for testing
 */
export class MockClerkAuth {
  constructor(private readonly request: APIRequestContext) {}

  /**
   * Generate a mock Clerk session token
   * In production, this would use actual Clerk testing tokens
   */
  generateSessionToken(user: Partial<TestUser> = {}): string {
    const header = btoa(
      JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
      })
    );

    const payload = btoa(
      JSON.stringify({
        sub: user.id || `user_${Date.now()}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        azp: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'test-key',
        sid: `sess_${Date.now()}`,
        email: user.email || 'test@example.com',
        primary_email_address_id: `email_${Date.now()}`,
        user: {
          id: user.id || `user_${Date.now()}`,
          primary_email_address_id: `email_${Date.now()}`,
          email_addresses: [
            {
              id: `email_${Date.now()}`,
              email_address: user.email || 'test@example.com',
              verification: { status: 'verified' as const },
            },
          ],
        },
        org: {
          role: user.role || 'org:member',
          orgId: user.organizationId || null,
        },
      })
    );

    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  }

  /**
   * Generate auth tokens for a test user
   */
  generateAuthTokens(user: Partial<TestUser> = {}): AuthTokens {
    return {
      accessToken: this.generateSessionToken(user),
      userId: user.id || `user_${Date.now()}`,
    };
  }

  /**
   * Create mock cookies for authenticated state
   */
  createAuthCookies(
    user: Partial<TestUser> = {}
  ): Array<{ name: string; value: string; domain: string; path: string }> {
    const sessionId = `sess_${Date.now()}`;
    const userId = user.id || `user_${Date.now()}`;

    return [
      {
        name: '__session',
        value: this.generateSessionToken(user),
        domain: 'localhost',
        path: '/',
      },
      {
        name: '__client_uat',
        value: Math.floor(Date.now() / 1000).toString(),
        domain: 'localhost',
        path: '/',
      },
    ];
  }
}

/**
 * Test users factory
 */
export class TestUsersFactory {
  /**
   * Create a standard test user
   */
  static createStandardUser(overrides: Partial<TestUser> = {}): TestUser {
    const userId = `user_${Date.now()}`;
    return {
      id: userId,
      email: overrides.email || `user_${userId.slice(-8)}@example.com`,
      organizationId: overrides.organizationId,
      role: overrides.role || 'member',
    };
  }

  /**
   * Create an admin test user
   */
  static createAdminUser(overrides: Partial<TestUser> = {}): TestUser {
    const userId = `admin_${Date.now()}`;
    return {
      id: userId,
      email: overrides.email || `admin_${userId.slice(-8)}@example.com`,
      organizationId: overrides.organizationId,
      role: overrides.role || 'admin',
    };
  }

  /**
   * Create an owner test user
   */
  static createOwnerUser(overrides: Partial<TestUser> = {}): TestUser {
    const userId = `owner_${Date.now()}`;
    return {
      id: userId,
      email: overrides.email || `owner_${userId.slice(-8)}@example.com`,
      organizationId: overrides.organizationId,
      role: overrides.role || 'owner',
    };
  }

  /**
   * Create users for each role level
   */
  static createRoleBasedUsers(orgId: string): Record<string, TestUser> {
    return {
      owner: this.createOwnerUser({ organizationId: orgId, role: 'owner' }),
      admin: this.createAdminUser({ organizationId: orgId, role: 'admin' }),
      member: this.createStandardUser({
        organizationId: orgId,
        role: 'member',
      }),
      viewer: this.createStandardUser({
        organizationId: orgId,
        role: 'viewer',
      }),
    };
  }
}

/**
 * Create auth setup instance
 */
export function createAuthSetup(request: APIRequestContext): MockClerkAuth {
  return new MockClerkAuth(request);
}
