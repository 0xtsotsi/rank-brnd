'use client';

/**
 * Pricing Comparison Table Component
 *
 * Displays a side-by-side comparison of all subscription plans
 * with their features and limits.
 */

import { Check, X, Minus } from 'lucide-react';
import {
  FEATURES,
  FREE_PLAN,
  STARTER_PLAN,
  PRO_PLAN,
  AGENCY_PLAN,
} from '@/lib/stripe/plans';

const allPlans = [FREE_PLAN, STARTER_PLAN, PRO_PLAN, AGENCY_PLAN];

// Features to compare (most important ones)
const comparisonFeatures = [
  { key: 'ai_content_generation' as const, label: 'AI Content Generation' },
  { key: 'brand_voice_learning' as const, label: 'Brand Voice Learning' },
  { key: 'keyword_research' as const, label: 'Keyword Research' },
  { key: 'serp_analysis' as const, label: 'SERP Analysis' },
  { key: 'competitor_analysis' as const, label: 'Competitor Analysis' },
  { key: 'cms_integrations' as const, label: 'CMS Integrations' },
  { key: 'scheduled_publishing' as const, label: 'Scheduled Publishing' },
  { key: 'bulk_publishing' as const, label: 'Bulk Publishing' },
  { key: 'api_access' as const, label: 'API Access' },
  { key: 'webhooks' as const, label: 'Webhooks' },
  { key: 'team_members' as const, label: 'Team Collaboration' },
  { key: 'analytics_dashboard' as const, label: 'Analytics Dashboard' },
  { key: 'white_label_reports' as const, label: 'White-Label Reports' },
  { key: 'priority_support' as const, label: 'Priority Support' },
  { key: 'zapier_integration' as const, label: 'Zapier Integration' },
];

// Limits to compare
const comparisonLimits = [
  { key: 'articlesPerMonth' as const, label: 'Articles per Month' },
  { key: 'aiWordsPerMonth' as const, label: 'AI Words per Month' },
  { key: 'keywordResearchPerMonth' as const, label: 'Keyword Research' },
  { key: 'publishedArticlesPerMonth' as const, label: 'Published Articles' },
  { key: 'teamMembers' as const, label: 'Team Members' },
  { key: 'storageGb' as const, label: 'Storage (GB)' },
];

export function PricingComparisonTable() {
  return (
    <div className="space-y-8">
      {/* Features Comparison */}
      <div className="card overflow-hidden p-0">
        <h3 className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 text-lg font-semibold text-gray-900 dark:text-white">
          Feature Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Feature
                </th>
                {allPlans.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {comparisonFeatures.map((feature, index) => (
                <tr
                  key={feature.key}
                  className={
                    index % 2 === 0
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }
                >
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                    {feature.label}
                  </td>
                  {allPlans.map((plan) => {
                    const hasFeature = plan.features.includes(feature.key);
                    return (
                      <td key={plan.id} className="px-6 py-3 text-center">
                        {hasFeature ? (
                          <Check className="mx-auto h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="mx-auto h-5 w-5 text-gray-300 dark:text-gray-600" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Limits Comparison */}
      <div className="card overflow-hidden p-0">
        <h3 className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 text-lg font-semibold text-gray-900 dark:text-white">
          Usage Limits Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Limit
                </th>
                {allPlans.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {comparisonLimits.map((limit, index) => (
                <tr
                  key={limit.key}
                  className={
                    index % 2 === 0
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }
                >
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                    {limit.label}
                  </td>
                  {allPlans.map((plan) => {
                    const value = plan.limits[limit.key];
                    return (
                      <td
                        key={plan.id}
                        className="px-6 py-3 text-center text-sm text-gray-700 dark:text-gray-300"
                      >
                        {value === -1 ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            Unlimited
                          </span>
                        ) : (
                          value.toLocaleString()
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
