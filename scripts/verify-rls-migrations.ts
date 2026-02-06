#!/usr/bin/env tsx

/**
 * RLS Migration Files Verification Script
 *
 * Offline script to verify RLS policies are correctly defined
 * in the migration files.
 *
 * Usage: npx tsx scripts/verify-rls-migrations.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  console.log(`${passed ? '✅' : '❌'} ${name}: ${message}`);
}

function checkFileForRlsPatterns(
  content: string,
  filename: string
): {
  hasEnableRls: boolean;
  hasCreatePolicy: boolean;
  hasAlterTable: boolean;
  policies: string[];
} {
  return {
    hasEnableRls: /ENABLE ROW LEVEL SECURITY/i.test(content),
    hasAlterTable: /ALTER TABLE .* ENABLE ROW LEVEL SECURITY/i.test(content),
    hasCreatePolicy: /CREATE POLICY/i.test(content),
    policies: content.match(/CREATE POLICY\s+"?[\w\s]+"?\s+ON\s+\w+/gi) || [],
  };
}

function analyzeOrganizationRls(content: string): boolean {
  // Check for key organization RLS patterns
  const patterns = [
    /CREATE POLICY.*Service role.*organizations/i,
    /CREATE POLICY.*organizations.*viewable.*members/i,
    /CREATE POLICY.*organizations.*created.*authenticated/i,
    /organization_members\s*\.user_id\s*=\s*auth.uid\(\)/i,
  ];

  return patterns.every((p) => p.test(content));
}

function analyzeProductsRls(content: string): boolean {
  // Check for key products RLS patterns
  const patterns = [
    /CREATE POLICY.*products/i,
    /organization_members.*organization_id/i,
    /deleted_at IS NULL/i,
  ];

  return patterns.every((p) => p.test(content));
}

function analyzeUsersRls(content: string): boolean {
  // Check for key users RLS patterns
  const patterns = [
    /CREATE POLICY.*users/i,
    /clerk_id.*auth.uid/i,
    /organization_members/i,
  ];

  return patterns.every((p) => p.test(content));
}

function analyzeHelperFunctions(content: string): boolean {
  // Check for SECURITY DEFINER helper functions
  const patterns = [
    /CREATE.*FUNCTION.*get_user_organizations/i,
    /SECURITY DEFINER/i,
    /CREATE.*FUNCTION.*is_organization_member/i,
    /CREATE.*FUNCTION.*get_organization_role/i,
    /CREATE.*FUNCTION.*can_access_product/i,
  ];

  return patterns.every((p) => p.test(content));
}

async function verifyRlsMigrations(): Promise<boolean> {
  console.log('\n🔍 Verifying RLS Migration Files...\n');

  const migrationsDir = join(process.cwd(), 'supabase/migrations');

  // 1. Check migrations directory exists
  console.log('--- Checking Migrations Directory ---');
  try {
    const files = readdirSync(migrationsDir);
    record(
      'Migrations directory exists',
      true,
      `Found ${files.length} migration files`
    );
  } catch (error) {
    record('Migrations directory exists', false, 'Directory not found');
    return false;
  }

  // 2. Check specific RLS migration files
  console.log('\n--- Checking RLS Migration Files ---');

  const requiredFiles = [
    '20260110_create_organizations_table.sql',
    '20260204_create_users_table.sql',
    '20260204_create_products_table.sql',
  ];

  for (const filename of requiredFiles) {
    const filePath = join(migrationsDir, filename);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const { hasEnableRls, hasCreatePolicy, policies } =
        checkFileForRlsPatterns(content, filename);
      record(
        `${filename} exists and has RLS`,
        hasEnableRls || hasCreatePolicy,
        `${policies.length} policies defined, RLS ${hasEnableRls ? 'enabled' : 'not explicitly enabled'}`
      );
    } catch (error) {
      record(`${filename} exists`, false, (error as Error).message);
    }
  }

  // 3. Analyze organizations table RLS
  console.log('\n--- Analyzing Organizations RLS ---');
  try {
    const orgContent = readFileSync(
      join(migrationsDir, '20260110_create_organizations_table.sql'),
      'utf-8'
    );
    record(
      'Organizations: Service role policy',
      /CREATE POLICY.*Service role.*organizations/i.test(orgContent),
      'Found service role bypass policy'
    );
    record(
      'Organizations: Authenticated access',
      /CREATE POLICY.*authenticated/i.test(orgContent),
      'Found authenticated user policies'
    );
    record(
      'Organizations: Role-based access',
      /role IN \(.*owner.*admin/i.test(orgContent) ||
        /role = 'owner' OR role = 'admin'/i.test(orgContent),
      'Found role-based access checks'
    );
    record(
      'Organizations: auth.uid() checks',
      /auth\.uid\(\)/i.test(orgContent),
      'Uses auth.uid() for user identification'
    );
  } catch (error) {
    record('Organizations RLS analysis', false, (error as Error).message);
  }

  // 4. Analyze products table RLS
  console.log('\n--- Analyzing Products RLS ---');
  try {
    const productsContent = readFileSync(
      join(migrationsDir, '20260204_create_products_table.sql'),
      'utf-8'
    );
    record(
      'Products: Organization-scoped access',
      /organization_members|om\.organization_id/i.test(productsContent),
      'Checks organization membership'
    );
    record(
      'Products: Soft delete filtering',
      /deleted_at IS NULL/i.test(productsContent),
      'Filters soft-deleted records'
    );
    record(
      'Products: View/SELECT policy',
      /CREATE POLICY.*viewable|CREATE POLICY.*SELECT/i.test(productsContent),
      'Has SELECT/view policy'
    );
    record(
      'Products: Create/Update policies',
      /CREATE POLICY.*created|CREATE POLICY.*updated|INSERT|UPDATE/i.test(
        productsContent
      ),
      'Has INSERT/UPDATE policies'
    );
  } catch (error) {
    record('Products RLS analysis', false, (error as Error).message);
  }

  // 5. Analyze users table RLS
  console.log('\n--- Analyzing Users RLS ---');
  try {
    const usersContent = readFileSync(
      join(migrationsDir, '20260204_create_users_table.sql'),
      'utf-8'
    );
    record(
      'Users: Self-access policy',
      /clerk_id = auth\.uid\(\)|clerk_id.*auth\.uid/i.test(usersContent),
      'Users can access own records'
    );
    record(
      'Users: Organization access',
      /organization/i.test(usersContent),
      'Organization-based access'
    );
    record(
      'Users: Service role sync',
      /service_role/i.test(usersContent),
      'Service role for Clerk sync'
    );
  } catch (error) {
    record('Users RLS analysis', false, (error as Error).message);
  }

  // 6. Check for helper functions
  console.log('\n--- Checking Helper Functions ---');

  const helperFunctions = [
    'get_user_organizations',
    'is_organization_member',
    'get_organization_role',
    'can_access_product',
    'get_organization_users',
  ];

  // Read all migration files and search for functions
  const allFiles = readdirSync(migrationsDir);
  let allContent = '';
  for (const file of allFiles) {
    if (file.endsWith('.sql')) {
      allContent += readFileSync(join(migrationsDir, file), 'utf-8');
    }
  }

  for (const funcName of helperFunctions) {
    const found = new RegExp(`CREATE.*FUNCTION.*${funcName}`, 'i').test(
      allContent
    );
    const hasSecurityDefiner = new RegExp(
      `CREATE.*FUNCTION.*${funcName}.*SECURITY DEFINER`,
      'is'
    ).test(allContent);
    record(
      `Function: ${funcName}`,
      found,
      found
        ? hasSecurityDefiner
          ? 'With SECURITY DEFINER'
          : 'Found'
        : 'Not found'
    );
  }

  // 7. Check for documentation file
  console.log('\n--- Checking Documentation ---');
  try {
    const docPath = join(migrationsDir, 'RLS_POLICY_VERIFICATION.md');
    const docContent = readFileSync(docPath, 'utf-8');
    record(
      'RLS documentation exists',
      true,
      `Documentation file found (${docContent.length} bytes)`
    );
  } catch (error) {
    record('RLS documentation exists', false, 'Documentation file not found');
  }

  // 8. Summary
  console.log('\n--- Summary ---');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\nTotal: ${results.length} checks`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed checks:');
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  - ${result.name}: ${result.message}`);
    }
  }

  return failed === 0;
}

// Run verification
verifyRlsMigrations()
  .then((success) => {
    console.log(
      `\n${success ? '✅ RLS migration verification PASSED' : '❌ RLS migration verification FAILED'}\n`
    );
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
