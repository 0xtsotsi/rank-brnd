/**
 * Supabase Mocks
 *
 * Mock Supabase client and responses for testing.
 */

import { vi } from 'vitest';

/**
 * Mock Supabase user
 */
export const mockUser = {
  id: 'user-test123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock Supabase session
 */
export const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

/**
 * Mock Supabase error
 */
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

/**
 * Create a mock Supabase query builder
 */
function createMockQueryBuilder() {
  return {
    select: vi.fn(function (this: any) {
      return this;
    }),
    insert: vi.fn(function (this: any) {
      return this;
    }),
    update: vi.fn(function (this: any) {
      return this;
    }),
    delete: vi.fn(function (this: any) {
      return this;
    }),
    eq: vi.fn(function (this: any) {
      return this;
    }),
    neq: vi.fn(function (this: any) {
      return this;
    }),
    gt: vi.fn(function (this: any) {
      return this;
    }),
    gte: vi.fn(function (this: any) {
      return this;
    }),
    lt: vi.fn(function (this: any) {
      return this;
    }),
    lte: vi.fn(function (this: any) {
      return this;
    }),
    like: vi.fn(function (this: any) {
      return this;
    }),
    ilike: vi.fn(function (this: any) {
      return this;
    }),
    in: vi.fn(function (this: any) {
      return this;
    }),
    is: vi.fn(function (this: any) {
      return this;
    }),
    order: vi.fn(function (this: any) {
      return this;
    }),
    limit: vi.fn(function (this: any) {
      return this;
    }),
    range: vi.fn(function (this: any) {
      return this;
    }),
    single: vi.fn(function () {
      return { data: null, error: null };
    }),
    maybeSingle: vi.fn(function () {
      return { data: null, error: null };
    }),
    then: vi.fn(function (this: any, resolve: any) {
      resolve({ data: this.data ?? null, error: this.error ?? null });
      return this;
    }),
  };
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  const queryBuilder = createMockQueryBuilder();

  return {
    from: vi.fn(() => queryBuilder),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: mockUser }, error: null })
      ),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({
          data: { session: mockSession, user: mockUser },
          error: null,
        })
      ),
      signInWithOAuth: vi.fn(() =>
        Promise.resolve({ data: { url: 'https://test.com' }, error: null })
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      refreshSession: vi.fn(() =>
        Promise.resolve({ data: { session: mockSession }, error: null })
      ),
      updateUser: vi.fn(() =>
        Promise.resolve({ data: { user: mockUser }, error: null })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: mockSession }, error: null })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() =>
          Promise.resolve({ data: { path: 'test/path' }, error: null })
        ),
        download: vi.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://test.com/file' },
        })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
        list: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    },
    realtime: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({ subscribe: vi.fn() })),
        subscribe: vi.fn(),
      })),
    },
  };
}

/**
 * Create a mock Supabase response
 */
export function createMockResponse(
  data: unknown,
  error: SupabaseError | null = null
) {
  return { data, error };
}
