import { test, expect } from '@playwright/test';

/**
 * Security Headers Verification Test
 *
 * This test verifies that security headers are properly configured:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 */

test.describe('Security Headers', () => {
  test('should have Content-Security-Policy header', async ({ request }) => {
    const response = await request.get('/');
    const cspHeader = response.headers()['content-security-policy'];

    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader).toContain("script-src 'self'");
    expect(cspHeader).toContain("style-src 'self'");
    expect(cspHeader).toContain("img-src 'self'");
    expect(cspHeader).toContain("connect-src 'self'");
    expect(cspHeader).toContain("object-src 'none'");
  });

  test('should have Strict-Transport-Security header', async ({ request }) => {
    const response = await request.get('/');
    const hstsHeader = response.headers()['strict-transport-security'];

    expect(hstsHeader).toBeDefined();
    expect(hstsHeader).toContain('max-age=');
    expect(hstsHeader).toContain('includeSubDomains');
  });

  test('should have X-Frame-Options header set to DENY', async ({
    request,
  }) => {
    const response = await request.get('/');
    const frameOptionsHeader = response.headers()['x-frame-options'];

    expect(frameOptionsHeader).toBeDefined();
    expect(frameOptionsHeader).toBe('DENY');
  });

  test('should have X-Content-Type-Options header set to nosniff', async ({
    request,
  }) => {
    const response = await request.get('/');
    const contentTypeOptionsHeader =
      response.headers()['x-content-type-options'];

    expect(contentTypeOptionsHeader).toBeDefined();
    expect(contentTypeOptionsHeader).toBe('nosniff');
  });

  test('should have X-XSS-Protection header', async ({ request }) => {
    const response = await request.get('/');
    const xssProtectionHeader = response.headers()['x-xss-protection'];

    expect(xssProtectionHeader).toBeDefined();
    expect(xssProtectionHeader).toContain('1; mode=block');
  });

  test('should have Referrer-Policy header', async ({ request }) => {
    const response = await request.get('/');
    const referrerPolicyHeader = response.headers()['referrer-policy'];

    expect(referrerPolicyHeader).toBeDefined();
    expect(referrerPolicyHeader).toContain('strict-origin');
  });

  test('should have Permissions-Policy header', async ({ request }) => {
    const response = await request.get('/');
    const permissionsPolicyHeader = response.headers()['permissions-policy'];

    expect(permissionsPolicyHeader).toBeDefined();
    // Check that sensitive features are disabled
    expect(permissionsPolicyHeader).toContain('camera=()');
    expect(permissionsPolicyHeader).toContain('microphone=()');
    expect(permissionsPolicyHeader).toContain('geolocation=()');
  });

  test('should not have X-Powered-By header', async ({ request }) => {
    const response = await request.get('/');
    const poweredByHeader = response.headers()['x-powered-by'];

    expect(poweredByHeader).toBeUndefined();
  });

  test('CSP should allow Clerk and Supabase domains', async ({ request }) => {
    const response = await request.get('/');
    const cspHeader = response.headers()['content-security-policy'];

    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain('clerk.com');
    expect(cspHeader).toContain('supabase.co');
  });

  test('should have security headers on dashboard route', async ({
    request,
  }) => {
    const response = await request.get('/dashboard');
    const headers = response.headers();

    // Verify key security headers are present
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
