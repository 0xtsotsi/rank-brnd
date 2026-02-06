/**
 * Stripe Mocks
 *
 * Mock Stripe objects and responses for testing.
 */

import { vi } from 'vitest';

/**
 * Mock Stripe customer
 */
export const mockCustomer = {
  id: 'cus_test123',
  email: 'test@example.com',
  name: 'Test User',
  subscription: null,
};

/**
 * Mock Stripe subscription
 */
export const mockSubscription = {
  id: 'sub_test123',
  customer: 'cus_test123',
  status: 'active',
  current_period_end: Date.now() / 1000 + 30 * 24 * 60 * 60,
  items: {
    data: [
      {
        id: 'si_test123',
        price: {
          id: 'price_test123',
          lookup_key: 'pro',
        },
      },
    ],
  },
};

/**
 * Mock Stripe price
 */
export const mockPrice = {
  id: 'price_test123',
  lookup_key: 'pro',
  unit_amount: 2900,
  currency: 'usd',
  recurring: {
    interval: 'month',
  },
  product: {
    id: 'prod_test123',
    name: 'Pro Plan',
  },
};

/**
 * Mock Stripe checkout session
 */
export const mockCheckoutSession = {
  id: 'cs_test123',
  customer: 'cus_test123',
  subscription: 'sub_test123',
  status: 'complete',
  url: 'https://checkout.stripe.com/pay/test',
};

/**
 * Mock Stripe webhook event
 */
export function mockWebhookEvent(
  type: string,
  data: Record<string, unknown>
): { id: string; type: string; data: Record<string, unknown> } {
  return {
    id: `evt_${Date.now()}`,
    type,
    data,
  };
}

/**
 * Create mock Stripe client
 */
export function createMockStripeClient() {
  return {
    customers: {
      retrieve: vi.fn(() => Promise.resolve(mockCustomer)),
      create: vi.fn(() => Promise.resolve(mockCustomer)),
      update: vi.fn(() => Promise.resolve(mockCustomer)),
    },
    subscriptions: {
      retrieve: vi.fn(() => Promise.resolve(mockSubscription)),
      create: vi.fn(() => Promise.resolve(mockSubscription)),
      update: vi.fn(() => Promise.resolve(mockSubscription)),
      cancel: vi.fn(() => Promise.resolve(mockSubscription)),
      list: vi.fn(() => Promise.resolve({ data: [mockSubscription] })),
    },
    prices: {
      retrieve: vi.fn(() => Promise.resolve(mockPrice)),
      list: vi.fn(() => Promise.resolve({ data: [mockPrice] })),
    },
    checkout: {
      sessions: {
        create: vi.fn(() => Promise.resolve(mockCheckoutSession)),
        retrieve: vi.fn(() => Promise.resolve(mockCheckoutSession)),
      },
    },
    webhooks: {
      constructEvent: vi.fn((payload, signature, secret) =>
        JSON.parse(payload)
      ),
    },
  };
}
