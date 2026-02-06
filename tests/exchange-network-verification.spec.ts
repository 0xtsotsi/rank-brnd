/**
 * Exchange Network Verification Test
 *
 * This is a temporary verification test to ensure the exchange network feature works correctly.
 * After successful verification, this test should be deleted.
 */

import { test, expect } from '@playwright/test';

test.describe('Exchange Network Feature', () => {
  test('verify database migration file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260205_create_exchange_network_table.sql'
    );
    const exists = await fs
      .access(migrationPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify database migration has required elements', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260205_create_exchange_network_table.sql'
    );
    const content = await fs.readFile(migrationPath, 'utf-8');

    // Check for key elements
    expect(content).toContain('CREATE TABLE IF NOT EXISTS exchange_network');
    expect(content).toContain('exchange_network_status');
    expect(content).toContain('organization_id');
    expect(content).toContain('product_id');
    expect(content).toContain('site_id');
    expect(content).toContain('domain');
    expect(content).toContain('authority');
    expect(content).toContain('niche');
    expect(content).toContain('credits_available');
    expect(content).toContain('quality_score');
    expect(content).toContain('spam_score');
  });

  test('verify Zod schemas file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const schemaPath = path.join(
      process.cwd(),
      'lib/schemas/exchange-network.ts'
    );
    const exists = await fs
      .access(schemaPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify Zod schemas have required exports', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const schemaPath = path.join(
      process.cwd(),
      'lib/schemas/exchange-network.ts'
    );
    const content = await fs.readFile(schemaPath, 'utf-8');

    // Check for key schemas
    expect(content).toContain('createExchangeNetworkSchema');
    expect(content).toContain('bulkImportExchangeNetworkSchema');
    expect(content).toContain('exchangeNetworkPostSchema');
    expect(content).toContain('updateExchangeNetworkSchema');
    expect(content).toContain('exchangeNetworkQuerySchema');
    expect(content).toContain('updateExchangeNetworkStatusSchema');
    expect(content).toContain('updateExchangeNetworkCreditsSchema');
    expect(content).toContain('deleteExchangeNetworkSchema');
    expect(content).toContain('exchangeNetworkStatusSchema');
  });

  test('verify Supabase utility functions file exists', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const utilPath = path.join(
      process.cwd(),
      'lib/supabase/exchange-network.ts'
    );
    const exists = await fs
      .access(utilPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test('verify Supabase utility functions have required exports', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const utilPath = path.join(
      process.cwd(),
      'lib/supabase/exchange-network.ts'
    );
    const content = await fs.readFile(utilPath, 'utf-8');

    // Check for key functions
    expect(content).toContain('getExchangeNetworkSiteById');
    expect(content).toContain('getOrganizationExchangeNetworkSites');
    expect(content).toContain('getProductExchangeNetworkSites');
    expect(content).toContain('createExchangeNetworkSite');
    expect(content).toContain('bulkCreateExchangeNetworkSites');
    expect(content).toContain('updateExchangeNetworkSite');
    expect(content).toContain('updateExchangeNetworkSiteStatus');
    expect(content).toContain('updateExchangeNetworkSiteCredits');
    expect(content).toContain('softDeleteExchangeNetworkSite');
    expect(content).toContain('canUserAccessExchangeNetworkSite');
    expect(content).toContain('getExchangeNetworkStats');
    expect(content).toContain('validateExchangeNetworkSite');
  });

  test('verify schemas index exports exchange-network', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const indexPath = path.join(process.cwd(), 'lib/schemas/index.ts');
    const content = await fs.readFile(indexPath, 'utf-8');

    expect(content).toContain("from './exchange-network'");
  });

  test('verify database migration includes RLS policies', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260205_create_exchange_network_table.sql'
    );
    const content = await fs.readFile(migrationPath, 'utf-8');

    // Check for RLS
    expect(content).toContain('ENABLE ROW LEVEL SECURITY');

    // Check for policies
    expect(content).toContain(
      'Service role has full access to exchange_network'
    );
    expect(content).toContain(
      'Exchange network sites are viewable by organization members'
    );
    expect(content).toContain(
      'Exchange network sites can be created by organization members'
    );
    expect(content).toContain(
      'Exchange network sites can be updated by organization admins'
    );
    expect(content).toContain(
      'Exchange network sites can be deleted by organization owners'
    );
  });

  test('verify database migration includes helper functions', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260205_create_exchange_network_table.sql'
    );
    const content = await fs.readFile(migrationPath, 'utf-8');

    // Check for helper functions
    expect(content).toContain('soft_delete_exchange_network');
    expect(content).toContain('get_organization_exchange_network');
    expect(content).toContain('get_product_exchange_network');
    expect(content).toContain('can_access_exchange_network');
    expect(content).toContain('update_exchange_network_status');
    expect(content).toContain('update_exchange_network_credits');
    expect(content).toContain('get_exchange_network_stats');
  });

  test('verify database migration includes proper indexes', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260205_create_exchange_network_table.sql'
    );
    const content = await fs.readFile(migrationPath, 'utf-8');

    // Check for key indexes
    expect(content).toContain('idx_exchange_network_organization_id');
    expect(content).toContain('idx_exchange_network_domain');
    expect(content).toContain('idx_exchange_network_status');
    expect(content).toContain('idx_exchange_network_authority');
    expect(content).toContain('idx_exchange_network_niche');
    expect(content).toContain('idx_exchange_network_credits_available');
  });

  test('verify unique constraint on domain per organization', async ({}) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260205_create_exchange_network_table.sql'
    );
    const content = await fs.readFile(migrationPath, 'utf-8');

    // Check for unique constraint
    expect(content).toContain('UNIQUE(organization_id, domain)');
  });
});
