/**
 * Google Search Console Types
 *
 * Type definitions for Google Search Console data and analytics
 */

/**
 * Individual search console data record
 */
export interface SearchConsoleData {
  id: string;
  organization_id: string;
  product_id: string;
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
  date: string; // YYYY-MM-DD format
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Aggregated search console metrics
 */
export interface SearchConsoleMetrics {
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  avg_position: number;
  unique_keywords: number;
}

/**
 * Trend data point for charts
 */
export interface TrendDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

/**
 * Keyword performance for analytics display
 */
export interface KeywordPerformance {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Opportunity gap - keywords with high impressions but low CTR
 */
export interface OpportunityGap {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
  potential_clicks: number; // Estimated potential if CTR improved
}

/**
 * Ranking position distribution
 */
export interface RankingDistribution {
  position_1_3: number; // Top 3
  position_4_10: number; // 4-10
  position_11_20: number; // 11-20
  position_21_plus: number; // 21+
}

/**
 * Analytics filter options
 */
export interface AnalyticsFilters {
  productId: string;
  dateRange: '7d' | '30d' | '90d' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

/**
 * Sort options for GSC data table
 */
export type GscSortField =
  | 'keyword'
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'avg_position'
  | 'date';
export type GscSortOrder = 'asc' | 'desc';

/**
 * GSC data table state
 */
export interface GscTableState {
  sortField: GscSortField;
  sortOrder: GscSortOrder;
  page: number;
  perPage: number;
}

/**
 * API response types
 */
export interface SearchConsoleDataResponse {
  data: SearchConsoleData[];
  total: number;
}

export interface SearchConsoleMetricsResponse {
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  avg_position: number;
  unique_keywords: number;
}

export interface TrendResponse {
  data: TrendDataPoint[];
}

/**
 * Date range preset
 */
export interface DateRangePreset {
  value: '7d' | '30d' | '90d' | 'all';
  label: string;
  days?: number;
}
