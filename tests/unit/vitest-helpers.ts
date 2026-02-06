/**
 * Vitest Unit Test Helpers
 *
 * Common utility functions for Vitest unit tests.
 */

import { vi } from 'vitest';

/**
 * Creates a mock function that tracks its calls
 */
export function createMockFn<T extends (...args: any[]) => any>(
  implementation?: T
): ReturnType<typeof vi.fn<T>> {
  return vi.fn(implementation);
}

/**
 * Creates a delayed promise for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock response object for API tests
 */
export function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'content-type': 'application/json',
    }),
    body: null,
    url: '',
    redirected: false,
    statusText: status === 200 ? 'OK' : 'Error',
    type: 'basic',
    clone: function (): Response {
      throw new Error('Function not implemented.');
    },
    arrayBuffer: async (): Promise<ArrayBuffer> => new ArrayBuffer(0),
    blob: async (): Promise<Blob> => new Blob(),
    formData: async (): Promise<FormData> => new FormData(),
  } as Response;
}

/**
 * Creates a mock request object for API tests
 */
export function createMockRequest(
  body: unknown,
  options: { method?: string; headers?: Record<string, string> } = {}
): Request {
  return {
    method: options.method ?? 'GET',
    headers: new Headers(options.headers ?? {}),
    json: async () => body,
    text: async () => JSON.stringify(body),
    body: JSON.stringify(body),
    url: 'http://localhost:3000',
    mode: 'cors',
    credentials: 'same-origin',
    cache: 'default',
    redirect: 'follow',
    referrer: '',
    referrerPolicy: 'no-referrer',
    integrity: '',
    keepalive: false,
    signal: new AbortController().signal,
    clone: function (): Request {
      throw new Error('Function not implemented.');
    },
    arrayBuffer: async (): Promise<ArrayBuffer> => new ArrayBuffer(0),
    blob: async (): Promise<Blob> => new Blob(),
    formData: async (): Promise<FormData> => new FormData(),
  } as unknown as Request;
}

/**
 * Asserts that a promise rejects with an error matching the given message
 */
export async function assertThrows(
  fn: () => Promise<any>,
  message?: string | RegExp
): Promise<Error> {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  if (!error) {
    throw new Error('Expected function to throw');
  }

  if (message) {
    if (typeof message === 'string') {
      if (!error.message.includes(message)) {
        throw new Error(
          `Expected error message to include "${message}", but got "${error.message}"`
        );
      }
    } else {
      if (!message.test(error.message)) {
        throw new Error(
          `Expected error message to match ${message}, but got "${error.message}"`
        );
      }
    }
  }

  return error;
}

/**
 * Spy on console methods to capture output during tests
 */
export function spyOnConsole() {
  const spies = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  };

  const restore = () => {
    Object.values(spies).forEach((spy) => spy.mockRestore());
  };

  return { spies, restore };
}

/**
 * Creates a mock Supabase client
 */
export function createMockSupabaseClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          data: null,
          error: null,
        })),
        data: [],
        error: null,
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
        data: null,
        error: null,
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    auth: {
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  };
}

/**
 * Creates a mock Clerk client
 */
export function createMockClerkClient() {
  return {
    auth: {
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      getToken: vi.fn(() => Promise.resolve('test-token')),
    },
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddress: 'test@example.com',
    },
  };
}
