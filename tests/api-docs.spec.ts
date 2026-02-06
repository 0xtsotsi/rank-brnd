import { test, expect } from '@playwright/test';

/**
 * API Documentation Verification Tests
 *
 * Tests to verify that the OpenAPI documentation is accessible and functional.
 */

test.describe('API Documentation', () => {
  test('should serve OpenAPI specification JSON', async ({ request }) => {
    const response = await request.get('/openapi.json');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const spec = await response.json();

    // Verify OpenAPI 3.0 structure
    expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('Rank API Documentation');
    expect(spec.info.version).toBeDefined();
    expect(spec.paths).toBeDefined();
    expect(spec.components).toBeDefined();
  });

  test('should include all documented endpoints', async ({ request }) => {
    const response = await request.get('/openapi.json');
    const spec = await response.json();

    const paths = Object.keys(spec.paths);

    // Verify key endpoints exist
    expect(paths).toContain('/api/health');
    expect(paths).toContain('/api/products');
    expect(paths).toContain('/api/keywords');
    expect(paths).toContain('/api/csrf-token');
    expect(paths).toContain('/api/stripe/subscription');
    expect(paths).toContain('/api/webhooks/stripe');
    expect(paths).toContain('/api/webhooks/clerk');
    expect(paths).toContain('/api/domain-authority');
    expect(paths).toContain('/api/usage');
    expect(paths).toContain('/api/cms/shopify');
    expect(paths).toContain('/api/cms/medium');
  });

  test('should serve Swagger UI documentation page', async ({ page }) => {
    await page.goto('/api/docs');

    // Check that Swagger UI loaded
    await expect(page.locator('#swagger-ui')).toBeVisible();
    await expect(page.locator('.information-container')).toBeVisible();

    // Check that the back link exists
    await expect(
      page.getByRole('link', { name: /back to app/i })
    ).toBeVisible();

    // Check that the download spec link exists
    await expect(
      page.getByRole('link', { name: /download openapi spec/i })
    ).toBeVisible();
  });

  test('should display API information in Swagger UI', async ({ page }) => {
    await page.goto('/api/docs');

    // Wait for Swagger UI to fully load
    await page.waitForSelector('.info');

    // Check that the API title is displayed
    await expect(page.locator('.info .title')).toContainText(
      'Rank API Documentation'
    );
  });

  test('should list all API tags in Swagger UI', async ({ page }) => {
    await page.goto('/api/docs');

    // Wait for Swagger UI to fully load
    await page.waitForSelector('.opblock-tag-section');

    // Verify some key tag sections are visible
    const tags = page.locator('.opblock-tag');
    await expect(tags.first()).toBeVisible();

    // Get all tag names
    const tagNames = await tags.allTextContents();

    // Verify important tags are present
    expect(tagNames.some((tag) => tag.includes('Health'))).toBeTruthy();
    expect(tagNames.some((tag) => tag.includes('Products'))).toBeTruthy();
    expect(tagNames.some((tag) => tag.includes('Stripe'))).toBeTruthy();
  });

  test('should allow exploring API endpoints in Swagger UI', async ({
    page,
  }) => {
    await page.goto('/api/docs');

    // Wait for Swagger UI to load
    await page.waitForSelector('.opblock-tag-section');

    // Find the Health endpoint and expand it
    const healthSection = page
      .getByText('GET')
      .filter({ hasText: '/api/health' })
      .first();
    await healthSection.click();

    // Verify the operation expanded
    await expect(page.locator('.opblock-body')).toBeVisible();
  });

  test('OpenAPI spec should have proper schema definitions', async ({
    request,
  }) => {
    const response = await request.get('/openapi.json');
    const spec = await response.json();

    // Verify component schemas exist
    expect(spec.components.schemas).toBeDefined();

    // Check for key schemas
    expect(spec.components.schemas.Product).toBeDefined();
    expect(spec.components.schemas.HealthResponse).toBeDefined();
    expect(spec.components.schemas.BrandTone).toBeDefined();

    // Verify BrandTone enum values
    expect(spec.components.schemas.BrandTone.enum).toContain('professional');
    expect(spec.components.schemas.BrandTone.enum).toContain('casual');
  });

  test('OpenAPI spec should have security schemes defined', async ({
    request,
  }) => {
    const response = await request.get('/openapi.json');
    const spec = await response.json();

    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  test('OpenAPI spec should have proper server configuration', async ({
    request,
  }) => {
    const response = await request.get('/openapi.json');
    const spec = await response.json();

    expect(spec.servers).toBeDefined();
    expect(spec.servers.length).toBeGreaterThan(0);

    // Check for local development server
    const localServer = spec.servers.find((s: any) =>
      s.url.includes('localhost')
    );
    expect(localServer).toBeDefined();
  });
});
