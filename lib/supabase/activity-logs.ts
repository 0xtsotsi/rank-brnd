// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Activity Logs Utilities
 *
 * Helper functions for working with activity logs that track user actions
 * across resources within organizations. These functions wrap Supabase queries
 * with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type ActivityLogInsert =
  Database['public']['Tables']['activity_logs']['Insert'];
type ActivityLogUpdate =
  Database['public']['Tables']['activity_logs']['Update'];

type ActivityAction = 'create' | 'update' | 'delete' | 'publish';

/**
 * Activity log with user information
 */
export interface ActivityLogWithUser extends ActivityLog {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Result type for activity log operations
 */
export type ActivityLogResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default values for optional fields
 */
export const DEFAULT_ACTIVITY_LOG_VALUES = {
  metadata: {},
};

/**
 * Get activity logs for an organization
 */
export async function getOrganizationActivityLogs(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: ActivityAction;
    resourceType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: 'timestamp' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ActivityLogResult<ActivityLogWithUser[]>> {
  try {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let query = client
      .from('activity_logs')
      .select(
        `
        *,
        user:user_id (
          id,
          name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', organizationId);

    // Apply filters
    if (options.action) {
      query = query.eq('action', options.action);
    }

    if (options.resourceType) {
      query = query.eq('resource_type', options.resourceType);
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    // Apply sorting
    const sortColumn = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = offset;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No activity logs found');

    return { success: true, data: data as ActivityLogWithUser[] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch activity logs',
    };
  }
}

/**
 * Get activity logs for a specific resource
 */
export async function getResourceActivityLogs(
  client: SupabaseClient<Database>,
  resourceType: string,
  resourceId: string,
  options: {
    organizationId?: string;
    limit?: number;
  } = {}
): Promise<ActivityLogResult<ActivityLogWithUser[]>> {
  try {
    const limit = options.limit || 50;

    let query = client
      .from('activity_logs')
      .select(
        `
        *,
        user:user_id (
          id,
          name,
          email
        )
      `
      )
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    query = query.order('timestamp', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No activity logs found');

    return { success: true, data: data as ActivityLogWithUser[] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch activity logs',
    };
  }
}

/**
 * Create a new activity log
 */
export async function createActivityLog(
  client: SupabaseClient<Database>,
  log: ActivityLogInsert
): Promise<ActivityLogResult<ActivityLog>> {
  try {
    const { data, error } = await client
      .from('activity_logs')
      .insert({
        organization_id: log.organization_id,
        user_id: log.user_id,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        metadata: (log.metadata ||
          DEFAULT_ACTIVITY_LOG_VALUES.metadata) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create activity log');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create activity log',
    };
  }
}

/**
 * Create an activity log using the database function
 * This is the preferred method for creating activity logs
 */
export async function logActivity(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  action: ActivityAction,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, unknown> = {}
): Promise<ActivityLogResult<string>> {
  try {
    const { data, error } = await client.rpc('create_activity_log', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_metadata: metadata as unknown as Json,
    });

    if (error) throw error;
    if (!data) throw new Error('Failed to create activity log');

    return { success: true, data: data as string };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create activity log',
    };
  }
}

/**
 * Get activity statistics for an organization
 */
export async function getActivityStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
  }
): Promise<
  ActivityLogResult<
    Array<{ action: ActivityAction; count: number; resource_type: string }>
  >
> {
  try {
    const { data, error } = await client.rpc('get_activity_stats', {
      p_org_id: organizationId,
      p_start_date: options?.startDate?.toISOString() || null,
      p_end_date: options?.endDate?.toISOString() || null,
    });

    if (error) throw error;
    if (!data) throw new Error('Failed to get activity stats');

    return {
      success: true,
      data: data as Array<{
        action: ActivityAction;
        count: number;
        resource_type: string;
      }>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get activity stats',
    };
  }
}

/**
 * Get recent activity logs for an organization (convenience function)
 */
export async function getRecentActivity(
  client: SupabaseClient<Database>,
  organizationId: string,
  limit: number = 10
): Promise<ActivityLogResult<ActivityLogWithUser[]>> {
  return getOrganizationActivityLogs(client, organizationId, {
    limit,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
}

/**
 * Delete old activity logs (cleanup function)
 * Use with caution - this permanently deletes logs
 */
export async function deleteOldActivityLogs(
  client: SupabaseClient<Database>,
  organizationId: string,
  olderThan: Date
): Promise<ActivityLogResult<number>> {
  try {
    const { data, error } = await client
      .from('activity_logs')
      .delete()
      .eq('organization_id', organizationId)
      .lt('timestamp', olderThan.toISOString())
      .select('id', { count: 'exact', head: false });

    if (error) throw error;

    return { success: true, data: data?.length || 0 };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete activity logs',
    };
  }
}

/**
 * Helper function to get a display label for an action
 */
export function getActionLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    publish: 'Published',
  };
  return labels[action] || action;
}

/**
 * Helper function to get a display label for a resource type
 */
export function getResourceTypeLabel(resourceType: string): string {
  // Convert snake_case or kebab-case to Title Case
  return resourceType
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate activity log data
 */
export function validateActivityLog(log: {
  organization_id?: string;
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: unknown;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (log.organization_id !== undefined) {
    if (typeof log.organization_id !== 'string') {
      errors.push('Organization ID must be a string');
    }
  }

  if (log.user_id !== undefined) {
    if (typeof log.user_id !== 'string') {
      errors.push('User ID must be a string');
    }
  }

  if (log.action !== undefined) {
    const validActions = ['create', 'update', 'delete', 'publish'];
    if (!validActions.includes(log.action)) {
      errors.push(`Action must be one of: ${validActions.join(', ')}`);
    }
  }

  if (log.resource_type !== undefined) {
    if (typeof log.resource_type !== 'string') {
      errors.push('Resource type must be a string');
    } else if (log.resource_type.length === 0) {
      errors.push('Resource type cannot be empty');
    }
  }

  if (log.resource_id !== undefined) {
    if (typeof log.resource_id !== 'string') {
      errors.push('Resource ID must be a string');
    } else if (log.resource_id.length === 0) {
      errors.push('Resource ID cannot be empty');
    }
  }

  if (log.metadata !== undefined && typeof log.metadata !== 'object') {
    errors.push('Metadata must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
