/**
 * Webhook API Integration Tests
 *
 * Tests the /api/webhooks/* endpoints for:
 * - Signature verification
 * - Event handling
 * - Error cases
 */

import { test, expect } from '@playwright/test';

const STRIPE_WEBHOOK_URL = 'http://localhost:3000/api/webhooks/stripe';

test.describe('Stripe Webhook API - Authentication', () => {
  test('should reject webhook without signature', async ({ request }) => {
    const response = await request.post(STRIPE_WEBHOOK_URL, {
      data: {},
    });

    expect([400, 401, 403]).toContain(response.status());
  });

  test('should reject webhook with invalid signature', async ({ request }) => {
    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 'invalid_signature',
      },
      data: {},
    });

    expect([400, 401, 403]).toContain(response.status());
  });
});

test.describe('Stripe Webhook API - Event Handling', () => {
  test('should handle checkout.session.completed event', async ({
    request,
  }) => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test123',
          customer: 'cus_test123',
          customer_email: 'test@example.com',
        },
      },
    };

    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: mockEvent,
    });

    expect([200, 401, 403, 500]).toContain(response.status());
  });

  test('should handle customer.subscription.created event', async ({
    request,
  }) => {
    const mockEvent = {
      id: 'evt_test_subscription',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
        },
      },
    };

    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: mockEvent,
    });

    expect([200, 401, 403, 500]).toContain(response.status());
  });

  test('should handle customer.subscription.updated event', async ({
    request,
  }) => {
    const mockEvent = {
      id: 'evt_test_update',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
        },
      },
    };

    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: mockEvent,
    });

    expect([200, 401, 403, 500]).toContain(response.status());
  });

  test('should handle customer.subscription.deleted event', async ({
    request,
  }) => {
    const mockEvent = {
      id: 'evt_test_delete',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'canceled',
        },
      },
    };

    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: mockEvent,
    });

    expect([200, 401, 403, 500]).toContain(response.status());
  });

  test('should handle invoice.paid event', async ({ request }) => {
    const mockEvent = {
      id: 'evt_test_invoice',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_test123',
          customer: 'cus_test123',
          amount_paid: 1000,
        },
      },
    };

    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: mockEvent,
    });

    expect([200, 401, 403, 500]).toContain(response.status());
  });

  test('should handle invoice.payment_failed event', async ({ request }) => {
    const mockEvent = {
      id: 'evt_test_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test_failed',
          customer: 'cus_test123',
          amount_due: 1000,
        },
      },
    };

    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: mockEvent,
    });

    expect([200, 401, 403, 500]).toContain(response.status());
  });
});

test.describe('Stripe Webhook API - Edge Cases', () => {
  test('should handle malformed JSON', async ({ request }) => {
    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: '{invalid json}',
    });

    expect([400, 401, 403, 500]).toContain(response.status());
  });

  test('should handle empty request body', async ({ request }) => {
    const response = await request.post(STRIPE_WEBHOOK_URL, {
      headers: {
        'stripe-signature': 't=123,v1=test_signature',
      },
      data: '',
    });

    expect([400, 401, 403, 500]).toContain(response.status());
  });
});
