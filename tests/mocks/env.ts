/**
 * Environment Variable Mocks
 *
 * Mock environment variables for testing.
 */

export const mockEnv = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-phc-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'http://localhost:3000',

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test-clerk-key',
  CLERK_SECRET_KEY: 'test-clerk-secret',

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'test-stripe-key',
  STRIPE_SECRET_KEY: 'test-stripe-secret',
  STRIPE_WEBHOOK_SECRET: 'test-webhook-secret',
};

/**
 * Set up mocked environment variables
 */
export function setupMockEnv(): void {
  Object.entries(mockEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

/**
 * Clean up mocked environment variables
 */
export function cleanupMockEnv(): void {
  Object.keys(mockEnv).forEach((key) => {
    delete process.env[key];
  });
}
