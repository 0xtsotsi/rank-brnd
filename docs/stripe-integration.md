# Stripe Integration Guide

This guide explains how the Stripe subscription billing integration works in Rank.brnd.

## Overview

The Stripe integration provides:

- ✅ Secure subscription management
- ✅ Webhook event handling for real-time updates
- ✅ Secure token handling via httpOnly cookies (Clerk)
- ✅ Multiple subscription tiers support
- ✅ Trial period handling
- ✅ Proration for plan changes
- ✅ Invoice and payment history tracking

## Architecture

### Security Features

**httpOnly Cookies for Authentication**

- All authentication is handled by Clerk using httpOnly cookies
- JWT tokens are never accessible to JavaScript (XSS protection)
- Stripe secret key never exposed to client

**Server-Side Operations**

- All Stripe API calls happen server-side
- Client only receives safe data (publishable key, checkout URLs)
- Webhook signatures verified before processing

**Route Protection**

- Webhook endpoints: Public (for Stripe callbacks)
- API routes: Protected (require authentication)
- Checkout sessions: Protected (require authentication)

### Key Components

#### 1. Stripe Client Library (`lib/stripe/`)

**`client.ts`**

- `getStripeClient()`: Server-side Stripe instance
- `getStripePublishableKey()`: Client-safe key
- `getStripeWebhookSecret()`: For webhook verification

**`webhooks.ts`**

- `verifyStripeWebhook()`: Signature verification
- Event extraction helpers for each webhook type
- Type-safe event handling

#### 2. API Routes (`app/api/stripe/`)

**`create-checkout-session`**: Creates Stripe checkout sessions

- POST `/api/stripe/create-checkout-session`
- Requires authentication
- Creates customer if doesn't exist
- Returns checkout URL

**`subscription`**: Manage subscriptions

- GET `/api/stripe/subscription`: Get current subscription
- DELETE `/api/stripe/subscription`: Cancel subscription
- PATCH `/api/stripe/subscription`: Change plan

**`prices`**: List available plans

- GET `/api/stripe/prices`: Get products and prices
- Public endpoint (can be called from landing page)

#### 3. Webhook Handler (`app/api/webhooks/stripe/`)

Handles Stripe webhook events:

- `checkout.session.completed`: User completed checkout
- `customer.subscription.created`: New subscription
- `customer.subscription.updated`: Plan changed/canceled
- `customer.subscription.deleted`: Subscription expired
- `invoice.paid`: Payment succeeded
- `invoice.payment_failed`: Payment failed
- `customer.created`: New customer created

## Setup Instructions

### 1. Install Dependencies

```bash
npm install stripe@14.18.0
```

### 2. Configure Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your API keys from Developers → API keys
3. Create products and prices in Products → Pricing
4. Create webhook endpoint in Developers → Webhooks

### 3. Set Environment Variables

Add to `.env.local`:

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_***
STRIPE_SECRET_KEY=sk_test_***

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_***

# Price IDs (optional - can also query from API)
STRIPE_PRICE_ID_MONTHLY=price_***
STRIPE_PRICE_ID_YEARLY=price_***
```

### 4. Configure Webhook

Add webhook endpoint in Stripe Dashboard:

**URL**: `https://your-domain.com/api/webhooks/stripe`

**Events to send**:

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- customer.subscription.trial_will_end
- invoice.paid
- invoice.payment_failed
- invoice.upcoming
- customer.created
- customer.updated

### 5. Create Database Tables

When Drizzle ORM is set up, create these tables:

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  stripe_product_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add stripe_customer_id to organizations
ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT;

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'open', 'void', 'uncollectible', 'deleted')),
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Usage Examples

### Create Checkout Session

```typescript
// Client-side
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_monthly',
    mode: 'subscription',
    successUrl: `${window.location.origin}/dashboard?checkout=success`,
    cancelUrl: `${window.location.origin}/pricing?checkout=canceled`,
    metadata: {
      organizationId: 'org_xxx',
    },
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Checkout
```

### Get Available Prices

```typescript
// Client-side or server-side
const response = await fetch('/api/stripe/prices');
const { products } = await response.json();

products.forEach((product) => {
  console.log(product.name);
  product.prices.forEach((price) => {
    console.log(`$${price.unitAmount / 100} / ${price.interval}`);
  });
});
```

### Cancel Subscription

```typescript
// Client-side
const response = await fetch('/api/stripe/subscription', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscriptionId: 'sub_xxx',
  }),
});

const { subscription } = await response.json();
console.log('Will cancel at:', new Date(subscription.currentPeriodEnd * 1000));
```

### Change Subscription Plan

```typescript
// Client-side
const response = await fetch('/api/stripe/subscription', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscriptionId: 'sub_xxx',
    priceId: 'price_yearly', // New price ID
  }),
});

const { subscription } = await response.json();
```

## Webhook Event Flow

1. **User completes checkout**
   - Stripe sends `checkout.session.completed`
   - Handler creates customer record
   - Links customer to organization

2. **Subscription created**
   - Stripe sends `customer.subscription.created`
   - Handler inserts subscription into database
   - Updates organization status

3. **Payment succeeds**
   - Stripe sends `invoice.paid`
   - Handler records payment
   - Extends access period

4. **Payment fails**
   - Stripe sends `invoice.payment_failed`
   - Handler notifies user
   - After 3 failed attempts, suspend access

5. **Subscription canceled**
   - User cancels via API
   - Stripe sends `customer.subscription.updated`
   - Handler updates `cancel_at_period_end`
   - At period end, sends `customer.subscription.deleted`
   - Handler updates organization to free tier

## Testing

### Run Verification Tests

```bash
npm run test tests/verify-stripe-setup.spec.ts
```

### Test Webhooks Locally

Use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe forward --to localhost:3000/api/webhooks/stripe
```

### Test Checkout Flow

1. Use Stripe test mode
2. Use test card number: `4242 4242 4242 4242`
3. Use any future expiry date
4. Use any CVC

## Troubleshooting

### Webhook Verification Failing

Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook secret in Stripe Dashboard.

### Prices Not Loading

Check that:

- `STRIPE_SECRET_KEY` is set
- Products are active in Stripe Dashboard
- Prices have product IDs

### Checkout Failing

Ensure:

- User is authenticated
- Price ID exists
- Success/cancel URLs are valid

### Subscription Not Updating

Check webhook handler logs for errors. Common issues:

- Webhook not received (check Stripe Dashboard)
- Database connection issues
- Missing organization-customer link

## Security Considerations

### ✅ What We Do Right

1. **Server-side API calls**: All Stripe operations happen server-side
2. **httpOnly cookies**: JWT tokens stored securely via Clerk
3. **Webhook verification**: All webhook signatures verified
4. **Route protection**: Protected routes require authentication
5. **No secret key exposure**: Only publishable key on client

### ⚠️ What to Avoid

1. **Don't expose secret key**: Never log or return it in API responses
2. **Don't store tokens in localStorage**: Use httpOnly cookies
3. **Don't skip webhook verification**: Always verify signatures
4. **Don't trust client data**: Validate all inputs server-side

## Next Steps

1. Set up Drizzle ORM and create tables
2. Implement database operations in webhook handlers
3. Add subscription status checks to protected routes
4. Create pricing page with checkout flow
5. Implement billing history page
6. Add usage-based billing (if needed)
7. Set up Stripe Radar for fraud prevention

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
