/**
 * Test utilities and fixtures barrel export
 *
 * Import commonly used test utilities from this file
 */

// Fixtures
export * from './fixtures/auth.fixture';
export * from './fixtures/supabase.fixture';

// Utils
export * from './utils/test-helpers';
export * from './utils/selectors';

// Mocks
export * from './mocks/test-data';
export * from './mocks/api-handlers';

// Re-export Playwright basics
export { test, expect } from '@playwright/test';
