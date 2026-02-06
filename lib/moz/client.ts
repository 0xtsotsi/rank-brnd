/**
 * Moz API Client
 *
 * Provides a client for interacting with the Moz API (Links API v1)
 * to fetch domain authority and link metrics.
 *
 * API Documentation: https://moz.com/products/api/links-api
 */

/**
 * Configuration for Moz API client
 */
export interface MozConfig {
  accessId: string;
  secretKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Domain authority metrics returned by Moz API
 */
export interface DomainAuthorityMetrics {
  domain: string;
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  linkingRootDomains: number;
  rankingKeywords: number | null;
  createdAt: Date;
}

/**
 * Error response from Moz API
 */
export interface MozApiError {
  error: string;
  message: string;
  code?: string;
}

/**
 * Batch request item for Moz API
 */
export interface MozBatchRequestItem {
  target: string;
  scope?: 'page' | 'domain' | 'root_domain';
  filters?: string[];
}

/**
 * Response data from Moz URL Metrics endpoint
 */
export interface MozUrlMetricsResponse {
  sort?: string;
  filter?: string;
  next_token?: string;
  results: Array<{
    sort?: string;
    filter?: string;
    next_token?: string;
    results: Array<{
      domain_authority: number;
      page_authority: number;
      spam_score: number;
      root_domains_to_page: number;
      root_domains_to_root_domain: number;
      ranking_keywords: number;
      global_volume: number;
      error?: string;
    }>;
  }>;
}

/**
 * Moz API client implementation
 */
export class MozClient {
  private readonly accessId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: MozConfig) {
    this.accessId = config.accessId;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl || 'https://lsapi.seomoz.com/anchor/v1';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Generate authentication signature for Moz API request
   * Uses HMAC-SHA256 encoding as per Moz API specification
   */
  private generateSignature(timestamp: number): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(`${this.accessId}\n${timestamp}`);
    return hmac.digest('base64');
  }

  /**
   * Execute a fetch request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Execute a Moz API request with authentication
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp);

    // Build query string with authentication
    const queryParams = new URLSearchParams({
      ...Object.entries(params).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        },
        {} as Record<string, string>
      ),
      'Access-ID': this.accessId,
      Expires: (timestamp + this.timeout).toString(),
      Signature: signature,
    });

    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;

    const response = await this.fetchWithTimeout(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Moz API request failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Normalize a domain URL for Moz API
   * Extracts the domain from a full URL if needed
   */
  private normalizeDomain(domain: string): string {
    // Remove protocol if present
    let normalized = domain.replace(/^https?:\/\//, '');

    // Remove path and port if present
    normalized = normalized.split('/')[0].split(':')[0];

    // Remove www prefix for consistency
    if (normalized.startsWith('www.')) {
      normalized = normalized.slice(4);
    }

    return normalized;
  }

  /**
   * Get domain authority metrics for a single domain
   *
   * @param domain - The domain to check (e.g., "example.com" or "https://example.com")
   * @returns Domain authority metrics
   */
  async getDomainAuthority(domain: string): Promise<DomainAuthorityMetrics> {
    const normalizedDomain = this.normalizeDomain(domain);

    try {
      const response = await this.request<any>('/url-metrics', {
        target: normalizedDomain,
        scope: 'root_domain',
      });

      // Handle both response formats (direct result or wrapped in results array)
      const data = Array.isArray(response?.results)
        ? response.results[0]
        : response;

      if (data?.error) {
        throw new Error(`Moz API error: ${data.error}`);
      }

      return {
        domain: normalizedDomain,
        domainAuthority: data?.domain_authority ?? 0,
        pageAuthority: data?.page_authority ?? 0,
        spamScore: data?.spam_score ?? 0,
        linkingRootDomains: data?.root_domains_to_root_domain ?? 0,
        rankingKeywords: data?.ranking_keywords ?? null,
        createdAt: new Date(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch domain authority for ${normalizedDomain}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get domain authority metrics for multiple domains in a single request
   *
   * @param domains - Array of domains to check
   * @returns Array of domain authority metrics
   */
  async getBatchDomainAuthority(
    domains: string[]
  ): Promise<DomainAuthorityMetrics[]> {
    const normalizedDomains = domains.map((d) => this.normalizeDomain(d));

    try {
      // Moz API requires batch requests to use POST with specific format
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const url = new URL(`${this.baseUrl}/url-metrics`);
      url.searchParams.set('Access-ID', this.accessId);
      url.searchParams.set('Expires', (timestamp + this.timeout).toString());
      url.searchParams.set('Signature', signature);

      const response = await this.fetchWithTimeout(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targets: normalizedDomains.map((domain) => ({
            target: domain,
            scope: 'root_domain',
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Moz API batch request failed: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      const results = data?.results || data || [];

      return results.map((item: any) => ({
        domain: item.target || normalizedDomains,
        domainAuthority: item?.domain_authority ?? 0,
        pageAuthority: item?.page_authority ?? 0,
        spamScore: item?.spam_score ?? 0,
        linkingRootDomains: item?.root_domains_to_root_domain ?? 0,
        rankingKeywords: item?.ranking_keywords ?? null,
        createdAt: new Date(),
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch batch domain authority: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Check if a domain is valid for checking
   */
  isValidDomain(domain: string): boolean {
    const normalized = this.normalizeDomain(domain);
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(normalized);
  }
}

/**
 * Singleton Moz client instance
 */
let clientInstance: MozClient | null = null;

/**
 * Initialize or get the Moz API client singleton
 */
export function getMozClient(): MozClient | null {
  if (clientInstance) {
    return clientInstance;
  }

  const accessId = process.env.MOZ_API_ACCESS_ID;
  const secretKey = process.env.MOZ_API_SECRET_KEY;
  const baseUrl = process.env.MOZ_API_BASE_URL;
  const timeout = process.env.MOZ_API_TIMEOUT
    ? parseInt(process.env.MOZ_API_TIMEOUT, 10)
    : undefined;

  if (!accessId || !secretKey) {
    // Return null if not configured - allows graceful degradation
    return null;
  }

  clientInstance = new MozClient({
    accessId,
    secretKey,
    baseUrl,
    timeout,
  });

  return clientInstance;
}

/**
 * Reset the Moz client singleton (useful for testing)
 */
export function resetMozClient(): void {
  clientInstance = null;
}

/**
 * Check if Moz API is properly configured
 */
export function isMozConfigured(): boolean {
  return !!(process.env.MOZ_API_ACCESS_ID && process.env.MOZ_API_SECRET_KEY);
}

/**
 * Get the cache TTL from environment (in milliseconds)
 * Default: 30 days (2592000000 ms)
 */
export function getMozCacheTTL(): number {
  const ttl = process.env.MOZ_CACHE_TTL;
  if (ttl) {
    const parsed = parseInt(ttl, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return 2592000000; // 30 days in milliseconds
}
