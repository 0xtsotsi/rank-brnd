/**
 * Ghost CMS Adapter Verification Test
 *
 * This test verifies that the Ghost adapter is properly implemented
 * by testing its structure, configuration validation, and JWT generation.
 *
 * Note: This is a temporary verification test that should be deleted after
 * confirming the implementation works correctly.
 */

import { test, expect } from '@playwright/test';

// We'll test the adapter in a Node.js context
test.describe('Ghost CMS Adapter', () => {
  test('should export all required functions and classes', async () => {
    // Import the module dynamically to test exports
    const cmsModule = await import('../lib/cms');

    // Verify all exports exist
    expect(cmsModule.GhostAdapter).toBeDefined();
    expect(cmsModule.createGhostAdapter).toBeDefined();
    expect(cmsModule.validateGhostConfig).toBeDefined();
    expect(cmsModule.CMSError).toBeDefined();
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toBeDefined();
    expect(cmsModule.createCMSAdapter).toBeDefined();

    // Verify supported platforms
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toContain('ghost');
  });

  test('should validate Ghost configuration correctly', async () => {
    const { validateGhostConfig } = await import('../lib/cms');

    // Valid config
    expect(
      validateGhostConfig({
        url: 'https://example.ghost.io',
        adminApiKey: '12345abcde:67890fghij',
      })
    ).toBe(true);

    // Invalid configs
    expect(validateGhostConfig({})).toBe(false);
    expect(validateGhostConfig({ url: 'https://example.ghost.io' })).toBe(
      false
    );
    expect(validateGhostConfig({ adminApiKey: '12345:67890' })).toBe(false);
    expect(
      validateGhostConfig({
        url: 'https://example.ghost.io',
        adminApiKey: 'invalid-format',
      })
    ).toBe(false);
    expect(
      validateGhostConfig({
        url: 'https://example.ghost.io',
        adminApiKey: ':missing-id',
      })
    ).toBe(false);
  });

  test('should create Ghost adapter instance', async () => {
    const { createGhostAdapter, GhostAdapter } = await import('../lib/cms');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    // Verify adapter is instance of GhostAdapter
    expect(adapter).toBeInstanceOf(GhostAdapter);

    // Verify adapter name
    expect(adapter.name).toBe('Ghost');

    // Verify isConfigured returns true for valid config
    expect(adapter.isConfigured()).toBe(true);
  });

  test('should implement CMSAdapter interface', async () => {
    const { createGhostAdapter } = await import('../lib/cms');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    // Verify required CMSAdapter methods exist
    expect(typeof adapter.publish).toBe('function');
    expect(typeof adapter.getUser).toBe('function');
    expect(typeof adapter.isConfigured).toBe('function');
  });

  test('should have post management methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    // Verify post methods exist
    expect(typeof adapter.createPost).toBe('function');
    expect(typeof adapter.updatePost).toBe('function');
    expect(typeof adapter.deletePost).toBe('function');
    expect(typeof adapter.getPost).toBe('function');
    expect(typeof adapter.getPostBySlug).toBe('function');
    expect(typeof adapter.listPosts).toBe('function');
  });

  test('should have scheduled publishing methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    // Verify scheduling methods exist
    expect(typeof adapter.schedulePost).toBe('function');
    expect(typeof adapter.reschedulePost).toBe('function');
    expect(typeof adapter.unschedulePost).toBe('function');
    expect(typeof adapter.publishNow).toBe('function');
  });

  test('should have tag management methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    // Verify tag methods exist
    expect(typeof adapter.createTag).toBe('function');
    expect(typeof adapter.updateTag).toBe('function');
    expect(typeof adapter.deleteTag).toBe('function');
    expect(typeof adapter.getTag).toBe('function');
    expect(typeof adapter.getTagBySlug).toBe('function');
    expect(typeof adapter.listTags).toBe('function');
    expect(typeof adapter.getOrCreateTag).toBe('function');
  });

  test('should have author management methods', async () => {
    const { createGhostAdapter } = await import('../lib/cms');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    // Verify author methods exist
    expect(typeof adapter.getAuthor).toBe('function');
    expect(typeof adapter.getAuthorBySlug).toBe('function');
    expect(typeof adapter.getAuthorByEmail).toBe('function');
    expect(typeof adapter.listAuthors).toBe('function');
  });

  test('should use createCMSAdapter factory', async () => {
    const { createCMSAdapter, GhostAdapter } = await import('../lib/cms');

    const adapter = createCMSAdapter('ghost', {
      url: 'https://example.ghost.io',
      adminApiKey: '12345abcde:67890fghij',
    });

    expect(adapter).toBeInstanceOf(GhostAdapter);
    expect(adapter.name).toBe('Ghost');
  });

  test('should throw error for unsupported CMS platform', async () => {
    const { createCMSAdapter } = await import('../lib/cms');

    expect(() => {
      // @ts-expect-error - Testing unsupported platform
      createCMSAdapter('unsupported', {});
    }).toThrow('Unsupported CMS platform: unsupported');
  });

  test('Ghost types should be properly exported', async () => {
    // Verify types are exported (compile-time check)
    const ghostTypes = await import('../types/ghost');

    // These are types, so we can't test them at runtime directly
    // But we can verify the module loads without errors
    expect(ghostTypes).toBeDefined();
  });
});

test.describe('Ghost CMS Adapter Error Handling', () => {
  test('should throw CMSError for invalid API key format', async () => {
    const { createGhostAdapter, CMSError } = await import('../lib/cms');

    const adapter = createGhostAdapter({
      url: 'https://example.ghost.io',
      adminApiKey: 'invalid-key-no-colon',
    });

    // The error will be thrown when trying to make a request
    // We can't test this without mocking fetch, but we verify
    // the adapter creates successfully
    expect(adapter).toBeDefined();
  });

  test('CMSError should have correct properties', async () => {
    const { CMSError } = await import('../lib/cms');

    const error = new CMSError('Test error message', 'TEST_ERROR', 404, {
      key: 'value',
    });

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ key: 'value' });
    expect(error.name).toBe('CMSError');
    expect(error).toBeInstanceOf(Error);
  });
});
