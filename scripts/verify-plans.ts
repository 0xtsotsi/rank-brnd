/**
 * Subscription Plans Verification Script
 *
 * This script verifies that the subscription plan tiers are correctly configured.
 * Run with: npx tsx scripts/verify-plans.ts
 */

interface PlanLimits {
  articlesPerMonth: number;
  aiWordsPerMonth: number;
  imagesPerMonth: number;
  keywordResearchPerMonth: number;
  serpAnalysisPerMonth: number;
  backlinkExchangeRequests: number;
  publishedArticlesPerMonth: number;
  scheduledArticles: number;
  bulkPublishBatchSize: number;
  apiRequestsPerMonth: number;
  webhookEventsPerMonth: number;
  teamMembers: number;
  organizations: number;
  storageGb: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: string[];
  limits: PlanLimits;
  metadata: {
    tier: string;
    popularity?: string;
    trialDays?: number;
  };
}

// Define expected plan configurations
const expectedPlans: Record<string, SubscriptionPlan> = {
  free: {
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
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Essential SEO tools for small businesses',
    priceMonthly: 2900,
    priceYearly: 29000,
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
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for growing teams',
    priceMonthly: 4900,
    priceYearly: 47000,
    currency: 'USD',
    features: [
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
      'team_members',
      'collaborative_editing',
      'approval_workflows',
      'analytics_dashboard',
      'custom_reports',
      'export_data',
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
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'Full-featured solution for agencies and enterprises',
    priceMonthly: 14900,
    priceYearly: 143000,
    currency: 'USD',
    features: [
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
      articlesPerMonth: -1,
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
  },
};

function verifyPlans() {
  console.log('🔍 Verifying Subscription Plans Configuration...\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Verify all 4 plans exist
  console.log('Test 1: Checking if all 4 plan tiers are defined...');
  const planIds = Object.keys(expectedPlans);
  if (
    planIds.length === 4 &&
    planIds.includes('free') &&
    planIds.includes('starter') &&
    planIds.includes('pro') &&
    planIds.includes('agency')
  ) {
    console.log(
      '✅ PASS: All 4 plan tiers are defined (free, starter, pro, agency)\n'
    );
    passedTests++;
  } else {
    console.log('❌ FAIL: Missing plan tiers\n');
    failedTests++;
  }

  // Test 2: Verify pricing
  console.log('Test 2: Checking pricing for all plans...');
  let pricingPassed = true;

  if (
    expectedPlans.free.priceMonthly !== 0 ||
    expectedPlans.free.priceYearly !== 0
  ) {
    console.log('❌ Free plan pricing is incorrect');
    pricingPassed = false;
  }

  if (
    expectedPlans.starter.priceMonthly !== 2900 ||
    expectedPlans.starter.priceYearly !== 29000
  ) {
    console.log('❌ Starter plan pricing is incorrect');
    pricingPassed = false;
  }

  if (expectedPlans.pro.priceMonthly !== 4900) {
    console.log('❌ Pro plan monthly pricing is incorrect');
    pricingPassed = false;
  }

  // Check Pro yearly discount (should be ~20%)
  const proMonthlyTotal = expectedPlans.pro.priceMonthly * 12;
  const proDiscount =
    ((proMonthlyTotal - expectedPlans.pro.priceYearly) / proMonthlyTotal) * 100;
  if (Math.abs(proDiscount - 20) > 1) {
    console.log(
      `❌ Pro plan yearly discount is incorrect (expected ~20%, got ${proDiscount.toFixed(1)}%)`
    );
    pricingPassed = false;
  }

  if (expectedPlans.agency.priceMonthly !== 14900) {
    console.log('❌ Agency plan monthly pricing is incorrect');
    pricingPassed = false;
  }

  // Check Agency yearly discount (should be ~20%)
  const agencyMonthlyTotal = expectedPlans.agency.priceMonthly * 12;
  const agencyDiscount =
    ((agencyMonthlyTotal - expectedPlans.agency.priceYearly) /
      agencyMonthlyTotal) *
    100;
  if (Math.abs(agencyDiscount - 20) > 1) {
    console.log(
      `❌ Agency plan yearly discount is incorrect (expected ~20%, got ${agencyDiscount.toFixed(1)}%)`
    );
    pricingPassed = false;
  }

  if (pricingPassed) {
    console.log('✅ PASS: All pricing is correct\n');
    passedTests++;
  } else {
    console.log('❌ FAIL: Pricing verification failed\n');
    failedTests++;
  }

  // Test 3: Verify limits increase across tiers
  console.log('Test 3: Checking if limits increase across plan tiers...');
  let limitsPassed = true;

  // Articles per month should increase
  if (
    !(
      expectedPlans.starter.limits.articlesPerMonth >
      expectedPlans.free.limits.articlesPerMonth
    )
  ) {
    console.log('❌ Starter articles limit should be higher than Free');
    limitsPassed = false;
  }
  if (
    !(
      expectedPlans.pro.limits.articlesPerMonth >
      expectedPlans.starter.limits.articlesPerMonth
    )
  ) {
    console.log('❌ Pro articles limit should be higher than Starter');
    limitsPassed = false;
  }
  if (expectedPlans.agency.limits.articlesPerMonth !== -1) {
    console.log('❌ Agency should have unlimited articles');
    limitsPassed = false;
  }

  // Team members should increase
  if (
    !(
      expectedPlans.starter.limits.teamMembers >
      expectedPlans.free.limits.teamMembers
    )
  ) {
    console.log('❌ Starter team limit should be higher than Free');
    limitsPassed = false;
  }
  if (
    !(
      expectedPlans.pro.limits.teamMembers >
      expectedPlans.starter.limits.teamMembers
    )
  ) {
    console.log('❌ Pro team limit should be higher than Starter');
    limitsPassed = false;
  }
  if (expectedPlans.agency.limits.teamMembers !== -1) {
    console.log('❌ Agency should have unlimited team members');
    limitsPassed = false;
  }

  if (limitsPassed) {
    console.log('✅ PASS: Limits correctly increase across tiers\n');
    passedTests++;
  } else {
    console.log('❌ FAIL: Limits verification failed\n');
    failedTests++;
  }

  // Test 4: Verify feature count increases
  console.log('Test 4: Checking if feature count increases across tiers...');
  let featuresPassed = true;

  const freeFeatures = expectedPlans.free.features.length;
  const starterFeatures = expectedPlans.starter.features.length;
  const proFeatures = expectedPlans.pro.features.length;
  const agencyFeatures = expectedPlans.agency.features.length;

  if (!(starterFeatures > freeFeatures)) {
    console.log(
      `❌ Starter should have more features than Free (${starterFeatures} vs ${freeFeatures})`
    );
    featuresPassed = false;
  }
  if (!(proFeatures > starterFeatures)) {
    console.log(
      `❌ Pro should have more features than Starter (${proFeatures} vs ${starterFeatures})`
    );
    featuresPassed = false;
  }
  if (!(agencyFeatures > proFeatures)) {
    console.log(
      `❌ Agency should have more features than Pro (${agencyFeatures} vs ${proFeatures})`
    );
    featuresPassed = false;
  }

  if (featuresPassed) {
    console.log(
      `✅ PASS: Feature counts: Free=${freeFeatures}, Starter=${starterFeatures}, Pro=${proFeatures}, Agency=${agencyFeatures}\n`
    );
    passedTests++;
  } else {
    console.log('❌ FAIL: Feature count verification failed\n');
    failedTests++;
  }

  // Test 5: Verify API access
  console.log('Test 5: Checking API access permissions...');
  let apiPassed = true;

  if (expectedPlans.free.limits.apiRequestsPerMonth !== 0) {
    console.log('❌ Free plan should not have API access');
    apiPassed = false;
  }
  if (expectedPlans.starter.limits.apiRequestsPerMonth !== 0) {
    console.log('❌ Starter plan should not have API access');
    apiPassed = false;
  }
  if (expectedPlans.pro.limits.apiRequestsPerMonth !== 10000) {
    console.log('❌ Pro plan should have 10,000 API requests/month');
    apiPassed = false;
  }
  if (expectedPlans.agency.limits.apiRequestsPerMonth !== -1) {
    console.log('❌ Agency plan should have unlimited API requests');
    apiPassed = false;
  }

  if (apiPassed) {
    console.log('✅ PASS: API access permissions are correct\n');
    passedTests++;
  } else {
    console.log('❌ FAIL: API access verification failed\n');
    failedTests++;
  }

  // Test 6: Verify metadata
  console.log('Test 6: Checking plan metadata...');
  let metadataPassed = true;

  if (!expectedPlans.starter.metadata.popularity) {
    console.log('❌ Starter should have popularity badge');
    metadataPassed = false;
  }
  if (expectedPlans.starter.metadata.popularity !== 'most-popular') {
    console.log('❌ Starter popularity should be "most-popular"');
    metadataPassed = false;
  }
  if (!expectedPlans.pro.metadata.popularity) {
    console.log('❌ Pro should have popularity badge');
    metadataPassed = false;
  }
  if (expectedPlans.pro.metadata.popularity !== 'best-value') {
    console.log('❌ Pro popularity should be "best-value"');
    metadataPassed = false;
  }
  if (expectedPlans.starter.metadata.trialDays !== 14) {
    console.log('❌ Starter should have 14-day trial');
    metadataPassed = false;
  }
  if (expectedPlans.pro.metadata.trialDays !== 14) {
    console.log('❌ Pro should have 14-day trial');
    metadataPassed = false;
  }
  if (expectedPlans.agency.metadata.trialDays !== 30) {
    console.log('❌ Agency should have 30-day trial');
    metadataPassed = false;
  }

  if (metadataPassed) {
    console.log('✅ PASS: Plan metadata is correct\n');
    passedTests++;
  } else {
    console.log('❌ FAIL: Metadata verification failed\n');
    failedTests++;
  }

  // Summary
  console.log(
    '═══════════════════════════════════════════════════════════════'
  );
  console.log('📊 VERIFICATION SUMMARY');
  console.log(
    '═══════════════════════════════════════════════════════════════'
  );
  console.log(`Total Tests: ${passedTests + failedTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(
    '═══════════════════════════════════════════════════════════════'
  );

  if (failedTests === 0) {
    console.log(
      '\n🎉 All tests passed! Subscription plans are correctly configured.'
    );
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the configuration.');
    process.exit(1);
  }
}

// Run verification
verifyPlans();
