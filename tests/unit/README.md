# Unit Testing with Vitest

This directory contains unit tests using [Vitest](https://vitest.dev/).

## Running Tests

```bash
# Run all unit tests once
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage report
npm run test:unit:coverage

# Run all tests (unit + E2E)
npm run test:all
```

## Test Structure

- `tests/unit/` - Vitest unit tests (`.test.ts` files)
- `tests/mocks/` - Common mock objects for Supabase, Stripe, environment variables
- `tests/utils/` - Playwright test utilities (for E2E tests)
- `tests/setup.ts` - Global Vitest setup file

## Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Feature name', () => {
  it('should do something', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
```

## Test Utilities

Import helper functions from the test utilities file:

```typescript
import {
  createMockFn,
  createMockResponse,
  spyOnConsole,
} from './vitest-helpers';
```

Available helpers:

- `createMockFn()` - Create a mock function
- `delay(ms)` - Create a delayed promise
- `createMockResponse(data, status)` - Create a mock Response object
- `createMockRequest(body, options)` - Create a mock Request object
- `assertThrows(fn, message)` - Assert a promise rejects
- `spyOnConsole()` - Spy on console methods

## Mocks

Common mocks are available in `tests/mocks/`:

```typescript
import { createMockSupabaseClient } from '../mocks/supabase';
import { createMockStripeClient } from '../mocks/stripe';
import { mockEnv, setupMockEnv } from '../mocks/env';
```
