/**
 * Subscription Plan Types
 *
 * This file contains TypeScript types for subscription plans and billing.
 * These types complement the configuration in lib/stripe/plans.ts
 */

/**
 * Plan tier identifiers
 */
export type PlanTier = 'free' | 'starter' | 'pro' | 'agency';

/**
 * Billing interval
 */
export type BillingInterval = 'month' | 'year';

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active' // Subscription is active and paid
  | 'trialing' // Subscription is in trial period
  | 'past_due' // Payment is past due (grace period)
  | 'canceled' // Subscription is canceled but still active until period end
  | 'unpaid' // Payment failed and subscription is suspended
  | 'incomplete'; // Subscription creation is incomplete

/**
 * Feature key identifiers
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
  articlesPerMonth: number; // -1 for unlimited
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
    tier: PlanTier;
    popularity?: 'most-popular' | 'best-value';
    trialDays?: number;
  };
}

/**
 * Usage check result
 */
export interface UsageCheckResult {
  allowed: boolean;
  limit: number;
  remaining?: number;
  reason?: string;
}

/**
 * Plan comparison result
 */
export interface PlanComparison {
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
}

/**
 * Current usage statistics for an organization
 */
export interface UsageStats {
  // Current month usage
  articlesUsed: number;
  aiWordsUsed: number;
  imagesUsed: number;
  keywordResearchUsed: number;
  serpAnalysisUsed: number;
  backlinkRequestsUsed: number;
  publishedArticlesUsed: number;
  apiRequestsUsed: number;

  // Period information
  periodStart: Date;
  periodEnd: Date;
  resetDate: Date;
}

/**
 * Subscription with plan details
 */
export interface SubscriptionWithPlan {
  id: string;
  organizationId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  stripeProductId: string;
  status: SubscriptionStatus;
  planId: string;
  plan: SubscriptionPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice information
 */
export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amountPaid: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'deleted';
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

/**
 * Checkout session options
 */
export interface CheckoutSessionOptions {
  priceId: string;
  mode: 'subscription' | 'payment' | 'setup';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  customerId?: string;
  customerEmail?: string;
  subscriptionData?: {
    trial_period_days?: number;
    metadata?: Record<string, string>;
  };
}

/**
 * Checkout session result
 */
export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  customerId?: string;
  subscriptionId?: string;
}

/**
 * Plan upgrade/downgrade options
 */
export interface PlanChangeOptions {
  subscriptionId: string;
  newPriceId: string;
  prorationBehavior?: 'create_prorations' | 'always_invoice' | 'none';
  metadata?: Record<string, string>;
}

/**
 * Usage warning levels
 */
export type UsageWarningLevel = 'ok' | 'warning' | 'critical' | 'exceeded';

/**
 * Usage warning information
 */
export interface UsageWarning {
  feature: FeatureKey;
  level: UsageWarningLevel;
  current: number;
  limit: number;
  percentage: number;
  message: string;
}

/**
 * Feature availability result
 */
export interface FeatureAvailability {
  feature: FeatureKey;
  available: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: Date;
  warningLevel: UsageWarningLevel;
}

/**
 * Subscription summary for UI display
 */
export interface SubscriptionSummary {
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  tier: PlanTier;
  isPaid: boolean;
  isTrial: boolean;
  trialDaysRemaining: number | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  willCancelAtPeriodEnd: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
  nextBillingDate: Date | null;
  nextBillingAmount: number | null;
  currency: string;
}

/**
 * Plan card props for pricing page
 */
export interface PlanCardProps {
  plan: SubscriptionPlan;
  currentPlanId?: string;
  isYearly?: boolean;
  onSelectPlan: (planId: string, interval: BillingInterval) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Usage quota for metered features
 */
export interface UsageQuota {
  feature: FeatureKey;
  limit: number;
  used: number;
  remaining: number;
  resetDate: Date;
  isUnlimited: boolean;
}

/**
 * Billing history item
 */
export interface BillingHistoryItem {
  invoiceId: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  description: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

/**
 * Payment method information
 */
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string; // For cards: visa, mastercard, etc.
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

/**
 * Upcoming invoice information
 */
export interface UpcomingInvoice {
  subscriptionId: string;
  amountDue: number;
  currency: string;
  date: Date;
  lineItems: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}
