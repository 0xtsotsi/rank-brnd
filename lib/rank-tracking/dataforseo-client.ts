/**
 * DataForSEO SERP/Rank Tracker Client
 *
 * This client handles SERP API requests to DataForSEO for rank tracking.
 * DataForSEO Docs: https://docs.dataforseo.com/v3/serp_api/google/organic/live/
 *
 * Usage:
 * ```ts
 * const client = new DataForSEORankTracker({ username, password });
 * const result = await client.trackKeywordRanks([
 *   { keyword: 'best shoes', domain: 'example.com', location: 'us', device: 'desktop' }
 * ]);
 * ```
 */

import type {
  DataForSEOAuthConfig,
  DataForSEORankTrackerOptions,
  DataForSEORankTrackerError,
  GoogleOrganicSerpTaskRequest,
  SERPResponse,
  SERPTaskResult,
  SERPDevice,
  OrganicItem,
  RankTrackingResult,
  BulkRankTrackingResult,
} from './dataforseo-types';

export interface TrackKeywordRequest {
  keyword: string;
  keyword_id?: string;
  product_id?: string;
  domain: string;
  location?: string; // ISO country code
  location_code?: number;
  language?: string;
  device?: SERPDevice;
  depth?: number;
}

export interface DomainPosition {
  position: number;
  url: string;
  title?: string;
  description?: string;
  domain: string;
}

export class DataForSEORankTracker {
  private readonly username: string;
  private readonly password: string;
  private readonly apiBaseUrl: string;
  private readonly apiVersion: string;
  private readonly timeout: number;

  constructor(
    auth: DataForSEOAuthConfig,
    options: DataForSEORankTrackerOptions = {}
  ) {
    this.username = auth.username;
    this.password = auth.password;
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://api.dataforseo.com';
    this.apiVersion = options.apiVersion ?? 'v3';
    this.timeout = options.timeout ?? 60000; // Default 60 seconds
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get basic auth header
   */
  private getAuthHeader(): string {
    const credentials = `${this.username}:${this.password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Build full API URL
   */
  private buildUrl(endpoint: string): string {
    return `${this.apiBaseUrl}/${this.apiVersion}${endpoint}`;
  }

  /**
   * Parse API error response
   */
  private parseError(
    response: Response,
    data?: unknown
  ): DataForSEORankTrackerError {
    if (data && typeof data === 'object' && 'message' in data) {
      const errorData = data as {
        code?: number;
        message: string;
        errors?: unknown;
      };
      return {
        code: errorData.code ?? response.status,
        message: errorData.message,
        errors: errorData.errors as DataForSEORankTrackerError['errors'],
      };
    }
    return {
      code: response.status,
      message: response.statusText || 'Unknown error occurred',
    };
  }

  /**
   * Make an authenticated POST request to DataForSEO API
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: unknown;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        throw this.parseError(response, data);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw {
            code: 408,
            message: `Request timeout after ${this.timeout}ms`,
          } as DataForSEORankTrackerError;
        }
        // Re-throw if it's already a DataForSEO error
        if ('code' in error && 'message' in error) {
          throw error;
        }
        throw {
          code: 500,
          message: error.message,
        } as DataForSEORankTrackerError;
      }

      throw error;
    }
  }

  /**
   * Extract domain positions from SERP results
   */
  private extractDomainPositions(
    task: SERPTaskResult,
    targetDomain: string
  ): DomainPosition[] {
    const positions: DomainPosition[] = [];

    if (!task.items) {
      return positions;
    }

    // Normalize the target domain for comparison
    const normalizedTargetDomain = targetDomain
      .toLowerCase()
      .replace(/^www\./, '');

    for (const item of task.items) {
      if (item.type === 'organic') {
        const organicItem = item as OrganicItem;
        const itemDomain = organicItem.domain
          .toLowerCase()
          .replace(/^www\./, '');

        // Check if this is our target domain
        if (
          itemDomain === normalizedTargetDomain ||
          itemDomain.endsWith(`.${normalizedTargetDomain}`)
        ) {
          positions.push({
            position: item.rank_absolute,
            url: organicItem.url,
            title: organicItem.title,
            description: organicItem.description,
            domain: organicItem.domain,
          });
        }
      }
    }

    return positions;
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Track rank for a single keyword
   *
   * @param request - Keyword tracking request
   * @returns Promise with rank tracking result
   */
  async trackKeyword(
    request: TrackKeywordRequest
  ): Promise<RankTrackingResult> {
    const startTime = Date.now();

    // Build SERP task request
    const taskRequest: GoogleOrganicSerpTaskRequest = {
      keyword: request.keyword,
      location_code:
        request.location_code || this.getDefaultLocationCode(request.location),
      language_code: request.language || 'en',
      device: (request.device || 'desktop') as SERPDevice,
      depth: request.depth || 100,
    };

    // Make the API request
    const response = await this.post<SERPResponse>(
      '/serp/google/organic/live/advanced',
      [taskRequest]
    );

    const task = response.tasks?.[0];
    const result = task?.result?.[0];

    if (!result) {
      throw {
        code: 500,
        message: 'No results returned from DataForSEO',
      } as DataForSEORankTrackerError;
    }

    // Extract domain positions
    const positions = this.extractDomainPositions(result, request.domain);

    return {
      keyword: request.keyword,
      keyword_id: request.keyword_id,
      product_id: request.product_id,
      positions,
      device: taskRequest.device as SERPDevice,
      location_code: taskRequest.location_code,
      location_name: result.location_code
        ? String(result.location_code)
        : 'Unknown',
      language_code: taskRequest.language_code,
      total_results: result.total_results_count,
      searched_at: new Date().toISOString(),
      cost: task.cost || 0,
    };
  }

  /**
   * Track ranks for multiple keywords
   *
   * @param requests - Array of keyword tracking requests
   * @returns Promise with bulk rank tracking results
   */
  async trackKeywords(
    requests: TrackKeywordRequest[]
  ): Promise<BulkRankTrackingResult> {
    const startTime = Date.now();

    // Build SERP task requests
    const taskRequests: GoogleOrganicSerpTaskRequest[] = requests.map(
      (req) => ({
        keyword: req.keyword,
        location_code:
          req.location_code || this.getDefaultLocationCode(req.location),
        language_code: req.language || 'en',
        device: (req.device || 'desktop') as SERPDevice,
        depth: req.depth || 100,
      })
    );

    // Make the API request
    const response = await this.post<SERPResponse>(
      '/serp/google/organic/live/advanced',
      taskRequests
    );

    const results: BulkRankTrackingResult = {
      total: requests.length,
      successful: 0,
      failed: 0,
      results: [],
      total_cost: 0,
      duration_ms: Date.now() - startTime,
    };

    // Process each task result
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      const task = response.tasks?.[i];
      const result = task?.result?.[0];

      results.total_cost += task.cost || 0;

      if (task.status_code === 20000 && result) {
        try {
          const positions = this.extractDomainPositions(result, request.domain);

          results.results.push({
            keyword: request.keyword,
            keyword_id: request.keyword_id,
            success: true,
            result: {
              keyword: request.keyword,
              keyword_id: request.keyword_id,
              product_id: request.product_id,
              positions,
              device: taskRequests[i].device as SERPDevice,
              location_code: taskRequests[i].location_code,
              location_name: result.location_code
                ? String(result.location_code)
                : 'Unknown',
              language_code: taskRequests[i].language_code,
              total_results: result.total_results_count,
              searched_at: new Date().toISOString(),
              cost: task.cost || 0,
            },
          });
          results.successful++;
        } catch (error) {
          results.results.push({
            keyword: request.keyword,
            keyword_id: request.keyword_id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          results.failed++;
        }
      } else {
        results.results.push({
          keyword: request.keyword,
          keyword_id: request.keyword_id,
          success: false,
          error: task.status_message || 'Unknown error from DataForSEO',
        });
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get the top ranking pages for a keyword
   *
   * @param keyword - Keyword to search
   * @param location - Location code or ISO country code
   * @param device - Device type
   * @param limit - Number of results to return
   * @returns Promise with top SERP results
   */
  async getTopResults(
    keyword: string,
    location: string | number = 'us',
    device: SERPDevice = 'desktop',
    limit: number = 10
  ): Promise<
    Array<{
      position: number;
      title: string;
      url: string;
      domain: string;
      description: string;
    }>
  > {
    const locationCode =
      typeof location === 'number'
        ? location
        : this.getDefaultLocationCode(location);

    const taskRequest: GoogleOrganicSerpTaskRequest = {
      keyword,
      location_code: locationCode,
      language_code: 'en',
      device: device as SERPDevice,
      depth: limit,
    };

    const response = await this.post<SERPResponse>(
      '/serp/google/organic/live/advanced',
      [taskRequest]
    );

    const task = response.tasks?.[0];
    const result = task?.result?.[0];

    if (!result || !result.items) {
      return [];
    }

    return result.items
      .filter((item): item is OrganicItem => item.type === 'organic')
      .slice(0, limit)
      .map((item) => ({
        position: item.rank_absolute,
        title: item.title,
        url: item.url,
        domain: item.domain,
        description: item.description,
      }));
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get default location code from ISO country code
   */
  private getDefaultLocationCode(location?: string): number {
    // Common location codes from DataForSEO
    const locationMap: Record<string, number> = {
      us: 2840,
      gb: 2840,
      uk: 2840,
      ca: 2124,
      au: 2724,
      de: 2276,
      fr: 2130,
      es: 2246,
      it: 2380,
      jp: 2764,
      in: 2256,
      br: 2076,
      mx: 2472,
      nl: 2358,
      se: 2548,
      no: 2460,
      dk: 2118,
      fi: 2250,
      pl: 2504,
      ch: 2528,
      at: 2024,
      be: 2120,
    };

    if (!location) {
      return locationMap.us;
    }

    const normalized = location.toLowerCase().trim();
    return locationMap[normalized] || locationMap.us;
  }

  /**
   * Get estimated cost for a request
   * DataForSEO charges per SERP request
   */
  estimateCost(requestCount: number): number {
    // DataForSEO SERP API typically costs around $0.001-0.003 per request
    // Using a conservative estimate
    return requestCount * 0.003;
  }
}

/**
 * Create a DataForSEO rank tracker client from environment variables
 */
export function createDataForSEORankTracker(
  username?: string,
  password?: string,
  options?: DataForSEORankTrackerOptions
): DataForSEORankTracker | null {
  if (!username || !password) {
    return null;
  }

  return new DataForSEORankTracker({ username, password }, options);
}

/**
 * Create a DataForSEO rank tracker client from process.env
 */
export function createRankTrackerFromEnv(): DataForSEORankTracker | null {
  const username = process.env.DATAFORSEO_USERNAME;
  const password = process.env.DATAFORSEO_PASSWORD;

  return createDataForSEORankTracker(username, password, {
    apiBaseUrl: process.env.DATAFORSEO_API_BASE_URL,
    apiVersion: process.env.DATAFORSEO_API_VERSION,
    timeout: parseInt(process.env.DATAFORSEO_TIMEOUT || '60000', 10),
  });
}
