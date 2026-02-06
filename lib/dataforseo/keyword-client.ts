/**
 * DataForSEO Keyword Data Client
 *
 * This client handles Keyword Data API requests to DataForSEO for keyword research.
 * DataForSEO Docs: https://docs.dataforseo.com/v3/keyword_data/
 *
 * Usage:
 * ```ts
 * const client = new DataForSEOKeywordClient({ username, password });
 * const result = await client.getKeywordData('best shoes');
 * ```
 */

import type {
  DataForSEOAuthConfig,
  DataForSEOOptions,
  DataForSEOError,
  KeywordDataTaskRequest,
  KeywordDataTaskResult,
  KeywordSuggestionsResponse,
  DataForSEOResponse,
  KeywordSuggestionItem,
  SearchIntent,
} from './types';
import { getLocationCode, getLanguageCode } from './types';

export interface KeywordDataOptions {
  locationCode?: number;
  languageCode?: string;
  includeDifficulty?: boolean;
  includeVolume?: boolean;
  includeOpportunity?: boolean;
  includeCpc?: boolean;
}

export class DataForSEOKeywordClient {
  private readonly username: string;
  private readonly password: string;
  private readonly apiBaseUrl: string;
  private readonly apiVersion: string;
  private readonly timeout: number;

  constructor(auth: DataForSEOAuthConfig, options: DataForSEOOptions = {}) {
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
  private parseError(response: Response, data?: unknown): DataForSEOError {
    if (data && typeof data === 'object' && 'message' in data) {
      const errorData = data as {
        code?: number;
        message: string;
        errors?: unknown;
      };
      return {
        code: errorData.code ?? response.status,
        message: errorData.message,
        errors: errorData.errors as DataForSEOError['errors'],
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
          } as DataForSEOError;
        }
        // Re-throw if it's already a DataForSEO error
        if ('code' in error && 'message' in error) {
          throw error;
        }
        throw {
          code: 500,
          message: error.message,
        } as DataForSEOError;
      }

      throw error;
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Get keyword data for a single keyword
   *
   * @param keyword - The keyword to research
   * @param options - Research options
   * @returns Promise with keyword data result
   */
  async getKeywordData(
    keyword: string,
    options: KeywordDataOptions = {}
  ): Promise<KeywordDataTaskResult | null> {
    const request: KeywordDataTaskRequest = {
      keyword,
      location_code: options.locationCode ?? 2840, // Default to United States
      language_code: options.languageCode ?? 'en',
      include_kd: options.includeDifficulty ?? true,
      include_volume: options.includeVolume ?? true,
      include_opportunity: options.includeOpportunity ?? true,
      include_cpc: options.includeCpc ?? true,
    };

    try {
      const response = await this.post<
        DataForSEOResponse<KeywordDataTaskResult>
      >('/keyword_data/google_ads/search_volume/live', [request]);

      const task = response.tasks?.[0];
      const result = task?.result?.[0];

      if (!result) {
        return null;
      }

      return result;
    } catch (error) {
      console.error(`Error getting keyword data for "${keyword}":`, error);
      throw error;
    }
  }

  /**
   * Get keyword data for multiple keywords (batch)
   *
   * @param requests - Array of keyword data requests
   * @returns Promise with array of keyword data results
   */
  async getKeywordDataBatch(
    requests: KeywordDataTaskRequest[]
  ): Promise<KeywordDataTaskResult[]> {
    try {
      const response = await this.post<
        DataForSEOResponse<KeywordDataTaskResult>
      >('/keyword_data/google_ads/search_volume/live', requests);

      const results: KeywordDataTaskResult[] = [];

      for (const task of response.tasks || []) {
        if (task.status_code === 20000 && task.result) {
          results.push(...task.result);
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting batch keyword data:', error);
      throw error;
    }
  }

  /**
   * Get keyword suggestions for a seed keyword
   *
   * @param seedKeyword - The seed keyword to get suggestions for
   * @param locationCode - Location code
   * @param languageCode - Language code
   * @param options - Additional options
   * @returns Promise with keyword suggestions
   */
  async getKeywordSuggestions(
    seedKeyword: string,
    locationCode = 2840,
    languageCode = 'en',
    options: { limit?: number; offset?: number } = {}
  ): Promise<KeywordSuggestionsResponse | null> {
    try {
      const request = {
        keyword: seedKeyword,
        location_code: locationCode,
        language_code: languageCode,
        limit: options.limit ?? 50,
        offset: options.offset ?? 0,
        include_kd: true,
        include_volume: true,
        include_opportunity: true,
        include_cpc: true,
      };

      const response = await this.post<
        DataForSEOResponse<KeywordSuggestionsResponse>
      >('/keyword_data/google_ads/keyword_suggestions/live', [request]);

      const task = response.tasks?.[0];
      return task?.result?.[0] || null;
    } catch (error) {
      console.error(
        `Error getting keyword suggestions for "${seedKeyword}":`,
        error
      );
      throw error;
    }
  }

  /**
   * Get keyword difficulty score
   *
   * @param keyword - The keyword to check
   * @param locationCode - Location code
   * @param languageCode - Language code
   * @returns Difficulty score (0-100) or null if request fails
   */
  async getKeywordDifficulty(
    keyword: string,
    locationCode = 2840,
    languageCode = 'en'
  ): Promise<number | null> {
    const result = await this.getKeywordData(keyword, {
      locationCode,
      languageCode,
      includeDifficulty: true,
      includeVolume: false,
      includeCpc: false,
    });

    return result?.keyword_difficulty ?? null;
  }

  /**
   * Get search volume for a keyword
   *
   * @param keyword - The keyword to check
   * @param locationCode - Location code
   * @param languageCode - Language code
   * @returns Monthly search volume or null if request fails
   */
  async getSearchVolume(
    keyword: string,
    locationCode = 2840,
    languageCode = 'en'
  ): Promise<number | null> {
    const result = await this.getKeywordData(keyword, {
      locationCode,
      languageCode,
      includeDifficulty: false,
      includeVolume: true,
      includeCpc: false,
    });

    return result?.keyword_volume ?? null;
  }

  /**
   * Determine search intent for a keyword based on heuristics
   *
   * @param keyword - The keyword to analyze
   * @returns Search intent type
   */
  determineSearchIntent(keyword: string): SearchIntent {
    const lowerKeyword = keyword.toLowerCase();

    const transactionalWords = [
      'buy',
      'purchase',
      'order',
      'cheap',
      'discount',
      'sale',
      'price',
      'deal',
      'coupon',
    ];
    const commercialWords = [
      'best',
      'top',
      'review',
      'comparison',
      'compare',
      'vs',
      'rating',
      'recommended',
    ];
    const navigationalPatterns = [
      '.com',
      '.org',
      '.net',
      'www',
      'login',
      'signin',
      'facebook',
      'google',
      'amazon',
      'youtube',
      'twitter',
    ];

    if (transactionalWords.some((word) => lowerKeyword.includes(word))) {
      return 'transactional';
    }
    if (commercialWords.some((word) => lowerKeyword.includes(word))) {
      return 'commercial';
    }
    if (
      navigationalPatterns.some((pattern) => lowerKeyword.includes(pattern))
    ) {
      return 'navigational';
    }

    return 'informational';
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get estimated cost for a request
   * DataForSEO charges per keyword data request
   */
  estimateCost(requestCount: number): number {
    // DataForSEO Keyword Data API typically costs around $0.0005-0.002 per request
    // Using a conservative estimate
    return requestCount * 0.002;
  }

  /**
   * Create a keyword data request from options
   */
  createRequest(
    keyword: string,
    options: KeywordDataOptions = {}
  ): KeywordDataTaskRequest {
    return {
      keyword,
      location_code: options.locationCode ?? 2840,
      language_code: options.languageCode ?? 'en',
      include_kd: options.includeDifficulty ?? true,
      include_volume: options.includeVolume ?? true,
      include_opportunity: options.includeOpportunity ?? true,
      include_cpc: options.includeCpc ?? true,
    };
  }
}

/**
 * Create a DataForSEO keyword client from environment variables
 */
export function createDataForSEOKeywordClient(
  username?: string,
  password?: string,
  options?: DataForSEOOptions
): DataForSEOKeywordClient | null {
  if (!username || !password) {
    return null;
  }

  return new DataForSEOKeywordClient({ username, password }, options);
}

/**
 * Create a DataForSEO keyword client from process.env
 */
export function createKeywordClientFromEnv(): DataForSEOKeywordClient | null {
  const username = process.env.DATAFORSEO_USERNAME;
  const password = process.env.DATAFORSEO_PASSWORD;

  return createDataForSEOKeywordClient(username, password, {
    apiBaseUrl: process.env.DATAFORSEO_API_BASE_URL,
    apiVersion: process.env.DATAFORSEO_API_VERSION,
    timeout: parseInt(process.env.DATAFORSEO_TIMEOUT || '60000', 10),
  });
}
