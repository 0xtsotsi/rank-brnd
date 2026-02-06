/**
 * API Client
 *
 * Centralized API client with request/response interceptors,
 * error handling, CSRF token management, and auth headers.
 */

interface APIRequestInit extends RequestInit {
  skipAuth?: boolean;
  skipCSRF?: boolean;
}

interface APIError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

class APIClient {
  private baseURL: string;
  private csrfToken: string | null = null;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.loadCSRFToken();
  }

  /**
   * Load CSRF token from meta tag or cookie
   */
  private loadCSRFToken() {
    if (typeof window === 'undefined') return;

    // Try to get CSRF token from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag instanceof HTMLMetaElement) {
      this.csrfToken = metaTag.getAttribute('content');
    }
  }

  /**
   * Get auth token from storage (implement based on your auth system)
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // If using Clerk, it handles auth automatically
    // For custom auth, you might get it from localStorage or cookies
    // Example: return localStorage.getItem('auth_token');
    return null;
  }

  /**
   * Build request with interceptors
   */
  private async buildRequest(
    endpoint: string,
    init: APIRequestInit = {}
  ): Promise<Request> {
    const { skipAuth = false, skipCSRF = false, ...requestInit } = init;
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseURL}${endpoint}`;

    // Build headers with auth and CSRF
    const headers: HeadersInit = { ...this.defaultHeaders };

    // Add auth header (if not skipped)
    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add CSRF token (if not skipped)
    if (!skipCSRF && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    // Merge with provided headers
    if (requestInit.headers) {
      Object.assign(headers, requestInit.headers);
    }

    return new Request(url, {
      ...requestInit,
      headers,
    });
  }

  /**
   * Handle response with error parsing
   */
  private async handleResponse(response: Response): Promise<unknown> {
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Try to parse JSON
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        const error: APIError = {
          message: data.message || data.error || 'An error occurred',
          status: response.status,
          code: data.code,
          details: data.details,
        };
        throw error;
      }

      return data;
    }

    // Handle non-JSON responses
    if (!response.ok) {
      const error: APIError = {
        message: response.statusText || 'An error occurred',
        status: response.status,
      };
      throw error;
    }

    return response.text();
  }

  /**
   * Generic fetch method
   */
  async fetch<T = unknown>(
    endpoint: string,
    init?: APIRequestInit
  ): Promise<T> {
    try {
      const request = await this.buildRequest(endpoint, init);
      const response = await fetch(request);
      const data = (await this.handleResponse(response)) as T;
      return data;
    } catch (error) {
      // Re-throw API errors
      if (this.isAPIError(error)) {
        throw error;
      }

      // Wrap network errors
      const apiError: APIError = {
        message: error instanceof Error ? error.message : 'Network error',
        details: error,
      };
      throw apiError;
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    endpoint: string,
    init?: Omit<APIRequestInit, 'method' | 'body'>
  ): Promise<T> {
    return this.fetch<T>(endpoint, { ...init, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    init?: Omit<APIRequestInit, 'method'>
  ): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...init,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    init?: Omit<APIRequestInit, 'method'>
  ): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...init,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    init?: Omit<APIRequestInit, 'method'>
  ): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...init,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    endpoint: string,
    init?: Omit<APIRequestInit, 'method' | 'body'>
  ): Promise<T> {
    return this.fetch<T>(endpoint, { ...init, method: 'DELETE' });
  }

  /**
   * Type guard for API errors
   */
  private isAPIError(error: unknown): error is APIError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as APIError).message === 'string'
    );
  }

  /**
   * Update CSRF token (call after login/Register if needed)
   */
  updateCSRFToken(token: string) {
    this.csrfToken = token;
  }
}

// Singleton instance
let apiClientInstance: APIClient | null = null;

export function getAPIClient(): APIClient {
  if (!apiClientInstance) {
    apiClientInstance = new APIClient();
  }
  return apiClientInstance;
}

// Export default instance
export const apiClient = getAPIClient();

// Export types
export type { APIError, APIRequestInit };
