/**
 * Zod Schema Library
 *
 * Centralized validation schemas for API routes.
 * Import schemas from here and use with validateRequest() helper.
 *
 * @example
 * import { createCheckoutSessionSchema, validateRequest } from '@/lib/schemas';
 *
 * export async function POST(req: NextRequest) {
 *   const body = await req.json();
 *   const result = validateRequest(body, createCheckoutSessionSchema);
 *   if (!result.success) {
 *     return NextResponse.json(result.error, { status: 400 });
 *   }
 *   // Use result.data
 * }
 */

// Re-export validation helper
export { validateRequest, type ValidationResult } from './validation';

// Re-export all schemas
export * from './stripe';
export * from './keywords';
export * from './onboarding';
export * from './usage';
export * from './common';
export * from './article-outline-generator';
export * from './article-draft-generator';
export * from './articles';
export * from './images';
export * from './products';
export * from './publishing-queue';
export * from './rank-tracking';
export * from './schedules';
export * from './brand-settings';
export * from './brand-voice-learning';
export * from './google-search-console';
export * from './integrations';
export * from './team-invitations';
export * from './team-members';
export * from './team-members-query';
export * from './backlinks';
export * from './competitor-comparisons';
export * from './exchange-network';
export * from './exchange-matches';
export * from './external-link-sources';
export * from './external-link-opportunities';
export * from './data-export';
export * from './internal-linking';
export * from './article-versions';
export * from './webhooks';
