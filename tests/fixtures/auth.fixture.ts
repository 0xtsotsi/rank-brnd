import { test as base } from '@playwright/test';

/**
 * Authentication fixtures for Playwright tests
 *
 * Provides authenticated page context and helper methods
 */

export interface AuthFixtures {
  authenticatedPage: import('@playwright/test').Page;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Check if user is already logged in via localStorage
    const isLoggedIn = await page.evaluate(() => {
      const token = localStorage.getItem('clerk_session');
      return !!token;
    });

    if (!isLoggedIn) {
      // Navigate to sign in
      await page.goto('/sign-in');
      // Note: Actual login would be handled by test-specific credentials
    }

    await use(page);
  },

  login: async ({ page }, use) => {
    const loginFunc = async (
      email = 'test@example.com',
      password = 'password'
    ) => {
      await page.goto('/sign-in');

      // Clerk handles the login form
      // This is a placeholder for the actual login flow
      // Tests should implement specific login logic based on auth provider
    };
    await use(loginFunc);
  },

  logout: async ({ page }, use) => {
    const logoutFunc = async () => {
      await page.goto('/');
      // Click logout button or clear session
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    };
    await use(logoutFunc);
  },
});

export { expect } from '@playwright/test';
