// @ts-nocheck - NODE_ENV readonly issue with TypeScript 5+
/**
 * Vitest Setup File
 *
 * This file runs before each test file and sets up the testing environment.
 */

import { vi } from 'vitest';

// Note: Environment variables are handled by vitest config
// process.env.NODE_ENV = 'test'  // Removed - TypeScript 5+ sees this as read-only
// process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3007'  // Removed

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Global test utilities
declare global {
  const vi: typeof import('vitest').vi;
}

// Setup cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
