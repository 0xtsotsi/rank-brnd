/**
 * Subscription Plans Configuration
 *
 * This file defines all subscription plan tiers for Rank.brnd.
 * Each plan includes feature limits, API quotas, and publishing limits.
 *
 * Plan Tiers:
 * - Free: $0/month - Basic features for testing
 * - Starter: $29/month - Essential features for small businesses
 * - Pro: $49/month - Advanced features for growing teams
 * - Agency: $149/month - Full features for agencies and enterprises
 *
 * Usage:
 * import { getPlan, getAllPlans, canUseFeature } from '@/lib/stripe/plans';
 */

/**
 * Feature flags available in the application
 */
export type FeatureKey =
  // Content Features
  | 'ai_content_generation'
  | 'content_planner'
  | 'brand_voice_learning'
  | 'human_curation'

  // SEO Features
  | 'keyword_research'
  | 'serp_analysis'
  | 'backlink_exchange'
  | 'seo_scoring'
  | 'competitor_analysis'

  // Publishing & Integrations
  | 'cms_publishing'
  | 'auto_publishing'
  | 'scheduled_publishing'
  | 'bulk_publishing'
  | 'cms_integrations'

  // API & Automation
  | 'api_access'
  | 'webhooks'
  | 'zapier_integration'
  | 'custom_integrations'

  // Team & Collaboration
  | 'team_members'
  | 'collaborative_editing'
  | 'approval_workflows'
  | 'role_based_access'

  // Analytics & Reporting
  | 'analytics_dashboard'
  | 'custom_reports'
  | 'export_data'
  | 'white_label_reports'

  // Support & Services
  | 'priority_support'
  | 'dedicated_account_manager'
  | 'onboarding_assistance'
  | 'custom_training';

/**
 * Feature metadata
 */
export interface Feature {
  key: FeatureKey;
  name: string;
  description: string;
  category:
    | 'content'
    | 'seo'
    | 'publishing'
    | 'api'
    | 'team'
    | 'analytics'
    | 'support';
}

/**
 * Usage limits for metered features
 */
export interface UsageLimits {
  // Content limits
  articlesPerMonth: number;
  aiWordsPerMonth: number;
  imagesPerMonth: number;

  // SEO limits
  keywordResearchPerMonth: number;
  serpAnalysisPerMonth: number;
  backlinkExchangeRequests: number;

  // Publishing limits
  publishedArticlesPerMonth: number;
  scheduledArticles: number;
  bulkPublishBatchSize: number;

  // API limits
  apiRequestsPerMonth: number;
  webhookEventsPerMonth: number;

  // Team limits
  teamMembers: number;
  organizations: number;

  // Storage limits
  storageGb: number;
}

/**
 * Subscription plan configuration
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents (usually discounted)
  currency: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: FeatureKey[];
  limits: UsageLimits;
  metadata: {
    tier: 'free' | 'starter' | 'pro' | 'agency';
    popularity?: 'most-popular' | 'best-value';
    trialDays?: number;
  };
}

/**
 * All available features
 */
export const FEATURES: Record<FeatureKey, Feature> = {
  // Content Features
  ai_content_generation: {
    key: 'ai_content_generation',
    name: 'AI Content Generation',
    description: 'Generate SEO-optimized articles using GPT-4',
    category: 'content',
  },
  content_planner: {
    key: 'content_planner',
    name: 'Content Planner',
    description: 'Plan and organize your content calendar',
    category: 'content',
  },
  brand_voice_learning: {
    key: 'brand_voice_learning',
    name: 'Brand Voice Learning',
    description: 'AI learns and matches your brand voice',
    category: 'content',
  },
  human_curation: {
    key: 'human_curation',
    name: 'Human Curation',
    description: 'Human editors review and enhance AI content',
    category: 'content',
  },

  // SEO Features
  keyword_research: {
    key: 'keyword_research',
    name: 'Keyword Research',
    description: 'Discover high-value keywords with search volume data',
    category: 'seo',
  },
  serp_analysis: {
    key: 'serp_analysis',
    name: 'SERP Analysis',
    description: 'Analyze search engine results pages',
    category: 'seo',
  },
  backlink_exchange: {
    key: 'backlink_exchange',
    name: 'Backlink Exchange',
    description: 'Exchange backlinks with other sites',
    category: 'seo',
  },
  seo_scoring: {
    key: 'seo_scoring',
    name: 'SEO Scoring',
    description: 'Real-time SEO score for your content',
    category: 'seo',
  },
  competitor_analysis: {
    key: 'competitor_analysis',
    name: 'Competitor Analysis',
    description: 'Analyze competitor strategies',
    category: 'seo',
  },

  // Publishing & Integrations
  cms_publishing: {
    key: 'cms_publishing',
    name: 'CMS Publishing',
    description: 'Publish directly to your CMS',
    category: 'publishing',
  },
  auto_publishing: {
    key: 'auto_publishing',
    name: 'Auto Publishing',
    description: 'Automatically publish approved content',
    category: 'publishing',
  },
  scheduled_publishing: {
    key: 'scheduled_publishing',
    name: 'Scheduled Publishing',
    description: 'Schedule content for future publishing',
    category: 'publishing',
  },
  bulk_publishing: {
    key: 'bulk_publishing',
    name: 'Bulk Publishing',
    description: 'Publish multiple articles at once',
    category: 'publishing',
  },
  cms_integrations: {
    key: 'cms_integrations',
    name: 'CMS Integrations',
    description: 'Connect to 15+ CMS platforms',
    category: 'publishing',
  },

  // API & Automation
  api_access: {
    key: 'api_access',
    name: 'API Access',
    description: 'Access our REST API',
    category: 'api',
  },
  webhooks: {
    key: 'webhooks',
    name: 'Webhooks',
    description: 'Real-time webhooks for events',
    category: 'api',
  },
  zapier_integration: {
    key: 'zapier_integration',
    name: 'Zapier Integration',
    description: 'Connect to 5000+ apps via Zapier',
    category: 'api',
  },
  custom_integrations: {
    key: 'custom_integrations',
    name: 'Custom Integrations',
    description: 'Build custom integrations',
    category: 'api',
  },

  // Team & Collaboration
  team_members: {
    key: 'team_members',
    name: 'Team Members',
    description: 'Add team members to your account',
    category: 'team',
  },
  collaborative_editing: {
    key: 'collaborative_editing',
    name: 'Collaborative Editing',
    description: 'Edit together in real-time',
    category: 'team',
  },
  approval_workflows: {
    key: 'approval_workflows',
    name: 'Approval Workflows',
    description: 'Require approval before publishing',
    category: 'team',
  },
  role_based_access: {
    key: 'role_based_access',
    name: 'Role-Based Access',
    description: 'Control access with roles',
    category: 'team',
  },

  // Analytics & Reporting
  analytics_dashboard: {
    key: 'analytics_dashboard',
    name: 'Analytics Dashboard',
    description: 'Track your content performance',
    category: 'analytics',
  },
  custom_reports: {
    key: 'custom_reports',
    name: 'Custom Reports',
    description: 'Create custom analytics reports',
    category: 'analytics',
  },
  export_data: {
    key: 'export_data',
    name: 'Export Data',
    description: 'Export your data in multiple formats',
    category: 'analytics',
  },
  white_label_reports: {
    key: 'white_label_reports',
    name: 'White-Label Reports',
    description: 'Branded reports for clients',
    category: 'analytics',
  },

  // Support & Services
  priority_support: {
    key: 'priority_support',
    name: 'Priority Support',
    description: 'Faster response times',
    category: 'support',
  },
  dedicated_account_manager: {
    key: 'dedicated_account_manager',
    name: 'Dedicated Account Manager',
    description: 'Personal account manager',
    category: 'support',
  },
  onboarding_assistance: {
    key: 'onboarding_assistance',
    name: 'Onboarding Assistance',
    description: 'Help getting started',
    category: 'support',
  },
  custom_training: {
    key: 'custom_training',
    name: 'Custom Training',
    description: 'Training for your team',
    category: 'support',
  },
};

/**
 * Free Plan - $0/month
 * Basic features for testing and personal use
 */
export const FREE_PLAN: SubscriptionPlan = {
  id: 'free',
  name: 'Free',
  description: 'Perfect for testing out Rank.brnd',
  priceMonthly: 0,
  priceYearly: 0,
  currency: 'USD',
  features: [
    'ai_content_generation',
    'content_planner',
    'seo_scoring',
    'keyword_research',
    'cms_publishing',
  ],
  limits: {
    articlesPerMonth: 5,
    aiWordsPerMonth: 10000,
    imagesPerMonth: 5,
    keywordResearchPerMonth: 50,
    serpAnalysisPerMonth: 10,
    backlinkExchangeRequests: 0,
    publishedArticlesPerMonth: 3,
    scheduledArticles: 5,
    bulkPublishBatchSize: 0,
    apiRequestsPerMonth: 0,
    webhookEventsPerMonth: 0,
    teamMembers: 1,
    organizations: 1,
    storageGb: 1,
  },
  metadata: {
    tier: 'free',
  },
};

/**
 * Starter Plan - $29/month
 * Essential features for small businesses
 */
export const STARTER_PLAN: SubscriptionPlan = {
  id: 'starter',
  name: 'Starter',
  description: 'Essential SEO tools for small businesses',
  priceMonthly: 2900, // $29.00
  priceYearly: 29000, // $290.00 (no discount for yearly)
  currency: 'USD',
  features: [
    'ai_content_generation',
    'content_planner',
    'brand_voice_learning',
    'keyword_research',
    'serp_analysis',
    'seo_scoring',
    'cms_publishing',
    'scheduled_publishing',
    'analytics_dashboard',
    'export_data',
  ],
  limits: {
    articlesPerMonth: 50,
    aiWordsPerMonth: 100000,
    imagesPerMonth: 50,
    keywordResearchPerMonth: 500,
    serpAnalysisPerMonth: 100,
    backlinkExchangeRequests: 5,
    publishedArticlesPerMonth: 30,
    scheduledArticles: 50,
    bulkPublishBatchSize: 0,
    apiRequestsPerMonth: 0,
    webhookEventsPerMonth: 0,
    teamMembers: 3,
    organizations: 2,
    storageGb: 10,
  },
  metadata: {
    tier: 'starter',
    popularity: 'most-popular',
    trialDays: 14,
  },
};

/**
 * Pro Plan - $49/month
 * Advanced features for growing teams
 */
export const PRO_PLAN: SubscriptionPlan = {
  id: 'pro',
  name: 'Pro',
  description: 'Advanced features for growing teams',
  priceMonthly: 4900, // $49.00
  priceYearly: 47000, // $470.00 (20% discount)
  currency: 'USD',
  features: [
    // All content features
    'ai_content_generation',
    'content_planner',
    'brand_voice_learning',
    'human_curation',

    // All SEO features
    'keyword_research',
    'serp_analysis',
    'backlink_exchange',
    'seo_scoring',
    'competitor_analysis',

    // Publishing features
    'cms_publishing',
    'auto_publishing',
    'scheduled_publishing',
    'bulk_publishing',
    'cms_integrations',

    // Basic API access
    'api_access',
    'webhooks',

    // Team features
    'team_members',
    'collaborative_editing',
    'approval_workflows',

    // Analytics
    'analytics_dashboard',
    'custom_reports',
    'export_data',

    // Support
    'priority_support',
    'onboarding_assistance',
  ],
  limits: {
    articlesPerMonth: 200,
    aiWordsPerMonth: 500000,
    imagesPerMonth: 200,
    keywordResearchPerMonth: 2500,
    serpAnalysisPerMonth: 500,
    backlinkExchangeRequests: 25,
    publishedArticlesPerMonth: 150,
    scheduledArticles: 200,
    bulkPublishBatchSize: 20,
    apiRequestsPerMonth: 10000,
    webhookEventsPerMonth: 5000,
    teamMembers: 10,
    organizations: 5,
    storageGb: 50,
  },
  metadata: {
    tier: 'pro',
    popularity: 'best-value',
    trialDays: 14,
  },
};

/**
 * Agency Plan - $149/month
 * Full features for agencies and enterprises
 */
export const AGENCY_PLAN: SubscriptionPlan = {
  id: 'agency',
  name: 'Agency',
  description: 'Full-featured solution for agencies and enterprises',
  priceMonthly: 14900, // $149.00
  priceYearly: 143000, // $1430.00 (20% discount)
  currency: 'USD',
  features: [
    // All features available
    'ai_content_generation',
    'content_planner',
    'brand_voice_learning',
    'human_curation',

    'keyword_research',
    'serp_analysis',
    'backlink_exchange',
    'seo_scoring',
    'competitor_analysis',

    'cms_publishing',
    'auto_publishing',
    'scheduled_publishing',
    'bulk_publishing',
    'cms_integrations',

    'api_access',
    'webhooks',
    'zapier_integration',
    'custom_integrations',

    'team_members',
    'collaborative_editing',
    'approval_workflows',
    'role_based_access',

    'analytics_dashboard',
    'custom_reports',
    'export_data',
    'white_label_reports',

    'priority_support',
    'dedicated_account_manager',
    'onboarding_assistance',
    'custom_training',
  ],
  limits: {
    articlesPerMonth: -1, // Unlimited
    aiWordsPerMonth: -1,
    imagesPerMonth: -1,
    keywordResearchPerMonth: -1,
    serpAnalysisPerMonth: -1,
    backlinkExchangeRequests: -1,
    publishedArticlesPerMonth: -1,
    scheduledArticles: -1,
    bulkPublishBatchSize: -1,
    apiRequestsPerMonth: -1,
    webhookEventsPerMonth: -1,
    teamMembers: -1,
    organizations: -1,
    storageGb: -1,
  },
  metadata: {
    tier: 'agency',
    trialDays: 30,
  },
};

/**
 * All subscription plans indexed by ID
 */
export const PLANS: Record<string, SubscriptionPlan> = {
  free: FREE_PLAN,
  starter: STARTER_PLAN,
  pro: PRO_PLAN,
  agency: AGENCY_PLAN,
};

/**
 * Get a plan by ID
 */
export function getPlan(planId: string): SubscriptionPlan | undefined {
  return PLANS[planId];
}

/**
 * Get all available plans
 */
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(PLANS);
}

/**
 * Get plans for a specific tier
 */
export function getPlansByTier(
  tier: 'free' | 'starter' | 'pro' | 'agency'
): SubscriptionPlan[] {
  return Object.values(PLANS).filter((plan) => plan.metadata.tier === tier);
}

/**
 * Check if a plan includes a specific feature
 */
export function planHasFeature(
  planId: string,
  featureKey: FeatureKey
): boolean {
  const plan = getPlan(planId);
  if (!plan) return false;
  return plan.features.includes(featureKey);
}

/**
 * Check if a plan can use a feature based on usage limits
 */
export function canUseFeature(
  planId: string,
  featureKey: FeatureKey,
  currentUsage?: number
): { allowed: boolean; limit: number; remaining?: number; reason?: string } {
  const plan = getPlan(planId);

  if (!plan) {
    return { allowed: false, limit: 0, reason: 'Plan not found' };
  }

  // Check if feature is included in plan
  if (!plan.features.includes(featureKey)) {
    return { allowed: false, limit: 0, reason: 'Feature not included in plan' };
  }

  // Determine the limit for this feature
  let limit = 0;

  switch (featureKey) {
    case 'ai_content_generation':
      limit = plan.limits.articlesPerMonth;
      break;
    case 'keyword_research':
      limit = plan.limits.keywordResearchPerMonth;
      break;
    case 'serp_analysis':
      limit = plan.limits.serpAnalysisPerMonth;
      break;
    case 'cms_publishing':
      limit = plan.limits.publishedArticlesPerMonth;
      break;
    case 'api_access':
      limit = plan.limits.apiRequestsPerMonth;
      break;
    default:
      // For features without explicit limits, allow them
      return { allowed: true, limit: -1 };
  }

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1 };
  }

  // If no usage data provided, just return the limit
  if (currentUsage === undefined) {
    return { allowed: true, limit };
  }

  // Check if usage is within limits
  const remaining = Math.max(0, limit - currentUsage);
  return {
    allowed: currentUsage < limit,
    limit,
    remaining,
    reason: currentUsage >= limit ? 'Monthly limit exceeded' : undefined,
  };
}

/**
 * Get feature limit for a plan
 */
export function getFeatureLimit(
  planId: string,
  featureKey: FeatureKey
): number {
  const plan = getPlan(planId);
  if (!plan) return 0;

  switch (featureKey) {
    case 'ai_content_generation':
      return plan.limits.articlesPerMonth;
    case 'keyword_research':
      return plan.limits.keywordResearchPerMonth;
    case 'serp_analysis':
      return plan.limits.serpAnalysisPerMonth;
    case 'cms_publishing':
      return plan.limits.publishedArticlesPerMonth;
    case 'api_access':
      return plan.limits.apiRequestsPerMonth;
    case 'team_members':
      return plan.limits.teamMembers;
    default:
      return -1; // Unlimited or not applicable
  }
}

/**
 * Format price for display
 */
export function formatPrice(
  amountInCents: number,
  currency: string = 'USD'
): string {
  if (amountInCents === 0) return 'Free';

  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(plan: SubscriptionPlan): string {
  if (plan.priceYearly === 0) return 'N/A';

  const monthlyTotal = plan.priceMonthly * 12;
  const savings = monthlyTotal - plan.priceYearly;

  if (savings <= 0) return 'No savings';

  const percentage = Math.round((savings / monthlyTotal) * 100);

  return formatPrice(savings, plan.currency); // e.g., "$98 (20%)"
}

/**
 * Get plan tier from Stripe price ID
 * This is useful when mapping Stripe webhooks to plan IDs
 */
export function getPlanIdFromStripePrice(priceId: string): string | undefined {
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (
      plan.stripePriceIdMonthly === priceId ||
      plan.stripePriceIdYearly === priceId
    ) {
      return planId;
    }
  }
  return undefined;
}

/**
 * Check if a plan is a paid plan
 */
export function isPaidPlan(planId: string): boolean {
  const plan = getPlan(planId);
  return plan ? plan.priceMonthly > 0 : false;
}

/**
 * Get the next upgrade plan
 */
export function getNextUpgradePlan(
  currentPlanId: string
): SubscriptionPlan | null {
  const planOrder = ['free', 'starter', 'pro', 'agency'];
  const currentIndex = planOrder.indexOf(currentPlanId);

  if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
    return null;
  }

  const nextPlanId = planOrder[currentIndex + 1];
  return getPlan(nextPlanId) || null;
}

/**
 * Compare plans to see what features are gained/lost
 */
export function comparePlans(
  fromPlanId: string,
  toPlanId: string
): {
  gainedFeatures: FeatureKey[];
  lostFeatures: FeatureKey[];
  increasedLimits: Array<{
    feature: string;
    from: number | string;
    to: number | string;
  }>;
  decreasedLimits: Array<{
    feature: string;
    from: number | string;
    to: number | string;
  }>;
} {
  const fromPlan = getPlan(fromPlanId);
  const toPlan = getPlan(toPlanId);

  if (!fromPlan || !toPlan) {
    return {
      gainedFeatures: [],
      lostFeatures: [],
      increasedLimits: [],
      decreasedLimits: [],
    };
  }

  const gainedFeatures = toPlan.features.filter(
    (f) => !fromPlan.features.includes(f)
  );

  const lostFeatures = fromPlan.features.filter(
    (f) => !toPlan.features.includes(f)
  );

  const increasedLimits: Array<{
    feature: string;
    from: number | string;
    to: number | string;
  }> = [];
  const decreasedLimits: Array<{
    feature: string;
    from: number | string;
    to: number | string;
  }> = [];

  // Compare limits
  const limitFields: (keyof UsageLimits)[] = [
    'articlesPerMonth',
    'aiWordsPerMonth',
    'keywordResearchPerMonth',
    'publishedArticlesPerMonth',
    'teamMembers',
  ];

  limitFields.forEach((field) => {
    const from = fromPlan.limits[field];
    const to = toPlan.limits[field];

    if (to > from) {
      increasedLimits.push({
        feature: field,
        from: from === -1 ? 'Unlimited' : from.toString(),
        to: to === -1 ? 'Unlimited' : to.toString(),
      });
    } else if (from > to && to !== -1) {
      decreasedLimits.push({
        feature: field,
        from: from === -1 ? 'Unlimited' : from.toString(),
        to: to === -1 ? 'Unlimited' : to.toString(),
      });
    }
  });

  return {
    gainedFeatures,
    lostFeatures,
    increasedLimits,
    decreasedLimits,
  };
}

/**
 * Get popular plans
 */
export function getPopularPlans(): SubscriptionPlan[] {
  return Object.values(PLANS).filter((plan) => plan.metadata.popularity);
}

/**
 * Get trial days for a plan
 */
export function getTrialDays(planId: string): number {
  const plan = getPlan(planId);
  return plan?.metadata.trialDays || 0;
}

/**
 * Check if a plan offers a trial
 */
export function hasTrial(planId: string): boolean {
  return getTrialDays(planId) > 0;
}
