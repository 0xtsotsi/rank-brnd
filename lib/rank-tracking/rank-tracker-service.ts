/**
 * Rank Tracking Service
 *
 * High-level service for tracking keyword rankings using DataForSEO.
 * Handles database operations and integrates with the rank_tracking table.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  DataForSEORankTracker,
  TrackKeywordRequest,
} from './dataforseo-client';
import {
  bulkInsertRankTracking,
  upsertRankTracking,
} from '@/lib/supabase/rank-tracking';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ context: 'RankTrackerService' });

// ============================================================================
// Types
// ============================================================================

export interface KeywordToTrack {
  keyword_id: string;
  keyword: string;
  product_id?: string;
  domain: string;
  location?: string;
  location_code?: number;
  language?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
}

export interface TrackKeywordsOptions {
  organizationId: string;
  keywords: KeywordToTrack[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface RankTrackingJobResult {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ keyword: string; error: string }>;
  durationMs: number;
  cost: number;
}

export interface GetKeywordsToTrackOptions {
  organizationId?: string;
  productId?: string;
  limit?: number;
  device?: 'desktop' | 'mobile' | 'tablet';
  location?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class RankTrackerService {
  private client: SupabaseClient<Database>;
  private tracker: DataForSEORankTracker | null;

  constructor(
    client: SupabaseClient<Database>,
    tracker?: DataForSEORankTracker
  ) {
    this.client = client;
    this.tracker = tracker || this.createTrackerFromEnv();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createTrackerFromEnv(): DataForSEORankTracker | null {
    const username = process.env.DATAFORSEO_USERNAME;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!username || !password) {
      logger.warn('DataForSEO credentials not configured');
      return null;
    }

    return new DataForSEORankTracker(
      { username, password },
      {
        apiBaseUrl: process.env.DATAFORSEO_API_BASE_URL,
        apiVersion: process.env.DATAFORSEO_API_VERSION,
        timeout: parseInt(process.env.DATAFORSEO_TIMEOUT || '60000', 10),
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private normalizeDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^www\./, '').replace(/^https?:\/\//, '');
    }
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Track ranks for multiple keywords
   *
   * @param options - Tracking options including keywords to track
   * @returns Promise with tracking results
   */
  async trackKeywords(
    options: TrackKeywordsOptions
  ): Promise<RankTrackingJobResult> {
    const startTime = Date.now();
    const result: RankTrackingJobResult = {
      total: options.keywords.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      durationMs: 0,
      cost: 0,
    };

    if (!this.tracker) {
      throw new Error('DataForSEO rank tracker not configured');
    }

    if (options.keywords.length === 0) {
      return result;
    }

    const batchSize = options.batchSize || 50;
    const delayBetweenBatches = options.delayBetweenBatches || 1000;
    const today = new Date().toISOString().split('T')[0];

    // Process in batches
    for (let i = 0; i < options.keywords.length; i += batchSize) {
      const batch = options.keywords.slice(i, i + batchSize);

      // Build track requests
      const trackRequests: TrackKeywordRequest[] = batch.map((kw) => ({
        keyword: kw.keyword,
        keyword_id: kw.keyword_id,
        product_id: kw.product_id,
        domain: this.normalizeDomain(kw.domain),
        location: kw.location,
        location_code: kw.location_code,
        language: kw.language,
        device: kw.device,
      }));

      try {
        // Call DataForSEO API
        const trackingResult = await this.tracker.trackKeywords(trackRequests);
        result.cost += trackingResult.total_cost;

        // Process results and store in database
        const recordsToInsert = trackingResult.results
          .filter(
            (r) =>
              r.success &&
              r.result &&
              r.result.positions.length > 0 &&
              r.keyword_id
          )
          .map((r) => {
            const topPosition = r.result!.positions[0];
            return {
              organization_id: options.organizationId,
              product_id: r.result!.product_id,
              keyword_id: r.keyword_id!,
              position: topPosition.position,
              device: r.result!.device as 'desktop' | 'mobile' | 'tablet',
              location: r.result!.location_name || 'us',
              url: topPosition.url,
              date: today,
              search_volume: 0, // Not available from SERP API
              impressions: 0,
              clicks: 0,
              metadata: {
                total_results: r.result!.total_results,
                all_positions: r.result!.positions.map((p) => ({
                  position: p.position,
                  url: p.url,
                  domain: p.domain,
                })),
                searched_at: r.result!.searched_at,
              } as Record<string, unknown>,
            };
          });

        if (recordsToInsert.length > 0) {
          const insertResult = await bulkInsertRankTracking(
            this.client,
            recordsToInsert
          );

          if (!insertResult.success) {
            logger.error('Failed to insert rank tracking records', {
              error: insertResult.error,
            });
            result.failed += batch.length;
            result.errors.push({
              keyword: 'batch',
              error: insertResult.error,
            });
          } else {
            result.successful += insertResult.data.successful;
            result.failed += insertResult.data.failed;

            if (insertResult.data.errors.length > 0) {
              insertResult.data.errors.forEach((err) => {
                result.errors.push({
                  keyword: 'unknown',
                  error: err,
                });
              });
            }
          }
        }

        // Handle failed requests
        trackingResult.results.forEach((r) => {
          if (!r.success) {
            result.errors.push({
              keyword: r.keyword,
              error: r.error || 'Unknown error',
            });
          }
        });

        result.processed += batch.length;
      } catch (error) {
        logger.error('Error tracking keywords batch', {
          batch: i / batchSize + 1,
          error: error instanceof Error ? error.message : String(error),
        });

        result.failed += batch.length;
        batch.forEach((kw) => {
          result.errors.push({
            keyword: kw.keyword,
            error: error instanceof Error ? error.message : String(error),
          });
        });

        result.processed += batch.length;
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < options.keywords.length) {
        await this.delay(delayBetweenBatches);
      }
    }

    result.durationMs = Date.now() - startTime;

    logger.info('Rank tracking job completed', {
      total: result.total,
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      durationMs: result.durationMs,
      cost: result.cost,
    });

    return result;
  }

  /**
   * Track rank for a single keyword
   *
   * @param keyword - Keyword to track
   * @param domain - Domain to search for
   * @param organizationId - Organization ID
   * @param options - Optional tracking parameters
   * @returns Promise with tracking result
   */
  async trackSingleKeyword(
    keyword: string,
    domain: string,
    organizationId: string,
    options: {
      keywordId?: string;
      productId?: string;
      location?: string;
      device?: 'desktop' | 'mobile' | 'tablet';
    } = {}
  ): Promise<{
    success: boolean;
    position?: number;
    url?: string;
    error?: string;
  }> {
    if (!this.tracker) {
      return {
        success: false,
        error: 'DataForSEO rank tracker not configured',
      };
    }

    try {
      const result = await this.tracker.trackKeyword({
        keyword,
        domain: this.normalizeDomain(domain),
        location: options.location,
        device: options.device,
        keyword_id: options.keywordId,
        product_id: options.productId,
      });

      if (result.positions.length === 0) {
        return {
          success: true,
          error: 'Domain not found in search results',
        };
      }

      const topPosition = result.positions[0];
      const today = new Date().toISOString().split('T')[0];

      // Store in database
      const upsertResult = await upsertRankTracking(this.client, {
        organization_id: organizationId,
        product_id: options.productId,
        keyword_id: options.keywordId || keyword,
        position: topPosition.position,
        device: result.device as 'desktop' | 'mobile' | 'tablet',
        location: result.location_name || 'us',
        url: topPosition.url,
        date: today,
        metadata: {
          total_results: result.total_results,
          searched_at: result.searched_at,
        } as Record<string, unknown>,
      });

      if (!upsertResult.success) {
        logger.error('Failed to upsert rank tracking record', {
          error: upsertResult.error,
        });
      }

      return {
        success: true,
        position: topPosition.position,
        url: topPosition.url,
      };
    } catch (error) {
      logger.error('Error tracking single keyword', {
        keyword,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get keywords that need to be tracked
   *
   * @param options - Filter options
   * @returns Promise with keywords to track
   */
  async getKeywordsToTrack(
    options: GetKeywordsToTrackOptions = {}
  ): Promise<KeywordToTrack[]> {
    // This method queries the keywords table to find active keywords
    // that need rank tracking

    const { organizationId, productId, limit = 100 } = options;

    let query = this.client
      .from('keywords')
      .select('id, keyword, product_id')
      .eq('active', true)
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching keywords to track', { error });
      return [];
    }

    if (!data) {
      return [];
    }

    // Get organization default domain
    const keywordsToTrack: KeywordToTrack[] = [];
    const domain = await this.getOrganizationDomain(organizationId);

    for (const keyword of data as any[]) {
      keywordsToTrack.push({
        keyword_id: keyword.id,
        keyword: keyword.keyword,
        product_id: keyword.product_id || undefined,
        domain,
        location: options.location,
        device: options.device,
      });
    }

    return keywordsToTrack;
  }

  /**
   * Get organization's default domain for rank tracking
   */
  private async getOrganizationDomain(
    organizationId?: string
  ): Promise<string> {
    if (!organizationId) {
      return 'example.com';
    }

    const { data } = await this.client
      .from('organizations')
      .select('domain')
      .eq('id', organizationId)
      .single();

    return (data as any)?.domain || 'example.com';
  }

  /**
   * Check if the tracker is properly configured
   */
  isConfigured(): boolean {
    return this.tracker !== null;
  }

  /**
   * Get estimated cost for tracking keywords
   */
  estimateCost(keywordCount: number): number {
    if (!this.tracker) {
      return 0;
    }

    return this.tracker.estimateCost(keywordCount);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a rank tracker service from a Supabase client
 */
export function createRankTrackerService(
  client: SupabaseClient<Database>,
  tracker?: DataForSEORankTracker
): RankTrackerService {
  return new RankTrackerService(client, tracker);
}

/**
 * Run a rank tracking job for an organization
 *
 * This is a convenience function for background jobs
 */
export async function runRankTrackingJob(
  client: SupabaseClient<Database>,
  organizationId: string,
  options?: {
    productId?: string;
    device?: 'desktop' | 'mobile' | 'tablet';
    location?: string;
    limit?: number;
  }
): Promise<RankTrackingJobResult> {
  const service = createRankTrackerService(client);

  if (!service.isConfigured()) {
    throw new Error('DataForSEO rank tracker not configured');
  }

  const keywords = await service.getKeywordsToTrack({
    organizationId,
    productId: options?.productId,
    device: options?.device,
    location: options?.location,
    limit: options?.limit,
  });

  if (keywords.length === 0) {
    return {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      durationMs: 0,
      cost: 0,
    };
  }

  return service.trackKeywords({
    organizationId,
    keywords,
    batchSize: 50,
    delayBetweenBatches: 1000,
  });
}
