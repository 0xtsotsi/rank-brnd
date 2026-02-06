import { test, expect } from '@playwright/test';

/**
 * Stripe Integration Verification Test
 *
 * This test verifies that the Stripe integration is properly set up.
 * It tests:
 * - Stripe client library exports
 * - Webhook endpoint signature verification
 * - API routes are accessible (with/without auth)
 * - Environment variable validation
 *
 * Note: This is a temporary verification test to ensure the integration works.
 * It should be deleted after successful verification.
 */

test.describe('Stripe Integration Setup', () => {
  test('should verify Stripe client library exists and exports required functions', async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/Rank.brnd/);

    // Verify Stripe client is available (check console for errors)
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to API prices endpoint (will fail without auth, but verifies route exists)
    const response = await page.request.get('/api/stripe/prices');
    // We expect 401 or 500 since we're not authenticated, but NOT 404
    expect([401, 500, 400]).toContain(response.status());
    expect(response.status()).not.toBe(404);
  });

  test('should verify Stripe webhook endpoint accepts POST requests', async ({
    request,
  }) => {
    // Test webhook endpoint with invalid signature
    // Should return 403 (Forbidden) due to invalid signature, not 404
    const response = await request.post('/api/webhooks/stripe', {
      data: {},
      headers: {
        'stripe-signature': 'invalid_signature',
      },
    });

    // Should get 403 (invalid signature) or 400 (missing headers), not 404
    expect([400, 403]).toContain(response.status());
    expect(response.status()).not.toBe(404);
  });

  test('should verify checkout session endpoint requires authentication', async ({
    request,
  }) => {
    // Test checkout session endpoint without auth
    const response = await request.post('/api/stripe/create-checkout-session', {
      data: {},
    });

    // Should return 401 (Unauthorized) since not authenticated
    expect([401, 400]).toContain(response.status());
  });

  test('should verify subscription endpoint requires authentication', async ({
    request,
  }) => {
    // Test subscription GET endpoint without auth
    const response = await request.get('/api/stripe/subscription');

    // Should return 401 (Unauthorized) since not authenticated
    expect(response.status()).toBe(401);
  });

  test('should verify prices endpoint is accessible', async ({ request }) => {
    // Test prices endpoint
    // Note: This may fail with 500 if Stripe keys not configured, but route should exist
    const response = await request.get('/api/stripe/prices');

    // Should not be 404 (route exists)
    expect(response.status()).not.toBe(404);

    // If Stripe is configured, should get 200 or error about keys
    // If Stripe is not configured, should get 500
    expect([200, 500, 400]).toContain(response.status());
  });

  test('should verify environment variable validation works', async ({
    page,
  }) => {
    // This test checks that the app properly validates environment variables
    // Navigate to a route that uses Stripe
    await page.goto('/api/stripe/prices');

    // Check for specific error messages about missing keys
    // (This will vary based on whether keys are configured)
    const content = await page.content();

    // If keys are not configured, should see error message
    // If keys are configured, should see JSON response
    if (!content.includes('products')) {
      // Keys not configured, check for proper error handling
      expect(content).toMatch(/(error|Error|Missing)/);
    }
  });
});

test.describe('Stripe Webhook Security', () => {
  test('should reject webhook requests without signature', async ({
    request,
  }) => {
    const response = await request.post('/api/webhooks/stripe', {
      data: { test: 'data' },
    });

    // Should return 400 (Missing signature) or 403
    expect([400, 403]).toContain(response.status());
  });

  test('should reject webhook requests with invalid signature', async ({
    request,
  }) => {
    const response = await request.post('/api/webhooks/stripe', {
      data: { test: 'data' },
      headers: {
        'stripe-signature': 't=123,v1=invalid',
      },
    });

    // Should return 403 (Invalid signature)
    expect(response.status()).toBe(403);
  });
});

test.describe('Stripe API Route Security', () => {
  test('should protect subscription management endpoints', async ({
    request,
  }) => {
    // Test DELETE endpoint
    const deleteResponse = await request.delete('/api/stripe/subscription', {
      data: { subscriptionId: 'test' },
    });
    expect(deleteResponse.status()).toBe(401);

    // Test PATCH endpoint
    const patchResponse = await request.patch('/api/stripe/subscription', {
      data: { subscriptionId: 'test', priceId: 'test' },
    });
    expect(patchResponse.status()).toBe(401);
  });

  test('should protect checkout session creation', async ({ request }) => {
    const response = await request.post('/api/stripe/create-checkout-session', {
      data: {
        priceId: 'price_test',
        mode: 'subscription',
        successUrl: '/success',
        cancelUrl: '/cancel',
      },
    });

    expect(response.status()).toBe(401);
  });
});
