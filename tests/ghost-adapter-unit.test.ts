/**
 * Ghost CMS Adapter Unit Test
 *
 * This test verifies that the Ghost adapter is properly implemented
 * by testing its structure, configuration validation, and core methods.
 *
 * Run with: npx ts-node --esm tests/ghost-adapter-unit.test.ts
 */

import { strict as assert } from 'assert';

// Import using relative paths for direct testing
async function runTests() {
  console.log('🧪 Ghost CMS Adapter Unit Tests\n');
  console.log('='.repeat(50) + '\n');

  let passCount = 0;
  let failCount = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passCount++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(
        `   Error: ${error instanceof Error ? error.message : error}`
      );
      failCount++;
    }
  }

  // Test 1: Module exports
  await test('should export all required functions and classes', async () => {
    const cmsModule = await import('../lib/cms/index.js');

    assert.ok(cmsModule.GhostAdapter, 'GhostAdapter should be exported');
    assert.ok(
      cmsModule.createGhostAdapter,
      'createGhostAdapter should be exported'
    );
    assert.ok(
      cmsModule.validateGhostConfig,
      'validateGhostConfig should be exported'
    );
    assert.ok(cmsModule.CMSError, 'CMSError should be exported');
    assert.ok(
      cmsModule.SUPPORTED_CMS_PLATFORMS,
      'SUPPORTED_CMS_PLATFORMS should be exported'
    );
    assert.ok(
      cmsModule.createCMSAdapter,
      'createCMSAdapter should be exported'
    );
  });

  // Test 2: Supported platforms
  await test('should have ghost in supported platforms', async () => {
    const { SUPPORTED_CMS_PLATFORMS } = await import('../lib/cms/index.js');
    assert.ok(
      SUPPORTED_CMS_PLATFORMS.includes('ghost'),
      'ghost should be in supported platforms'
    );
  });

  // Test 3: Config validation - valid config
  await test('should validate valid Ghost configuration', async () => {
    const { validateGhostConfig } = await import('../lib/cms/index.js');

    const isValid = validateGhostConfig({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.strictEqual(isValid, true, 'Valid config should return true');
  });

  // Test 4: Config validation - missing url
  await test('should reject config without url', async () => {
    const { validateGhostConfig } = await import('../lib/cms/index.js');

    const isValid = validateGhostConfig({
      adminApiKey: '12345:67890',
    });

    assert.strictEqual(
      isValid,
      false,
      'Config without url should return false'
    );
  });

  // Test 5: Config validation - missing apiKey
  await test('should reject config without adminApiKey', async () => {
    const { validateGhostConfig } = await import('../lib/cms/index.js');

    const isValid = validateGhostConfig({
      url: 'https://example.ghost.io',
    });

    assert.strictEqual(
      isValid,
      false,
      'Config without adminApiKey should return false'
    );
  });

  // Test 6: Config validation - invalid apiKey format
  await test('should reject config with invalid apiKey format', async () => {
    const { validateGhostConfig } = await import('../lib/cms/index.js');

    const isValid = validateGhostConfig({
      url: 'https://example.ghost.io',
      adminApiKey: 'invalid-format',
    });

    assert.strictEqual(
      isValid,
      false,
      'Invalid apiKey format should return false'
    );
  });

  // Test 7: Create adapter instance
  await test('should create Ghost adapter instance', async () => {
    const { createGhostAdapter, GhostAdapter } =
      await import('../lib/cms/index.js');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.ok(
      adapter instanceof GhostAdapter,
      'Should be instance of GhostAdapter'
    );
    assert.strictEqual(adapter.name, 'Ghost', 'Name should be Ghost');
  });

  // Test 8: isConfigured
  await test('should return true for isConfigured with valid config', async () => {
    const { createGhostAdapter } = await import('../lib/cms/index.js');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.strictEqual(
      adapter.isConfigured(),
      true,
      'isConfigured should return true'
    );
  });

  // Test 9: CMSAdapter interface methods
  await test('should have CMSAdapter interface methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms/index.js');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.strictEqual(
      typeof adapter.publish,
      'function',
      'publish should be a function'
    );
    assert.strictEqual(
      typeof adapter.getUser,
      'function',
      'getUser should be a function'
    );
    assert.strictEqual(
      typeof adapter.isConfigured,
      'function',
      'isConfigured should be a function'
    );
  });

  // Test 10: Post management methods
  await test('should have post management methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms/index.js');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.strictEqual(
      typeof adapter.createPost,
      'function',
      'createPost should be a function'
    );
    assert.strictEqual(
      typeof adapter.updatePost,
      'function',
      'updatePost should be a function'
    );
    assert.strictEqual(
      typeof adapter.deletePost,
      'function',
      'deletePost should be a function'
    );
    assert.strictEqual(
      typeof adapter.getPost,
      'function',
      'getPost should be a function'
    );
    assert.strictEqual(
      typeof adapter.getPostBySlug,
      'function',
      'getPostBySlug should be a function'
    );
    assert.strictEqual(
      typeof adapter.listPosts,
      'function',
      'listPosts should be a function'
    );
  });

  // Test 11: Scheduled publishing methods
  await test('should have scheduled publishing methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms/index.js');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.strictEqual(
      typeof adapter.schedulePost,
      'function',
      'schedulePost should be a function'
    );
    assert.strictEqual(
      typeof adapter.reschedulePost,
      'function',
      'reschedulePost should be a function'
    );
    assert.strictEqual(
      typeof adapter.unschedulePost,
      'function',
      'unschedulePost should be a function'
    );
    assert.strictEqual(
      typeof adapter.publishNow,
      'function',
      'publishNow should be a function'
    );
  });

  // Test 12: Tag management methods
  await test('should have tag management methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms/index.js');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.strictEqual(
      typeof adapter.createTag,
      'function',
      'createTag should be a function'
    );
    assert.strictEqual(
      typeof adapter.updateTag,
      'function',
      'updateTag should be a function'
    );
    assert.strictEqual(
      typeof adapter.deleteTag,
      'function',
      'deleteTag should be a function'
    );
    assert.strictEqual(
      typeof adapter.getTag,
      'function',
      'getTag should be a function'
    );
    assert.strictEqual(
      typeof adapter.getTagBySlug,
      'function',
      'getTagBySlug should be a function'
    );
    assert.strictEqual(
      typeof adapter.listTags,
      'function',
      'listTags should be a function'
    );
    assert.strictEqual(
      typeof adapter.getOrCreateTag,
      'function',
      'getOrCreateTag should be a function'
    );
  });

  // Test 13: Author management methods
  await test('should have author management methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms/index.js');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.strictEqual(
      typeof adapter.getAuthor,
      'function',
      'getAuthor should be a function'
    );
    assert.strictEqual(
      typeof adapter.getAuthorBySlug,
      'function',
      'getAuthorBySlug should be a function'
    );
    assert.strictEqual(
      typeof adapter.getAuthorByEmail,
      'function',
      'getAuthorByEmail should be a function'
    );
    assert.strictEqual(
      typeof adapter.listAuthors,
      'function',
      'listAuthors should be a function'
    );
  });

  // Test 14: Factory function
  await test('should work with createCMSAdapter factory', async () => {
    const { createCMSAdapter, GhostAdapter } =
      await import('../lib/cms/index.js');

    const adapter = createCMSAdapter('ghost', {
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    assert.ok(
      adapter instanceof GhostAdapter,
      'Factory should create GhostAdapter'
    );
    assert.strictEqual(adapter.name, 'Ghost', 'Name should be Ghost');
  });

  // Test 15: Unsupported platform error
  await test('should throw error for unsupported platform', async () => {
    const { createCMSAdapter } = await import('../lib/cms/index.js');

    try {
      // @ts-expect-error - Testing unsupported platform
      createCMSAdapter('unsupported', {});
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(
        error instanceof Error && error.message.includes('Unsupported'),
        'Should throw error about unsupported platform'
      );
    }
  });

  // Test 16: CMSError class
  await test('CMSError should have correct properties', async () => {
    const { CMSError } = await import('../lib/cms/index.js');

    const error = new CMSError('Test error message', 'TEST_ERROR', 404, {
      key: 'value',
    });

    assert.strictEqual(
      error.message,
      'Test error message',
      'Message should match'
    );
    assert.strictEqual(error.code, 'TEST_ERROR', 'Code should match');
    assert.strictEqual(error.statusCode, 404, 'StatusCode should match');
    assert.deepStrictEqual(
      error.details,
      { key: 'value' },
      'Details should match'
    );
    assert.strictEqual(error.name, 'CMSError', 'Name should be CMSError');
    assert.ok(error instanceof Error, 'Should be instance of Error');
  });

  // Test 17: Ghost types module
  await test('Ghost types module should load without errors', async () => {
    const ghostTypes = await import('../types/ghost.js');
    assert.ok(ghostTypes, 'Ghost types module should load');
  });

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);

  if (failCount > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
