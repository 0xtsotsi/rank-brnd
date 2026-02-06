import { FullConfig } from '@playwright/test';

/**
 * Global test teardown
 *
 * Runs once after all tests
 */

async function globalTeardown(config: FullConfig) {
  console.log('All tests completed');
  console.log(`Test results available in: test-results/`);
  console.log(`HTML report available in: playwright-report/index.html`);
}

export default globalTeardown;
