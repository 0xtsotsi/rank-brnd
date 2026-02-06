# Subscription Plans Configuration

This document describes the subscription plan tiers configured for Rank.brnd.

## Overview

Rank.brnd offers 4 subscription tiers:

1. **Free** - $0/month - For testing and personal use
2. **Starter** - $29/month - Essential SEO tools for small businesses
3. **Pro** - $49/month - Advanced features for growing teams
4. **Agency** - $149/month - Full-featured solution for agencies and enterprises

## Plan Comparison

| Feature                   | Free | Starter    | Pro                | Agency           |
| ------------------------- | ---- | ---------- | ------------------ | ---------------- |
| **Price (Monthly)**       | $0   | $29        | $49                | $149             |
| **Price (Yearly)**        | $0   | $290       | $470 (20% off)     | $1,430 (20% off) |
| **Trial Days**            | -    | 14 days    | 14 days            | 30 days          |
|                           |      |            |                    |                  |
| **Content Generation**    |      |            |                    |                  |
| Articles per Month        | 5    | 50         | 200                | Unlimited        |
| AI Words per Month        | 10K  | 100K       | 500K               | Unlimited        |
| Images per Month          | 5    | 50         | 200                | Unlimited        |
| Brand Voice Learning      | ❌   | ✅         | ✅                 | ✅               |
| Human Curation            | ❌   | ❌         | ✅                 | ✅               |
|                           |      |            |                    |                  |
| **SEO Features**          |      |            |                    |                  |
| Keyword Research/Month    | 50   | 500        | 2,500              | Unlimited        |
| SERP Analysis/Month       | 10   | 100        | 500                | Unlimited        |
| Backlink Exchange         | ❌   | 5 requests | 25 requests        | Unlimited        |
| SEO Scoring               | ✅   | ✅         | ✅                 | ✅               |
| Competitor Analysis       | ❌   | ❌         | ✅                 | ✅               |
|                           |      |            |                    |                  |
| **Publishing**            |      |            |                    |                  |
| Published Articles/Month  | 3    | 30         | 150                | Unlimited        |
| Scheduled Articles        | 5    | 50         | 200                | Unlimited        |
| Bulk Publishing           | ❌   | ❌         | ✅ (20/batch)      | Unlimited        |
| CMS Integrations          | ❌   | ❌         | ✅                 | ✅               |
| Auto Publishing           | ❌   | ❌         | ✅                 | ✅               |
|                           |      |            |                    |                  |
| **API & Automation**      |      |            |                    |                  |
| API Access                | ❌   | ❌         | 10K requests/month | Unlimited        |
| Webhooks                  | ❌   | ❌         | ✅                 | ✅               |
| Zapier Integration        | ❌   | ❌         | ❌                 | ✅               |
| Custom Integrations       | ❌   | ❌         | ❌                 | ✅               |
|                           |      |            |                    |                  |
| **Team & Collaboration**  |      |            |                    |                  |
| Team Members              | 1    | 3          | 10                 | Unlimited        |
| Organizations             | 1    | 2          | 5                  | Unlimited        |
| Collaborative Editing     | ❌   | ❌         | ✅                 | ✅               |
| Approval Workflows        | ❌   | ❌         | ✅                 | ✅               |
| Role-Based Access         | ❌   | ❌         | ❌                 | ✅               |
|                           |      |            |                    |                  |
| **Analytics & Reporting** |      |            |                    |                  |
| Analytics Dashboard       | ❌   | ✅         | ✅                 | ✅               |
| Custom Reports            | ❌   | ❌         | ✅                 | ✅               |
| Export Data               | ❌   | ✅         | ✅                 | ✅               |
| White-Label Reports       | ❌   | ❌         | ❌                 | ✅               |
|                           |      |            |                    |                  |
| **Support**               |      |            |                    |                  |
| Priority Support          | ❌   | ❌         | ✅                 | ✅               |
| Dedicated Account Manager | ❌   | ❌         | ❌                 | ✅               |
| Onboarding Assistance     | ❌   | ❌         | ✅                 | ✅               |
| Custom Training           | ❌   | ❌         | ❌                 | ✅               |
|                           |      |            |                    |                  |
| **Storage**               | 1 GB | 10 GB      | 50 GB              | Unlimited        |

## File Structure

```
lib/stripe/
├── plans.ts          # Plan configurations and helper functions
├── validation.ts     # Validation utilities for feature access and usage limits
├── client.ts         # Stripe client configuration (existing)
└── webhooks.ts       # Webhook event handlers (existing)

types/
└── subscription.ts   # TypeScript types for subscription plans

scripts/
└── verify-plans.ts   # Verification script for plan configuration
```

## Usage Examples

### Getting Plan Information

```typescript
import { getPlan, getAllPlans } from '@/lib/stripe/plans';

// Get a specific plan
const proPlan = getPlan('pro');
console.log(proPlan.name); // "Pro"
console.log(proPlan.priceMonthly); // 4900 (in cents)

// Get all plans
const allPlans = getAllPlans();
allPlans.forEach((plan) => {
  console.log(`${plan.name}: $${plan.priceMonthly / 100}/month`);
});
```

### Checking Feature Access

```typescript
import { canUseFeature } from '@/lib/stripe/plans';

// Check if user can generate articles
const result = canUseFeature('pro', 'ai_content_generation', 150);

console.log(result.allowed); // true
console.log(result.limit); // 200
console.log(result.remaining); // 50
```

### Validating Feature Access

```typescript
import { validateFeatureAccess } from '@/lib/stripe/validation';

// Validate with current usage
const validation = validateFeatureAccess(
  'starter',
  'keyword_research',
  450 // current usage
);

console.log(validation.allowed); // true
console.log(validation.warningLevel); // "warning" (90% used)
```

### Getting Usage Warnings

```typescript
import { getSubscriptionWarnings } from '@/lib/stripe/validation';

const warnings = getSubscriptionWarnings('starter', {
  articlesUsed: 45,
  keywordResearchUsed: 475,
  apiRequestsUsed: 0,
});

warnings.forEach((warning) => {
  console.log(`${warning.level}: ${warning.message}`);
});
```

### Comparing Plans

```typescript
import { comparePlans } from '@/lib/stripe/plans';

const comparison = comparePlans('starter', 'pro');

console.log('Gained features:', comparison.gainedFeatures);
console.log('Increased limits:', comparison.increasedLimits);
```

## Feature Keys

All features are identified by a unique key:

### Content Features

- `ai_content_generation` - Generate SEO-optimized articles
- `content_planner` - Plan and organize content calendar
- `brand_voice_learning` - AI learns your brand voice
- `human_curation` - Human editors review content

### SEO Features

- `keyword_research` - Discover high-value keywords
- `serp_analysis` - Analyze search engine results
- `backlink_exchange` - Exchange backlinks with other sites
- `seo_scoring` - Real-time SEO score
- `competitor_analysis` - Analyze competitors

### Publishing Features

- `cms_publishing` - Publish to CMS
- `auto_publishing` - Automatic publishing
- `scheduled_publishing` - Schedule content
- `bulk_publishing` - Publish multiple articles
- `cms_integrations` - Connect to 15+ CMS platforms

### API & Automation

- `api_access` - REST API access
- `webhooks` - Real-time webhooks
- `zapier_integration` - Connect to 5000+ apps
- `custom_integrations` - Build custom integrations

### Team & Collaboration

- `team_members` - Add team members
- `collaborative_editing` - Edit together in real-time
- `approval_workflows` - Require approval
- `role_based_access` - Control access with roles

### Analytics & Reporting

- `analytics_dashboard` - Track performance
- `custom_reports` - Create custom reports
- `export_data` - Export data
- `white_label_reports` - Branded reports

### Support & Services

- `priority_support` - Faster response times
- `dedicated_account_manager` - Personal account manager
- `onboarding_assistance` - Help getting started
- `custom_training` - Training for your team

## Usage Limits

Limits are enforced for metered features:

### Content Limits

- `articlesPerMonth` - Articles generated per month
- `aiWordsPerMonth` - AI word generation per month
- `imagesPerMonth` - Images generated per month

### SEO Limits

- `keywordResearchPerMonth` - Keyword research queries
- `serpAnalysisPerMonth` - SERP analysis requests
- `backlinkExchangeRequests` - Backlink exchange requests per month

### Publishing Limits

- `publishedArticlesPerMonth` - Articles published per month
- `scheduledArticles` - Maximum scheduled articles
- `bulkPublishBatchSize` - Articles per bulk publish batch

### API Limits

- `apiRequestsPerMonth` - API requests per month
- `webhookEventsPerMonth` - Webhook events per month

### Team Limits

- `teamMembers` - Maximum team members
- `organizations` - Maximum organizations

### Storage

- `storageGb` - Storage in GB

**Note:** A value of `-1` indicates unlimited.

## Verification

Run the verification script to ensure plans are correctly configured:

```bash
npx tsx scripts/verify-plans.ts
```

This will check:

- ✅ All 4 plan tiers are defined
- ✅ Pricing is correct
- ✅ Limits increase across tiers
- ✅ Feature count increases
- ✅ API access permissions
- ✅ Plan metadata (trial days, popularity badges)

## Stripe Integration

When integrating with Stripe, you'll need to:

1. **Create Products and Prices in Stripe Dashboard**

   For each plan tier, create:
   - Product (Free, Starter, Pro, Agency)
   - Monthly Price
   - Yearly Price (with 20% discount for Pro and Agency)

2. **Set Price IDs in Environment Variables**

   ```env
   STRIPE_PRICE_ID_FREE_MONTHLY=price_***
   STRIPE_PRICE_ID_STARTER_MONTHLY=price_***
   STRIPE_PRICE_ID_PRO_MONTHLY=price_***
   STRIPE_PRICE_ID_AGENCY_MONTHLY=price_***
   ```

3. **Update Plan Configuration**

   Add the Stripe price IDs to each plan in `lib/stripe/plans.ts`:

   ```typescript
   export const STARTER_PLAN: SubscriptionPlan = {
     // ...
     stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
     stripePriceIdYearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
     // ...
   };
   ```

## Migration from Free to Paid

When a user upgrades from Free to a paid plan:

1. User completes checkout via Stripe
2. `checkout.session.completed` webhook is fired
3. `customer.subscription.created` webhook is fired
4. Application updates organization's subscription status
5. User gains access to paid features

## Downgrading Plans

When a user downgrades:

1. Current plan remains active until period end
2. `cancel_at_period_end` is set to `true`
3. At period end, subscription is canceled
4. Organization reverts to Free plan
5. Usage limits are enforced

## Usage Tracking

To enforce limits, track usage monthly:

```typescript
// Reset usage at start of billing period
async function resetUsage(organizationId: string) {
  await db.usage.update({
    where: { organizationId },
    data: {
      articlesUsed: 0,
      keywordResearchUsed: 0,
      // ... reset all counters
    },
  });
}

// Check before allowing action
async function canGenerateArticle(organizationId: string) {
  const subscription = await getSubscription(organizationId);
  const usage = await getUsage(organizationId);

  return checkUsageLimits(
    subscription.planId,
    'ai_content_generation',
    usage.articlesUsed
  );
}
```

## Testing

Test plan limits and features:

```typescript
import {
  validateFeatureAccess,
  checkUsageLimits,
  canCreateResource,
} from '@/lib/stripe/validation';

// Test feature access
const validation = validateFeatureAccess('pro', 'api_access', 5000);
console.log(validation); // { allowed: true, limit: 10000, ... }

// Test resource creation
const canCreate = canCreateResource('starter', 'article', 45);
console.log(canCreate); // { allowed: true, limit: 50 }
```

## Next Steps

1. **Set up Stripe Products**: Create products and prices in Stripe Dashboard
2. **Implement Checkout Flow**: Create API endpoint for checkout sessions
3. **Handle Webhooks**: Implement webhook handlers for subscription events
4. **Track Usage**: Implement usage tracking for metered features
5. **Enforce Limits**: Add limit checks before actions
6. **Create Pricing Page**: Build UI to display plans and handle upgrades
7. **Implement Billing Dashboard**: Show usage, limits, and invoices

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Usage-Based Billing](https://stripe.com/docs/billing/subscriptions/usage-based)
