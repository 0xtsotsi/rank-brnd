import { Page, Route } from '@playwright/test';

/**
 * API route handlers for mocking backend responses
 *
 * Provides reusable handlers for common API endpoints
 */

export class ApiHandlers {
  constructor(private readonly page: Page) {}

  /**
   * Mock GET request
   */
  mockGet(endpoint: string, response: any, status = 200): void {
    this.page.route(`**${endpoint}**`, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock POST request
   */
  mockPost(endpoint: string, response: any, status = 200): void {
    this.page.route(`**${endpoint}**`, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock PUT request
   */
  mockPut(endpoint: string, response: any, status = 200): void {
    this.page.route(`**${endpoint}**`, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock DELETE request
   */
  mockDelete(
    endpoint: string,
    response: any = { success: true },
    status = 200
  ): void {
    this.page.route(`**${endpoint}**`, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock API error
   */
  mockError(
    endpoint: string,
    message = 'Internal Server Error',
    status = 500
  ): void {
    this.page.route(`**${endpoint}**`, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: status.toString(),
            message,
          },
        }),
      });
    });
  }

  /**
   * Mock network error
   */
  mockNetworkError(endpoint: string): void {
    this.page.route(`**${endpoint}**`, (route: Route) => {
      route.abort('failed');
    });
  }

  /**
   * Mock timeout
   */
  mockTimeout(endpoint: string): void {
    this.page.route(`**${endpoint}**`, () => {
      // Never fulfill, causing timeout
    });
  }

  /**
   * Mock with custom handler
   */
  mockCustom(
    endpoint: string,
    handler: (route: Route) => void | Promise<void>
  ): void {
    this.page.route(`**${endpoint}**`, handler);
  }

  /**
   * Remove all mocks
   */
  clearAllMocks(): void {
    this.page.unrouteAll();
  }

  /**
   * Mock specific endpoint with method
   */
  mockWithMethod(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    response: any,
    status = 200
  ): void {
    this.page.route(`**${endpoint}**`, (route: Route) => {
      const requestMethod = route.request().method();
      if (requestMethod === method) {
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } else {
        route.continue();
      }
    });
  }
}

/**
 * Common API endpoint mocks
 */
export class CommonApiMocks extends ApiHandlers {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Mock authentication endpoints
   */
  mockAuth(options: { isAuthenticated?: boolean; user?: any } = {}): void {
    const { isAuthenticated = true, user = null } = options;

    this.mockGet(
      '/api/user',
      isAuthenticated
        ? {
            success: true,
            data: user || {
              id: 'test-user-id',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
            },
          }
        : { success: false, error: { code: '401', message: 'Unauthorized' } },
      isAuthenticated ? 200 : 401
    );
  }

  /**
   * Mock articles API
   */
  mockArticles(articles: any[] = []): void {
    this.mockGet('/api/articles', {
      success: true,
      data: articles,
      pagination: {
        page: 1,
        perPage: 10,
        total: articles.length,
        totalPages: 1,
      },
    });
  }

  /**
   * Mock keywords API
   */
  mockKeywords(keywords: any[] = []): void {
    this.mockGet('/api/keywords', {
      success: true,
      data: keywords,
    });
  }

  /**
   * Mock onboarding API
   */
  mockOnboarding(progress: any = {}): void {
    this.mockGet('/api/onboarding', {
      success: true,
      data: {
        currentStep: 'welcome',
        completedSteps: [],
        skippedSteps: [],
        ...progress,
      },
    });
  }

  /**
   * Mock integrations API
   */
  mockIntegrations(integrations: any[] = []): void {
    this.mockGet('/api/integrations', {
      success: true,
      data: integrations,
    });
  }

  /**
   * Mock Supabase storage
   */
  mockStorageUpload(
    response: any = { success: true, path: '/test/path' }
  ): void {
    this.mockPost('/api/storage/upload', response);
  }
}

/**
 * Create API handlers instance
 */
export function createApiHandlers(page: Page): ApiHandlers {
  return new ApiHandlers(page);
}

/**
 * Create common API mocks instance
 */
export function createCommonApiMocks(page: Page): CommonApiMocks {
  return new CommonApiMocks(page);
}
