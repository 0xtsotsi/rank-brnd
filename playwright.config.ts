// @ts-nocheck - playwright-bdd package type issue
import { defineConfig, devices } from '@playwright/test';
import { defineConfig as defineBddConfig } from 'playwright-bdd';

/**
 * Playwright Configuration
 * See https://playwright.dev/docs/test-configuration.
 *
 * Test Organization:
 * - tests/fixtures/ - Reusable test fixtures (auth, supabase, etc.)
 * - tests/utils/ - Helper functions and selectors
 * - tests/mocks/ - Mock data and API handlers
 * - tests/*.spec.ts - E2E test files
 * - tests/unit/ - Unit test files
 *
 * Responsive Testing Projects:
 * - Desktop projects test at 1024px, 1280px, and 1536px
 * - Tablet projects test at 768px and 1024px
 * - Mobile projects test at 375px, 640px with device emulation
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['list'],
  ],

  // Shared settings for all tests
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Capture logs on failure
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Desktop Chrome - Default
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Desktop - Small (1024px)
    {
      name: 'desktop-small',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 1080 },
      },
    },

    // Desktop - Medium (1280px)
    {
      name: 'desktop-medium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 1080 },
      },
    },

    // Desktop - Large (1536px)
    {
      name: 'desktop-large',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1536, height: 1080 },
      },
    },

    // Tablet - Portrait (768px)
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },

    // Tablet - Landscape (1024px)
    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 1024, height: 768 },
      },
    },

    // Mobile - Small (375px - iPhone SE)
    {
      name: 'mobile-small',
      use: { ...devices['iPhone SE'] },
    },

    // Mobile - Medium (390px - iPhone 14)
    {
      name: 'mobile-medium',
      use: { ...devices['iPhone 14'] },
    },

    // Mobile - Large (640px - Pixel 5)
    {
      name: 'mobile-large',
      use: { ...devices['Pixel 5'] },
    },

    // Mobile Safari for iOS testing
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output directories
  outputDir: 'test-results',

  // Global setup and teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
});
