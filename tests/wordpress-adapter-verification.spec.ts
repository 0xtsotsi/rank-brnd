/**
 * WordPress CMS Adapter Verification Test
 *
 * This test verifies that the WordPress adapter is properly implemented
 * by testing its structure, configuration validation, and required methods.
 *
 * Note: This is a temporary verification test that should be deleted after
 * confirming the implementation works correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('WordPress CMS Adapter', () => {
  test('should export all required functions and classes', async () => {
    // Import the module dynamically to test exports
    const cmsModule = await import('../lib/cms');

    // Verify all exports exist
    expect(cmsModule.WordPressAdapter).toBeDefined();
    expect(cmsModule.createWordPressAdapter).toBeDefined();
    expect(cmsModule.validateWordPressConfig).toBeDefined();
    expect(cmsModule.CMSError).toBeDefined();
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toBeDefined();
    expect(cmsModule.createCMSAdapter).toBeDefined();

    // Verify supported platforms
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toContain('wordpress');
  });

  test('should validate WordPress configuration correctly', async () => {
    const { validateWordPressConfig } = await import('../lib/cms');

    // Valid config with Basic Auth
    expect(
      validateWordPressConfig({
        url: 'https://example.com',
        username: 'admin',
        password: 'app-password',
      })
    ).toBe(true);

    // Valid config with OAuth 2.0
    expect(
      validateWordPressConfig({
        url: 'https://example.com',
        accessToken: 'oauth-token',
      })
    ).toBe(true);

    // Invalid configs
    expect(validateWordPressConfig({})).toBe(false);
    expect(validateWordPressConfig({ url: 'https://example.com' })).toBe(false);
    expect(
      validateWordPressConfig({ username: 'admin', password: 'pass' })
    ).toBe(false);
    expect(
      validateWordPressConfig({
        url: 'https://example.com',
        username: 'admin',
      })
    ).toBe(false);
  });

  test('should create WordPress adapter instance', async () => {
    const { createWordPressAdapter, WordPressAdapter } =
      await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify adapter is instance of WordPressAdapter
    expect(adapter).toBeInstanceOf(WordPressAdapter);

    // Verify adapter name
    expect(adapter.name).toBe('WordPress');

    // Verify isConfigured returns true for valid config
    expect(adapter.isConfigured()).toBe(true);
  });

  test('should implement CMSAdapter interface', async () => {
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify required CMSAdapter methods exist
    expect(typeof adapter.publish).toBe('function');
    expect(typeof adapter.getUser).toBe('function');
    expect(typeof adapter.isConfigured).toBe('function');
  });

  test('should have post management methods', async () => {
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
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
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify scheduling methods exist
    expect(typeof adapter.schedulePost).toBe('function');
    expect(typeof adapter.reschedulePost).toBe('function');
    expect(typeof adapter.unschedulePost).toBe('function');
    expect(typeof adapter.publishNow).toBe('function');
  });

  test('should have category management methods', async () => {
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify category methods exist
    expect(typeof adapter.createCategory).toBe('function');
    expect(typeof adapter.updateCategory).toBe('function');
    expect(typeof adapter.deleteCategory).toBe('function');
    expect(typeof adapter.getCategory).toBe('function');
    expect(typeof adapter.getCategoryBySlug).toBe('function');
    expect(typeof adapter.listCategories).toBe('function');
    expect(typeof adapter.getOrCreateCategory).toBe('function');
  });

  test('should have tag management methods', async () => {
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify tag methods exist
    expect(typeof adapter.createTag).toBe('function');
    expect(typeof adapter.updateTag).toBe('function');
    expect(typeof adapter.deleteTag).toBe('function');
    expect(typeof adapter.getTag).toBe('function');
    expect(typeof adapter.getTagBySlug).toBe('function');
    expect(typeof adapter.listTags).toBe('function');
    expect(typeof adapter.getOrCreateTag).toBe('function');
    expect(typeof adapter.getOrCreateTagIds).toBe('function');
  });

  test('should have media management methods', async () => {
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify media methods exist
    expect(typeof adapter.uploadImage).toBe('function');
    expect(typeof adapter.getMedia).toBe('function');
    expect(typeof adapter.deleteMedia).toBe('function');
  });

  test('should have user management methods', async () => {
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify user methods exist
    expect(typeof adapter.getUserById).toBe('function');
    expect(typeof adapter.listUsers).toBe('function');
  });

  test('should have Yoast SEO integration methods', async () => {
    const { createWordPressAdapter } = await import('../lib/cms');

    const adapter = createWordPressAdapter({
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    // Verify Yoast SEO methods exist
    expect(typeof adapter.updateYoastSEO).toBe('function');
  });

  test('should have OAuth 2.0 helper methods', async () => {
    const { WordPressAdapter } = await import('../lib/cms');

    // Verify static OAuth methods exist
    expect(typeof WordPressAdapter.getOAuth2AuthorizationUrl).toBe('function');
    expect(typeof WordPressAdapter.exchangeCodeForToken).toBe('function');
  });

  test('should use createCMSAdapter factory', async () => {
    const { createCMSAdapter, WordPressAdapter } = await import('../lib/cms');

    const adapter = createCMSAdapter('wordpress', {
      url: 'https://example.com',
      username: 'admin',
      password: 'app-password',
    });

    expect(adapter).toBeInstanceOf(WordPressAdapter);
    expect(adapter.name).toBe('WordPress');
  });

  test('should get OAuth 2.0 authorization URL', async () => {
    const { WordPressAdapter } = await import('../lib/cms');

    const authUrl = WordPressAdapter.getOAuth2AuthorizationUrl(
      {
        url: 'https://example.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback',
      },
      'test-state'
    );

    expect(authUrl).toContain(
      'https://example.com/wp-json/wordpress-rest-oauth2/authorize'
    );
    expect(authUrl).toContain('client_id=test-client-id');
    expect(authUrl).toContain(
      'redirect_uri=https%3A%2F%2Fexample.com%2Fcallback'
    );
    expect(authUrl).toContain('state=test-state');
  });

  test('WordPress types should be properly exported', async () => {
    // Verify types are exported (compile-time check)
    const wordpressTypes = await import('../types/wordpress');

    // These are types, so we can't test them at runtime directly
    // But we can verify the module loads without errors
    expect(wordpressTypes).toBeDefined();
  });
});

test.describe('WordPress CMS Adapter Error Handling', () => {
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
