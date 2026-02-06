/**
 * API Integration Test Helpers
 *
 * Provides utilities for testing API endpoints with real HTTP requests
 * using Playwright's APIRequestContext.
 */

import { APIRequestContext, APIResponse } from '@playwright/test';

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface TestUser {
  id: string;
  email: string;
  organizationId?: string;
  role?: string;
}

/**
 * Helper class for API integration testing
 */
export class ApiIntegrationHelpers {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly baseURL: string = 'http://localhost:3000'
  ) {}

  /**
   * Make an authenticated API request
   */
  protected async authenticatedRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    tokens: AuthTokens,
    body?: any,
    headers?: Record<string, string>
  ): Promise<APIResponse> {
    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (tokens.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    const options: any = {
      method,
      headers: requestHeaders,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.data = body;
    }

    return await this.request.fetch(url, options);
  }

  /**
   * Parse JSON response safely
   */
  async parseResponse<T = any>(response: APIResponse): Promise<T> {
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Assert response status matches expected
   */
  assertStatus(response: APIResponse, expectedStatus: number): void {
    if (response.status() !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus} but got ${response.status()}`
      );
    }
  }

  /**
   * Create a test user with authentication
   */
  async createTestUser(
    overrides: Partial<TestUser> = {}
  ): Promise<TestUser & { tokens: AuthTokens }> {
    return {
      id: overrides.id || `test-user-${Date.now()}`,
      email: overrides.email || `test-${Date.now()}@example.com`,
      organizationId: overrides.organizationId || `test-org-${Date.now()}`,
      role: overrides.role || 'owner',
      tokens: {
        userId: overrides.id || `test-user-${Date.now()}`,
      },
    } as any;
  }

  /**
   * Create a test organization
   */
  async createTestOrganization(
    overrides: Partial<TestOrganization> = {}
  ): Promise<TestOrganization> {
    return {
      id: overrides.id || `test-org-${Date.now()}`,
      name: overrides.name || `Test Organization ${Date.now()}`,
      slug: overrides.slug || `test-org-${Date.now()}`,
    };
  }

  /**
   * Generate a unique test identifier
   */
  generateTestId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Test response interface
 */
export interface TestResponse<T = any> {
  status: number;
  ok: boolean;
  data: T;
  headers: Record<string, string>;
}

/**
 * Extended API helper with typed responses
 */
export class TypedApiHelper extends ApiIntegrationHelpers {
  /**
   * GET request with typed response
   */
  async get<T = any>(
    endpoint: string,
    tokens?: AuthTokens
  ): Promise<TestResponse<T>> {
    const response = tokens
      ? await this.authenticatedRequest('GET', endpoint, tokens)
      : await this.request.fetch(`${this.baseURL}${endpoint}`);

    return {
      status: response.status(),
      ok: response.ok(),
      data: await this.parseResponse<T>(response),
      headers: response.headers(),
    };
  }

  /**
   * POST request with typed response
   */
  async post<T = any>(
    endpoint: string,
    body: any,
    tokens?: AuthTokens
  ): Promise<TestResponse<T>> {
    const response = tokens
      ? await this.authenticatedRequest('POST', endpoint, tokens, body)
      : await this.request.post(`${this.baseURL}${endpoint}`, { data: body });

    return {
      status: response.status(),
      ok: response.ok(),
      data: await this.parseResponse<T>(response),
      headers: response.headers(),
    };
  }

  /**
   * PUT request with typed response
   */
  async put<T = any>(
    endpoint: string,
    body: any,
    tokens?: AuthTokens
  ): Promise<TestResponse<T>> {
    const response = tokens
      ? await this.authenticatedRequest('PUT', endpoint, tokens, body)
      : await this.request.put(`${this.baseURL}${endpoint}`, { data: body });

    return {
      status: response.status(),
      ok: response.ok(),
      data: await this.parseResponse<T>(response),
      headers: response.headers(),
    };
  }

  /**
   * PATCH request with typed response
   */
  async patch<T = any>(
    endpoint: string,
    body: any,
    tokens?: AuthTokens
  ): Promise<TestResponse<T>> {
    const response = tokens
      ? await this.authenticatedRequest('PATCH', endpoint, tokens, body)
      : await this.request.fetch(`${this.baseURL}${endpoint}`, {
          method: 'PATCH',
          data: body,
        });

    return {
      status: response.status(),
      ok: response.ok(),
      data: await this.parseResponse<T>(response),
      headers: response.headers(),
    };
  }

  /**
   * DELETE request with typed response
   */
  async delete<T = any>(
    endpoint: string,
    tokens?: AuthTokens
  ): Promise<TestResponse<T>> {
    const response = tokens
      ? await this.authenticatedRequest('DELETE', endpoint, tokens)
      : await this.request.delete(`${this.baseURL}${endpoint}`);

    return {
      status: response.status(),
      ok: response.ok(),
      data: await this.parseResponse<T>(response),
      headers: response.headers(),
    };
  }
}

/**
 * Create API integration helpers
 */
export function createApiHelpers(
  request: APIRequestContext,
  baseURL?: string
): TypedApiHelper {
  return new TypedApiHelper(request, baseURL);
}
