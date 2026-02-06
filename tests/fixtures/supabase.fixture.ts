import { test as base } from '@playwright/test';

/**
 * Supabase client fixture for Playwright tests
 *
 * Provides direct Supabase access for test setup/teardown
 */

export interface SupabaseFixtures {
  supabase: {
    createTestUser: (
      email: string,
      password: string
    ) => Promise<{ id: string; email: string }>;
    deleteTestUser: (userId: string) => Promise<void>;
    cleanTestData: (userId: string) => Promise<void>;
  };
}

export const test = base.extend<SupabaseFixtures>({
  supabase: async ({}, use) => {
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const client = createClient(supabaseUrl, supabaseKey);

    const helpers = {
      async createTestUser(email: string, password: string) {
        const { data, error } = await client.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        return { id: data.user?.id || '', email: data.user?.email || '' };
      },

      async deleteTestUser(userId: string) {
        const { error } = await client.auth.admin.deleteUser(userId);
        if (error) throw error;
      },

      async cleanTestData(userId: string) {
        // Clean up test data from all tables
        const tables = [
          'articles',
          'keywords',
          'organizations',
          'onboarding_progress',
        ];

        for (const table of tables) {
          await client.from(table).delete().eq('user_id', userId);
        }
      },
    };

    await use(helpers);
  },
});

export { expect } from '@playwright/test';
