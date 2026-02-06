# Test Suite Documentation

This directory contains the Playwright E2E test suite for Rank.brnd.

## Directory Structure

```
tests/
├── fixtures/         # Reusable test fixtures
│   ├── auth.fixture.ts
│   └── supabase.fixture.ts
├── utils/            # Helper functions and selectors
│   ├── test-helpers.ts
│   └── selectors.ts
├── mocks/            # Mock data and API handlers
│   ├── test-data.ts
│   └── api-handlers.ts
├── *.spec.ts         # E2E test files
└── global-setup.ts   # Global test setup
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in headed mode (see browser)
pnpm test:headed

# Run specific test file
pnpm test tests/onboarding-verification.spec.ts

# Run tests matching a pattern
pnpm test --grep "onboarding"

# Run tests with UI mode
pnpm exec playwright test --ui
```

## Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Using Test Helpers

```typescript
import { test, expect } from '@playwright/test';
import { createTestHelpers, Selectors } from './utils/test-helpers';

test('using helpers', async ({ page }) => {
  const helpers = createTestHelpers(page);

  await helpers.navigateAndWait('/dashboard');
  await helpers.assertVisible(Selectors.dashboardHeading);
});
```

### Using Mock Data

```typescript
import { test } from '@playwright/test';
import { MockArticles, MockUsers } from './mocks/test-data';

test('with mock data', async ({ page }) => {
  const article = MockArticles.published;
  // Use article data in test
});
```

### Using API Handlers

```typescript
import { test } from '@playwright/test';
import { createCommonApiMocks } from './mocks/api-handlers';

test.use({
  // Mock API response
  beforeEach: async ({ page }) => {
    const mocks = createCommonApiMocks(page);
    mocks.mockArticles([]);
  },
});
```

## Fixtures

### Auth Fixture

Provides authentication helpers:

```typescript
import { test } from './fixtures/auth.fixture';

test('authenticated test', async ({ authenticatedPage }) => {
  // Page is already authenticated
});
```

### Supabase Fixture

Provides Supabase client helpers:

```typescript
import { test } from './fixtures/supabase.fixture';

test('database test', async ({ supabase }) => {
  const user = await supabase.createTestUser('test@example.com', 'password');
  await supabase.deleteTestUser(user.id);
});
```

## Selectors

Use predefined selectors for consistency:

```typescript
import { Selectors } from './utils/selectors';

await page.click(Selectors.submitButton);
await expect(page.locator(Selectors.toast)).toBeVisible();
```

## Environment Variables

Required for some tests:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

Create a `.env` file in the project root with these values.

## Test Results

- HTML Report: `playwright-report/index.html`
- JSON Results: `test-results/test-results.json`
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`
- Traces: `test-results/traces/`
