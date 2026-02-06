/**
 * Google Search Console Client
 *
 * Handles OAuth 2.0 authenticated requests to Google Search Console API.
 * Provides methods to fetch search analytics data for connected properties.
 *
 * @see https://developers.google.com/webmaster-tools/search-console-api-original
 */

import type { OAuthTokens } from '@/lib/oauth';

/**
 * Google Search Console API base URL
 */
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

/**
 * Dimensions available for Search Analytics queries
 */
export type SearchAnalyticsDimension =
  | 'date'
  | 'query'
  | 'page'
  | 'device'
  | 'country'
  | 'searchAppearance'
  | 'country';

/**
 * Device type filter
 */
export type DeviceType = 'mobile' | 'desktop' | 'tablet';

/**
 * Search analytics query request
 */
export interface SearchAnalyticsQueryRequest {
  /** The site's URL (property) */
  siteUrl: string;
  /** Start date (inclusive) in YYYY-MM-DD format */
  startDate: string;
  /** End date (inclusive) in YYYY-MM-DD format */
  endDate: string;
  /** Dimensions to group by */
  dimensions?: SearchAnalyticsDimension[];
  /** Filter by specific dimension values */
  dimensionFilterGroups?: DimensionFilterGroup[];
  /** Search type: web, image, video, discover, googleNews */
  searchType?: 'web' | 'image' | 'video' | 'discover' | 'googleNews';
  /** Filter by data state */
  dataState?: 'all' | 'final';
  /** Aggregation type */
  aggregationType?: 'auto' | 'property' | 'page';
  /** Number of rows to return */
  rowLimit?: number;
  /** Starting row index */
  startRow?: number;
}

/**
 * Dimension filter group
 */
export interface DimensionFilterGroup {
  filters: DimensionFilter[];
  groupType: 'and' | 'or';
}

/**
 * Dimension filter
 */
export interface DimensionFilter {
  dimension: SearchAnalyticsDimension;
  expression: string;
  operator?:
    | 'contains'
    | 'equals'
    | 'notContains'
    | 'notEquals'
    | 'includingRegex'
    | 'excludingRegex';
}

/**
 * Search analytics response row
 */
export interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

/**
 * Complete search analytics response
 */
export interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  responseAggregationType?: string;
}

/**
 * Site property information
 */
export interface SiteProperty {
  siteUrl: string;
  permissionLevel?: 'siteFullUser' | 'siteOwner' | 'siteRestrictedUser';
}

/**
 * Error response from Google API
 */
interface GoogleErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Google Search Console Client
 */
export class GoogleSearchConsoleClient {
  private accessToken: string;

  constructor(tokens: OAuthTokens) {
    this.accessToken = tokens.accessToken;
  }

  /**
   * Get all sites the user has access to
   */
  async listSites(): Promise<SiteProperty[]> {
    const response = await this.request<{ siteEntry?: SiteProperty[] }>(
      `${GSC_API_BASE}/sites`
    );

    return response.siteEntry || [];
  }

  /**
   * Get search analytics data for a property
   */
  async getSearchAnalytics(
    query: SearchAnalyticsQueryRequest
  ): Promise<SearchAnalyticsRow[]> {
    const response = await this.request<SearchAnalyticsResponse>(
      `${GSC_API_BASE}/sites/${encodeURIComponent(query.siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        body: JSON.stringify(this.buildQueryRequest(query)),
      }
    );

    return response.rows || [];
  }

  /**
   * Get search analytics aggregated by date
   */
  async getAnalyticsByDate(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<
    Array<{
      date: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['date'],
      rowLimit: 1000,
    });

    return rows.map((row) => ({
      date: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  /**
   * Get search analytics by query (keywords)
   */
  async getAnalyticsByQuery(
    siteUrl: string,
    startDate: string,
    endDate: string,
    options: {
      rowLimit?: number;
      minClicks?: number;
      minImpressions?: number;
    } = {}
  ): Promise<
    Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const dimensionFilters: DimensionFilterGroup[] = [];

    if (options.minClicks !== undefined) {
      dimensionFilters.push({
        groupType: 'and',
        filters: [
          {
            dimension: 'query',
            expression: `>${options.minClicks}`,
            operator: 'equals',
          },
        ],
      });
    }

    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['query'],
      dimensionFilterGroups:
        dimensionFilters.length > 0 ? dimensionFilters : undefined,
      rowLimit: options.rowLimit || 100,
    });

    // Filter by minimum impressions if specified (API doesn't support this filter)
    let filteredRows = rows;
    if (options.minImpressions !== undefined) {
      filteredRows = rows.filter(
        (row) => (row.impressions || 0) >= options.minImpressions!
      );
    }

    return filteredRows.map((row) => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  /**
   * Get search analytics by page (URL)
   */
  async getAnalyticsByPage(
    siteUrl: string,
    startDate: string,
    endDate: string,
    rowLimit = 100
  ): Promise<
    Array<{
      page: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit,
    });

    return rows.map((row) => ({
      page: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  /**
   * Get search analytics by country
   */
  async getAnalyticsByCountry(
    siteUrl: string,
    startDate: string,
    endDate: string,
    rowLimit = 100
  ): Promise<
    Array<{
      country: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['country'],
      rowLimit,
    });

    return rows.map((row) => ({
      country: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  /**
   * Get search analytics by device
   */
  async getAnalyticsByDevice(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<
    Array<{
      device: DeviceType;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['device'],
    });

    return rows.map((row) => ({
      device: (row.keys?.[0] || 'desktop') as DeviceType,
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  /**
   * Get aggregated metrics for a date range
   */
  async getAggregatedMetrics(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<{
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }> {
    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
    });

    const totalClicks = rows.reduce((sum, row) => sum + (row.clicks || 0), 0);
    const totalImpressions = rows.reduce(
      (sum, row) => sum + (row.impressions || 0),
      0
    );
    const totalCtr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgPosition =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + (row.position || 0), 0) / rows.length
        : 0;

    return {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalCtr,
      position: avgPosition,
    };
  }

  /**
   * Build the query request object for the API
   */
  private buildQueryRequest(
    query: SearchAnalyticsQueryRequest
  ): Record<string, unknown> {
    const request: Record<string, unknown> = {
      startDate: query.startDate,
      endDate: query.endDate,
    };

    if (query.dimensions && query.dimensions.length > 0) {
      request.dimensions = query.dimensions;
    }

    if (query.dimensionFilterGroups && query.dimensionFilterGroups.length > 0) {
      request.dimensionFilterGroups = query.dimensionFilterGroups;
    }

    if (query.searchType) {
      request.searchType = query.searchType;
    }

    if (query.dataState) {
      request.dataState = query.dataState;
    }

    if (query.aggregationType) {
      request.aggregationType = query.aggregationType;
    }

    if (query.rowLimit) {
      request.rowLimit = query.rowLimit;
    }

    if (query.startRow) {
      request.startRow = query.startRow;
    }

    return request;
  }

  /**
   * Make an authenticated request to the Google API
   */
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData: GoogleErrorResponse = await response
        .json()
        .catch(() => ({}));
      const message = errorData.error?.message || response.statusText;
      throw new Error(`Google API error: ${response.status} - ${message}`);
    }

    return response.json();
  }

  /**
   * Create a client from OAuth tokens
   */
  static async fromTokens(
    tokens: OAuthTokens
  ): Promise<GoogleSearchConsoleClient> {
    return new GoogleSearchConsoleClient(tokens);
  }
}

/**
 * Helper function to get date range for last N days
 */
export function getLastNDays(n: number): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n + 1);

  return {
    startDate: formatDateForGSC(start),
    endDate: formatDateForGSC(end),
  };
}

/**
 * Format date for Google Search Console API (YYYY-MM-DD)
 */
export function formatDateForGSC(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateForGSC(yesterday);
}

/**
 * Validate site URL format for Google Search Console
 * SC-prefix property vs Domain property
 */
export function normalizeSiteUrl(siteUrl: string): string {
  let normalized = siteUrl.trim();

  // Add sc-prefix if missing for URL-property
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    if (!normalized.startsWith('sc-')) {
      normalized = `sc-${normalized}`;
    }
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}
