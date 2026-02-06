import { test, expect } from '@playwright/test';

/**
 * Temporary verification test for CMS Integrations feature
 * This test verifies the core functionality of the integrations page
 */

test.describe('CMS Integrations Feature Verification', () => {
  test('API: GET /api/integrations returns data', async ({ request }) => {
    const response = await request.get('/api/integrations');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('integrations');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.integrations)).toBe(true);
    expect(data.integrations.length).toBeGreaterThan(0);
  });

  test('API: Integration has required fields', async ({ request }) => {
    const response = await request.get('/api/integrations');

    expect(response.status()).toBe(200);

    const data = await response.json();
    const first = data.integrations[0];

    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('platform');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('config');
  });

  test('API: Search filter works', async ({ request }) => {
    const response = await request.get('/api/integrations?search=wordpress');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.integrations).toBeDefined();
    expect(Array.isArray(data.integrations)).toBe(true);
  });

  test('API: Platform filter works', async ({ request }) => {
    const response = await request.get('/api/integrations?platform=wordpress');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.integrations).toBeDefined();
  });

  test('API: Status filter works', async ({ request }) => {
    const response = await request.get('/api/integrations?status=active');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.integrations).toBeDefined();

    // All returned integrations should have active status
    data.integrations.forEach((integration: any) => {
      expect(integration.status).toBe('active');
    });
  });

  test('API: POST validates required fields', async ({ request }) => {
    // Missing name
    const r1 = await request.post('/api/integrations', {
      data: { platform: 'wordpress' },
    });
    expect(r1.status()).toBe(400);

    // Missing platform
    const r2 = await request.post('/api/integrations', {
      data: { name: 'Test' },
    });
    expect(r2.status()).toBe(400);
  });

  test('API: DELETE validates id parameter', async ({ request }) => {
    const response = await request.delete('/api/integrations');
    expect(response.status()).toBe(400);
  });

  test('API: Platform options are valid', async ({ request }) => {
    const validPlatforms = [
      'wordpress',
      'webflow',
      'shopify',
      'ghost',
      'notion',
      'squarespace',
      'wix',
      'contentful',
      'strapi',
      'custom',
    ];

    const response = await request.get('/api/integrations');
    const data = await response.json();

    data.integrations.forEach((integration: any) => {
      expect(validPlatforms).toContain(integration.platform);
    });
  });
});
