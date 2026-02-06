/**
 * Usage Limits Middleware
 *
 * This middleware integrates with Next.js middleware and API routes
 * to enforce usage limits before operations are executed.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { UsageMetric } from '@/types/usage';
import { checkUsageLimit, recordUsage } from './usage-limits';

/**
 * Middleware configuration for usage tracking
 */
export interface UsageMiddlewareConfig {
  metric: UsageMetric;
  quantityExtractor?: (request: NextRequest) => number | Promise<number>;
  strict?: boolean;
  bypassCheck?: boolean; // For testing or admin operations
}

/**
 * Map of route patterns to usage metrics
 */
export const ROUTE_USAGE_MAP: Record<string, UsageMiddlewareConfig> = {
  // Content routes
  '/api/articles': {
    metric: 'articles_created',
    quantityExtractor: async (req) => {
      if (req.method === 'POST') return 1;
      if (req.method === 'DELETE') return 0;
      return 0;
    },
    strict: true,
  },

  // Keyword research routes
  '/api/keywords/research': {
    metric: 'keyword_research_queries',
    quantityExtractor: async (req) => {
      if (req.method === 'POST') {
        try {
          const body = await req.json();
          return Array.isArray(body) ? body.length : 1;
        } catch {
          return 1;
        }
      }
      return 0;
    },
    strict: true,
  },

  // SERP analysis routes
  '/api/serp/analyze': {
    metric: 'serp_analyses',
    quantityExtractor: async (req) => {
      if (req.method === 'POST') return 1;
      return 0;
    },
    strict: true,
  },

  // Backlink exchange routes
  '/api/backlinks/request': {
    metric: 'backlink_requests',
    quantityExtractor: async (req) => {
      if (req.method === 'POST') return 1;
      return 0;
    },
    strict: true,
  },

  // Publishing routes
  '/api/publish': {
    metric: 'articles_published',
    quantityExtractor: async (req) => {
      if (req.method === 'POST') {
        try {
          const body = await req.json();
          return Array.isArray(body.articles) ? body.articles.length : 1;
        } catch {
          return 1;
        }
      }
      return 0;
    },
    strict: true,
  },

  // CMS integration routes (for counting integrations)
  '/api/integrations/cms': {
    metric: 'cms_integrations',
    quantityExtractor: async (req) => {
      if (req.method === 'POST') return 1;
      if (req.method === 'DELETE') return -1; // Decrement
      return 0;
    },
    strict: true,
  },
};

/**
 * Check usage limit for a request
 */
export async function checkUsageForRequest(
  request: NextRequest,
  organizationId: string,
  planId: string,
  config: UsageMiddlewareConfig
): Promise<{ allowed: boolean; response?: NextResponse; quantity: number }> {
  // Extract quantity from request
  const quantity = config.quantityExtractor
    ? await config.quantityExtractor(request)
    : 1;

  // If no quantity to check, allow
  if (quantity <= 0) {
    return { allowed: true, quantity };
  }

  // Check usage limit
  const check = await checkUsageLimit(
    organizationId,
    planId,
    config.metric,
    quantity
  );

  if (!check.allowed && config.strict !== false) {
    // Return error response
    const response = NextResponse.json(
      {
        error: 'Usage limit exceeded',
        message:
          check.reason || `You have exceeded your ${config.metric} limit`,
        metric: check.metric,
        limit: check.limit,
        currentUsage: check.currentUsage,
        resetDate: check.resetDate,
      },
      { status: 429 } // 429 Too Many Requests
    );

    // Add headers for quota information
    response.headers.set('X-Usage-Limit', check.limit.toString());
    response.headers.set('X-Usage-Current', check.currentUsage.toString());
    response.headers.set('X-Usage-Remaining', check.remaining.toString());
    response.headers.set('X-Usage-Reset', check.resetDate.toISOString());

    return { allowed: false, response, quantity };
  }

  return { allowed: true, quantity };
}

/**
 * Record usage after successful request
 */
export async function recordUsageForRequest(
  organizationId: string,
  planId: string,
  metric: UsageMetric,
  quantity: number
): Promise<void> {
  if (quantity > 0) {
    await recordUsage(organizationId, planId, metric, quantity, undefined, {
      strict: false, // Already checked, just record
    });
  }
}

/**
 * Get usage middleware configuration for a path
 */
export function getUsageConfigForPath(
  pathname: string
): UsageMiddlewareConfig | null {
  // Exact match
  if (ROUTE_USAGE_MAP[pathname]) {
    return ROUTE_USAGE_MAP[pathname];
  }

  // Prefix match
  for (const [route, config] of Object.entries(ROUTE_USAGE_MAP)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }

  return null;
}

/**
 * Add usage headers to response
 */
export function addUsageHeaders(
  response: NextResponse,
  check: {
    limit: number;
    currentUsage: number;
    remaining: number;
    resetDate: Date;
  }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', check.limit.toString());
  response.headers.set('X-RateLimit-Remaining', check.remaining.toString());
  response.headers.set('X-RateLimit-Reset', check.resetDate.toISOString());

  return response;
}

/**
 * Create a usage-limited API route handler wrapper
 *
 * Usage:
 * ```
 * import { withUsageLimit } from '@/lib/usage/middleware';
 *
 * export const POST = withUsageLimit(
 *   async (req, context) => {
 *     // Your handler logic
 *     return Response.json({ success: true });
 *   },
 *   {
 *     metric: 'articles_created',
 *     quantityExtractor: async (req) => 1,
 *   }
 * );
 * ```
 */
export function withUsageLimit<T extends any[]>(
  handler: (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> } & T
  ) => Promise<Response>,
  config: UsageMiddlewareConfig
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> } & T
  ): Promise<Response> => {
    // TODO: Get organizationId and planId from session
    // For now, this is a placeholder
    const organizationId = request.headers.get('X-Organization-ID') || '';
    const planId = request.headers.get('X-Plan-ID') || 'free';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Check usage
    const {
      allowed,
      response: errorResponse,
      quantity,
    } = await checkUsageForRequest(request, organizationId, planId, config);

    if (!allowed && errorResponse) {
      return errorResponse;
    }

    // Execute handler
    let response: Response;
    try {
      response = await handler(request, context);
    } catch (error) {
      // If handler fails, don't record usage
      throw error;
    }

    // Record usage on success
    if (allowed && quantity > 0) {
      await recordUsageForRequest(
        organizationId,
        planId,
        config.metric,
        quantity
      );
    }

    return response;
  };
}

/**
 * Usage error response type
 */
export interface UsageErrorResponse {
  error: string;
  message: string;
  metric: UsageMetric;
  limit: number;
  currentUsage: number;
  resetDate: string;
}
