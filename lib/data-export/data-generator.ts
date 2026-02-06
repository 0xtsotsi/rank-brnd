/**
 * Data Export Generator
 *
 * Functions for generating export data from various tables.
 * Supports both JSON and CSV formats.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  DataExportFormat,
  ExportableTable,
  ExportedData,
} from '@/types/data-export';

/**
 * Convert object to CSV row
 */
function objectToCsvRow(
  obj: Record<string, unknown>,
  headers: string[]
): string {
  return headers
    .map((header) => {
      const value = obj[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const strValue = String(value);
      if (
        strValue.includes(',') ||
        strValue.includes('"') ||
        strValue.includes('\n')
      ) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    })
    .join(',');
}

/**
 * Convert array of objects to CSV
 */
function arrayToCsv(
  data: Record<string, unknown>[],
  tableName: string
): string {
  if (data.length === 0) return `# ${tableName}\n\n`;

  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  const dataRows = data.map((obj) => objectToCsvRow(obj, headers));

  return `# ${tableName}\n${headerRow}\n${dataRows.join('\n')}\n\n`;
}

/**
 * Flatten nested objects for CSV export
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, newKey)
      );
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Fetch organization data
 */
async function fetchOrganizationData(
  client: SupabaseClient<Database>,
  organizationId: string,
  includeDeleted: boolean
): Promise<ExportedData> {
  const data: ExportedData = {
    organization: {
      id: '',
      name: '',
      slug: '',
      tier: '',
      settings: {},
      created_at: '',
    },
    members: [],
    products: [],
    articles: [],
    keywords: [],
    backlinks: [],
    activity_logs: [],
  };

  // Fetch organization
  const { data: org } = await (client as any)
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  if (org) {
    data.organization = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      tier: org.tier,
      settings: org.settings,
      created_at: org.created_at,
    };
  }

  // Fetch organization members
  const { data: members } = await (client as any)
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId);
  if (members) {
    data.members = members.map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
    }));
  }

  // Fetch products
  let productsQuery = (client as any)
    .from('products')
    .select('*')
    .eq('organization_id', organizationId);
  if (!includeDeleted) {
    productsQuery = productsQuery.is('deleted_at', null);
  }
  const { data: products } = await productsQuery;
  if (products) {
    data.products = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      url: p.url,
      status: p.status,
      created_at: p.created_at,
    }));
  }

  // Fetch articles
  let articlesQuery = (client as any)
    .from('articles')
    .select('*')
    .eq('organization_id', organizationId);
  if (!includeDeleted) {
    articlesQuery = articlesQuery.is('deleted_at', null);
  }
  const { data: articles } = await articlesQuery;
  if (articles) {
    data.articles = articles.map((a: any) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      status: a.status,
      word_count: a.word_count,
      published_at: a.published_at,
      created_at: a.created_at,
    }));
  }

  // Fetch keywords
  let keywordsQuery = (client as any)
    .from('keywords')
    .select('*')
    .eq('organization_id', organizationId);
  if (!includeDeleted) {
    keywordsQuery = keywordsQuery.is('deleted_at', null);
  }
  const { data: keywords } = await keywordsQuery;
  if (keywords) {
    data.keywords = keywords.map((k: any) => ({
      id: k.id,
      keyword: k.keyword,
      search_volume: k.search_volume,
      difficulty: k.difficulty,
      status: k.status,
      created_at: k.created_at,
    }));
  }

  // Fetch backlinks
  let backlinksQuery = (client as any)
    .from('backlinks')
    .select('*')
    .eq('organization_id', organizationId);
  if (!includeDeleted) {
    backlinksQuery = backlinksQuery.is('deleted_at', null);
  }
  const { data: backlinks } = await backlinksQuery;
  if (backlinks) {
    data.backlinks = backlinks.map((b: any) => ({
      id: b.id,
      source_url: b.source_url,
      target_url: b.target_url,
      status: b.status,
      created_at: b.created_at,
    }));
  }

  // Fetch activity logs
  const { data: activityLogs } = await (client as any)
    .from('activity_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('timestamp', { ascending: false })
    .limit(1000);
  if (activityLogs) {
    data.activity_logs = activityLogs.map((l: any) => ({
      id: l.id,
      user_id: l.user_id,
      action: l.action,
      resource_type: l.resource_type,
      resource_id: l.resource_id,
      timestamp: l.timestamp,
    }));
  }

  return data;
}

/**
 * Fetch specific table data
 */
async function fetchTableData(
  client: SupabaseClient<Database>,
  organizationId: string,
  tableName: ExportableTable,
  includeDeleted: boolean
): Promise<Record<string, unknown>[]> {
  let query = (client as any)
    .from(tableName)
    .select('*')
    .eq('organization_id', organizationId)
    .limit(10000);

  // Handle soft deletes for tables that support it
  if (
    !includeDeleted &&
    [
      'products',
      'articles',
      'keywords',
      'backlinks',
      'exchange_network',
      'exchange_matches',
    ].includes(tableName)
  ) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return [];
  }

  return (data as Record<string, unknown>[]) || [];
}

/**
 * Generate export data based on requested tables
 */
export async function generateExportData(
  client: SupabaseClient<Database>,
  organizationId: string,
  requestedTables: ExportableTable[] | null,
  includeDeleted: boolean
): Promise<ExportedData> {
  // If no specific tables requested, return all core data
  if (!requestedTables || requestedTables.length === 0) {
    return fetchOrganizationData(client, organizationId, includeDeleted);
  }

  const data: ExportedData = {
    organization: {
      id: '',
      name: '',
      slug: '',
      tier: '',
      settings: {},
      created_at: '',
    },
    members: [],
    products: [],
    articles: [],
    keywords: [],
    backlinks: [],
    activity_logs: [],
  };

  // Always include organization info
  const { data: org } = await (client as any)
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  if (org) {
    data.organization = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      tier: org.tier,
      settings: org.settings,
      created_at: org.created_at,
    };
  }

  // Fetch each requested table
  for (const table of requestedTables) {
    const tableData = await fetchTableData(
      client,
      organizationId,
      table,
      includeDeleted
    );

    // Map table names to data keys
    const keyMap: Record<ExportableTable, string> = {
      organizations: 'organizations',
      organization_members: 'members',
      team_members: 'team_members',
      team_invitations: 'team_invitations',
      products: 'products',
      articles: 'articles',
      keywords: 'keywords',
      backlinks: 'backlinks',
      exchange_network: 'exchange_network',
      exchange_matches: 'exchange_matches',
      external_link_sources: 'external_link_sources',
      external_link_opportunities: 'external_link_opportunities',
      serp_analyses: 'serp_analyses',
      activity_logs: 'activity_logs',
      integrations: 'integrations',
      rank_tracking: 'rank_tracking',
      competitor_comparisons: 'competitor_comparisons',
    };

    (data as Record<string, unknown>)[keyMap[table]] = tableData;
  }

  return data;
}

/**
 * Generate JSON export
 */
export function generateJsonExport(data: ExportedData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Generate CSV export
 */
export function generateCsvExport(data: ExportedData): string {
  const lines: string[] = [];
  lines.push('# GDPR Data Export');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Export organization info
  lines.push('# Organization');
  lines.push('id,name,slug,tier,created_at');
  lines.push(
    [
      data.organization.id,
      data.organization.name,
      data.organization.slug,
      data.organization.tier,
      data.organization.created_at,
    ].join(',')
  );
  lines.push('');

  // Export each table
  const tableOrder: Array<keyof ExportedData> = [
    'members',
    'products',
    'articles',
    'keywords',
    'backlinks',
    'activity_logs',
    'team_members',
    'team_invitations',
    'exchange_network',
    'exchange_matches',
    'external_link_sources',
    'external_link_opportunities',
    'serp_analyses',
    'integrations',
    'rank_tracking',
    'competitor_comparisons',
  ];

  for (const table of tableOrder) {
    const tableData = data[table];
    if (Array.isArray(tableData) && tableData.length > 0) {
      const flattened = tableData.map((item) =>
        flattenObject(item as Record<string, unknown>)
      );
      lines.push(arrayToCsv(flattened, String(table)));
    }
  }

  return lines.join('\n');
}

/**
 * Generate export based on format
 */
export async function generateExport(
  client: SupabaseClient<Database>,
  organizationId: string,
  format: DataExportFormat,
  requestedTables: ExportableTable[] | null,
  includeDeleted: boolean
): Promise<{ data: string; recordCount: number }> {
  const exportData = await generateExportData(
    client,
    organizationId,
    requestedTables,
    includeDeleted
  );

  let exportContent: string;

  if (format === 'csv') {
    exportContent = generateCsvExport(exportData);
  } else {
    exportContent = generateJsonExport(exportData);
  }

  // Count total records
  const recordCount = Object.values(exportData).reduce(
    (count: number, value) => {
      if (Array.isArray(value)) {
        return count + value.length;
      }
      if (typeof value === 'object' && value !== null) {
        return count + 1;
      }
      return count;
    },
    0
  );

  return {
    data: exportContent,
    recordCount,
  };
}

/**
 * Calculate export file size
 */
export function calculateExportSize(data: string): number {
  return new Blob([data]).size;
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  organizationSlug: string,
  format: DataExportFormat,
  timestamp?: Date
): string {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split('T')[0];
  return `gdpr-export-${organizationSlug}-${dateStr}.${format}`;
}
