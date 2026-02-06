/**
 * Domain Authority API Route
 *
 * Handles domain authority checking using Moz API with caching.
 * Cached results are stored in Redis with a 30-day TTL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getMozClient,
  isMozConfigured,
  getMozCacheTTL,
  type DomainAuthorityMetrics,
} from '@/lib/moz';
import { getRedisClient } from '@/lib/redis';

/**
 * Cache key prefix for domain authority data
 */
const CACHE_PREFIX = 'domain_authority:';

/**
 * Get cache key for a domain
 */
function getCacheKey(domain: string): string {
  // Normalize domain for cache key
  const normalized = domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();
  return `${CACHE_PREFIX}${normalized}`;
}

/**
 * Get cached domain authority data
 */
async function getCachedDomainAuthority(
  domain: string
): Promise<DomainAuthorityMetrics | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cacheKey = getCacheKey(domain);
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached) as DomainAuthorityMetrics & {
        createdAt: string;
      };
      // Convert date string back to Date object
      return {
        ...data,
        createdAt: new Date(data.createdAt),
      };
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }

  return null;
}

/**
 * Cache domain authority data
 */
async function cacheDomainAuthority(
  domain: string,
  data: DomainAuthorityMetrics
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const cacheKey = getCacheKey(domain);
    const ttl = getMozCacheTTL();
    await redis.set(cacheKey, JSON.stringify(data), {
      px: ttl,
    });
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Normalize domain URL
 */
function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(normalized);
}

/**
 * GET /api/domain-authority
 * Fetch domain authority for a single domain
 *
 * Query params:
 * - domain: The domain to check (required)
 * - bypassCache: Set to 'true' to bypass cache and fetch fresh data
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Moz API is configured
    if (!isMozConfigured()) {
      return NextResponse.json(
        { error: 'Moz API is not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const bypassCache = searchParams.get('bypassCache') === 'true';

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    const normalizedDomain = normalizeDomain(domain);

    // Check cache first (unless bypassing)
    if (!bypassCache) {
      const cached = await getCachedDomainAuthority(normalizedDomain);
      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true,
        });
      }
    }

    // Fetch from Moz API
    const mozClient = getMozClient();
    if (!mozClient) {
      return NextResponse.json(
        { error: 'Moz API client not available' },
        { status: 503 }
      );
    }

    const metrics = await mozClient.getDomainAuthority(normalizedDomain);

    // Cache the results
    await cacheDomainAuthority(normalizedDomain, metrics);

    return NextResponse.json({
      ...metrics,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching domain authority:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch domain authority',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/domain-authority
 * Fetch domain authority for multiple domains (batch request)
 *
 * Body:
 * - domains: Array of domains to check (required, max 50)
 * - bypassCache: Set to true to bypass cache (optional, default false)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Moz API is configured
    if (!isMozConfigured()) {
      return NextResponse.json(
        { error: 'Moz API is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { domains, bypassCache = false } = body;

    if (!Array.isArray(domains)) {
      return NextResponse.json(
        { error: 'Domains must be an array' },
        { status: 400 }
      );
    }

    if (domains.length === 0) {
      return NextResponse.json(
        { error: 'At least one domain is required' },
        { status: 400 }
      );
    }

    if (domains.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 domains per batch request' },
        { status: 400 }
      );
    }

    // Validate all domains
    const invalidDomains = domains.filter((d) => !isValidDomain(d));
    if (invalidDomains.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid domain format',
          invalidDomains,
        },
        { status: 400 }
      );
    }

    const normalizedDomains = domains.map((d: string) => normalizeDomain(d));

    // Check cache for domains that aren't being bypassed
    const results: Array<DomainAuthorityMetrics & { cached: boolean }> = [];
    const domainsToFetch: string[] = [];

    for (const domain of normalizedDomains) {
      if (bypassCache) {
        domainsToFetch.push(domain);
        continue;
      }

      const cached = await getCachedDomainAuthority(domain);
      if (cached) {
        results.push({ ...cached, cached: true });
      } else {
        domainsToFetch.push(domain);
      }
    }

    // Fetch remaining domains from Moz API
    if (domainsToFetch.length > 0) {
      const mozClient = getMozClient();
      if (!mozClient) {
        return NextResponse.json(
          { error: 'Moz API client not available' },
          { status: 503 }
        );
      }

      const freshMetrics =
        await mozClient.getBatchDomainAuthority(domainsToFetch);

      // Cache the fresh results
      for (const metric of freshMetrics) {
        await cacheDomainAuthority(metric.domain, metric);
        results.push({ ...metric, cached: false });
      }
    }

    // Sort results to match input order
    const sortedResults = normalizedDomains
      .map((domain) => results.find((r) => r.domain === domain))
      .filter((r): r is DomainAuthorityMetrics & { cached: boolean } => !!r);

    return NextResponse.json({
      results: sortedResults,
      total: sortedResults.length,
      cached: sortedResults.filter((r) => r.cached).length,
      fetched: sortedResults.filter((r) => !r.cached).length,
    });
  } catch (error) {
    console.error('Error fetching batch domain authority:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch domain authority',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
