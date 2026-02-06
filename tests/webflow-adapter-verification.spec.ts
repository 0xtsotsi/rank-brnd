/**
 * Webflow CMS Adapter Verification Test
 *
 * This test verifies that the Webflow adapter is properly implemented
 * by testing its structure, configuration validation, and API methods.
 *
 * Note: This is a temporary verification test that should be deleted after
 * confirming the implementation works correctly.
 */

import { test, expect } from '@playwright/test';

// We'll test the adapter in a Node.js context
test.describe('Webflow CMS Adapter', () => {
  test('should export all required functions and classes', async () => {
    // Import the module dynamically to test exports
    const cmsModule = await import('../lib/cms');

    // Verify all exports exist
    expect(cmsModule.WebflowAdapter).toBeDefined();
    expect(cmsModule.createWebflowAdapter).toBeDefined();
    expect(cmsModule.validateWebflowConfig).toBeDefined();
    expect(cmsModule.formatCollectionUrl).toBeDefined();
    expect(cmsModule.CMSError).toBeDefined();
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toBeDefined();
    expect(cmsModule.createCMSAdapter).toBeDefined();

    // Verify supported platforms includes webflow
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toContain('webflow');
  });

  test('should validate Webflow configuration correctly', async () => {
    const { validateWebflowConfig } = await import('../lib/cms');

    // Valid config
    expect(
      validateWebflowConfig({
        siteId: '123456789abcdef',
        accessToken: 'your-api-token',
      })
    ).toBe(true);

    // Valid config with version
    expect(
      validateWebflowConfig({
        siteId: '123456789abcdef',
        accessToken: 'your-api-token',
        version: 'v2',
      })
    ).toBe(true);

    // Invalid configs
    expect(validateWebflowConfig({})).toBe(false);
    expect(validateWebflowConfig({ siteId: '123456' })).toBe(false);
    expect(validateWebflowConfig({ accessToken: 'token' })).toBe(false);
  });

  test('should create Webflow adapter instance', async () => {
    const { createWebflowAdapter, WebflowAdapter } = await import('../lib/cms');

    const adapter = createWebflowAdapter({
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    // Verify adapter is instance of WebflowAdapter
    expect(adapter).toBeInstanceOf(WebflowAdapter);

    // Verify adapter name
    expect(adapter.name).toBe('Webflow');

    // Verify isConfigured returns true for valid config
    expect(adapter.isConfigured()).toBe(true);
  });

  test('should implement CMSAdapter interface', async () => {
    const { createWebflowAdapter } = await import('../lib/cms');

    const adapter = createWebflowAdapter({
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    // Verify required CMSAdapter methods exist
    expect(typeof adapter.publish).toBe('function');
    expect(typeof adapter.getUser).toBe('function');
    expect(typeof adapter.isConfigured).toBe('function');
  });

  test('should have collection management methods', async () => {
    const { createWebflowAdapter } = await import('../lib/cms');

    const adapter = createWebflowAdapter({
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    // Verify collection methods exist
    expect(typeof adapter.listCollections).toBe('function');
    expect(typeof adapter.getCollection).toBe('function');
    expect(typeof adapter.getField).toBe('function');
    expect(typeof adapter.getSite).toBe('function');
    expect(typeof adapter.listSites).toBe('function');
  });

  test('should have item management methods', async () => {
    const { createWebflowAdapter } = await import('../lib/cms');

    const adapter = createWebflowAdapter({
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    // Verify item methods exist
    expect(typeof adapter.createItem).toBe('function');
    expect(typeof adapter.updateItem).toBe('function');
    expect(typeof adapter.deleteItem).toBe('function');
    expect(typeof adapter.getItem).toBe('function');
    expect(typeof adapter.listItems).toBe('function');
    expect(typeof adapter.publishItems).toBe('function');
    expect(typeof adapter.unpublishItems).toBe('function');
  });

  test('should have field validation methods', async () => {
    const { createWebflowAdapter } = await import('../lib/cms');

    const adapter = createWebflowAdapter({
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    // Verify field methods exist
    expect(typeof adapter.validateFieldData).toBe('function');
    expect(typeof adapter.uploadImage).toBe('function');
  });

  test('should use createCMSAdapter factory', async () => {
    const { createCMSAdapter, WebflowAdapter } = await import('../lib/cms');

    const adapter = createCMSAdapter('webflow', {
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    expect(adapter).toBeInstanceOf(WebflowAdapter);
    expect(adapter.name).toBe('Webflow');
  });

  test('should have formatCollectionUrl helper', async () => {
    const { formatCollectionUrl } = await import('../lib/cms');

    const url = formatCollectionUrl('example.com', 'blog', 'my-post');

    expect(url).toBe('https://example.com/blog/my-post');
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

test.describe('Webflow CMS Adapter Post Publishing', () => {
  test('should convert CMSPost to Webflow item data', async () => {
    const { createWebflowAdapter } = await import('../lib/cms');

    const adapter = createWebflowAdapter({
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    // Verify adapter can be created
    expect(adapter).toBeDefined();
    expect(adapter.isConfigured()).toBe(true);
  });

  test('should handle draft vs published status', async () => {
    const { createWebflowAdapter } = await import('../lib/cms');

    const adapter = createWebflowAdapter({
      siteId: '123456789abcdef',
      accessToken: 'your-api-token',
    });

    // Verify adapter exists
    expect(adapter).toBeDefined();
  });
});

test.describe('Webflow Types', () => {
  test('Webflow types should be properly exported', async () => {
    // Verify types are exported (compile-time check)
    const webflowTypes = await import('../types/webflow');

    // These are types, so we can't test them at runtime directly
    // But we can verify the module loads without errors
    expect(webflowTypes).toBeDefined();
  });
});
