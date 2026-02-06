/**
 * Supabase Client Configuration
 *
 * This file provides different Supabase client instances for various use cases:
 * - Browser client: For client-side operations with anon key (respects RLS)
 * - Server client: For server-side operations with service role key (bypasses RLS)
 *
 * Security Note: We use environment variables and avoid storing tokens in localStorage
 * to protect against XSS vulnerabilities.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Validates that required Supabase environment variables are set
 */
function validateEnvVars(
  url: string | undefined,
  key: string | undefined,
  context: 'browser' | 'server'
): asserts url is string {
  if (!url) {
    throw new Error(
      `Missing NEXT_PUBLIC_SUPABASE_URL environment variable for ${context} client`
    );
  }
  if (!key) {
    throw new Error(
      `Missing ${context === 'browser' ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY'} environment variable for ${context} client`
    );
  }
}

/**
 * Browser Supabase Client
 *
 * Use this client for client-side operations. It uses the anon key
 * and respects Row Level Security (RLS) policies.
 *
 * IMPORTANT: This client should only be used in browser/client components.
 */
let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  validateEnvVars(supabaseUrl, supabaseAnonKey, 'browser');

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey!, {
    auth: {
      // Use more secure storage options
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/**
 * Server Supabase Client
 *
 * Use this client for server-side operations. It uses the service role key
 * and BYPASSES Row Level Security (RLS) policies.
 *
 * WARNING: Never expose this client or the service role key to the browser.
 * Only use this in:
 * - API routes
 * - Server components
 * - Server actions
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  // Validate that we're running on the server
  if (typeof window !== 'undefined') {
    throw new Error(
      'getSupabaseServerClient should only be called on the server'
    );
  }

  validateEnvVars(supabaseUrl, supabaseServiceRoleKey, 'server');

  // Create a new client for each server request to avoid issues with
  // shared state across requests
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Type-safe way to get the storage client from Supabase
 */
export function getStorageClient(client: SupabaseClient<Database>) {
  return client.storage;
}

export type { SupabaseClient };
