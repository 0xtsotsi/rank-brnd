/**
 * RBAC Middleware for API Routes
 *
 * Provides middleware functions for checking permissions in Next.js API routes.
 * These functions can be used directly in route handlers or composed together.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { TeamMemberRole } from '@/lib/supabase/team-members';
import type {
  Permission,
  PermissionCategory,
  Resource,
} from '@/lib/rbac/types';
import { ROLE_HIERARCHY, OPERATION_MIN_ROLE } from '@/lib/rbac/types';
import { getTeamRole, hasMinTeamRole } from '@/lib/supabase/team-members';

/**
 * Authentication result containing user ID and optionally organization ID
 */
export interface AuthContext {
  userId: string;
  organizationId: string | null;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  role?: TeamMemberRole;
}

/**
 * Required permission for an operation
 */
export interface PermissionRequirement {
  resource: Resource;
  category: PermissionCategory;
  organizationId?: string;
}

/**
 * Extract organization ID from request
 */
export async function getOrganizationIdFromRequest(
  request: Request
): Promise<string | null> {
  try {
    const { orgId } = await auth();
    return orgId || null;
  } catch {
    return null;
  }
}

/**
 * Get organization ID from request body or query params
 */
export function extractOrganizationId(request: Request): string | null {
  try {
    const url = new URL(request.url);
    return url.searchParams.get('organization_id');
  } catch {
    return null;
  }
}

/**
 * Authenticate the current user
 * @returns {AuthContext} User authentication context
 * @throws {NextResponse} 401 response if not authenticated
 */
export async function requireAuth(): Promise<AuthContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  return {
    userId,
    organizationId: orgId || null,
  };
}

/**
 * Require organization membership
 * @throws {NextResponse} 403 response if not a member
 */
export async function requireOrganizationMember(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<void> {
  const isMember = await (client as any).rpc('is_organization_member', {
    p_org_id: organizationId,
    p_user_id: userId,
  });

  if (!isMember.data) {
    throw NextResponse.json(
      { error: 'Forbidden', message: 'Not a member of this organization' },
      { status: 403 }
    );
  }
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  requirement: PermissionRequirement
): Promise<PermissionCheckResult> {
  // Get user's role in the organization
  const role = await getTeamRole(client, organizationId, userId);

  if (!role) {
    return {
      allowed: false,
      reason: 'User is not a member of this organization',
    };
  }

  // Check if role meets the minimum required level for the operation
  const minRole = OPERATION_MIN_ROLE[requirement.category];

  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    return {
      allowed: false,
      reason: `Insufficient permissions: ${minRole} role required`,
      role,
    };
  }

  return {
    allowed: true,
    role,
  };
}

/**
 * Require a specific permission
 * @throws {NextResponse} 403 response if permission denied
 */
export async function requirePermission(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  requirement: PermissionRequirement
): Promise<TeamMemberRole> {
  const result = await checkPermission(
    client,
    userId,
    organizationId,
    requirement
  );

  if (!result.allowed) {
    throw NextResponse.json(
      {
        error: 'Forbidden',
        message: result.reason || 'Insufficient permissions',
      },
      { status: 403 }
    );
  }

  return result.role!;
}

/**
 * Require minimum role level
 * @throws {NextResponse} 403 response if role is insufficient
 */
export async function requireMinRole(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  minRole: TeamMemberRole
): Promise<TeamMemberRole> {
  const hasAccess = await hasMinTeamRole(
    client,
    organizationId,
    userId,
    minRole
  );

  if (!hasAccess) {
    throw NextResponse.json(
      {
        error: 'Forbidden',
        message: `${minRole} role or higher required`,
      },
      { status: 403 }
    );
  }

  // Return the actual role for use in the handler
  const role = await getTeamRole(client, organizationId, userId);
  return role!;
}

/**
 * Require owner or admin role
 * @throws {NextResponse} 403 response if not owner or admin
 */
export async function requireAdminOrOwner(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<TeamMemberRole> {
  return requireMinRole(client, organizationId, userId, 'admin');
}

/**
 * Require owner role (highest permission)
 * @throws {NextResponse} 403 response if not owner
 */
export async function requireOwner(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<void> {
  const role = await getTeamRole(client, organizationId, userId);

  if (role !== 'owner') {
    throw NextResponse.json(
      {
        error: 'Forbidden',
        message: 'Owner role required',
      },
      { status: 403 }
    );
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      await requireAuth();
      return await handler(...args);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }
  }) as T;
}

/**
 * Middleware wrapper for API routes that require organization access
 */
export function withOrganizationAccess<
  T extends (...args: any[]) => Promise<NextResponse>,
>(
  handler: T,
  options: {
    minRole?: TeamMemberRole;
    requireMembership?: boolean;
  } = {}
): T {
  return (async (...args: any[]) => {
    try {
      const request = args[0] as Request;
      const authContext = await requireAuth();

      // Get organization ID from request
      const url = new URL(request.url);
      let organizationId = url.searchParams.get('organization_id');

      // If not in query params, try request body (for POST/PUT)
      if (!organizationId && request.body) {
        try {
          const clonedRequest = request.clone();
          const body = await clonedRequest.json();
          organizationId = body.organization_id;
        } catch {
          // Body might not be JSON or already read
        }
      }

      // If still no organization ID, use user's current org
      if (!organizationId) {
        organizationId = authContext.organizationId;
      }

      if (!organizationId) {
        throw NextResponse.json(
          { error: 'Bad Request', message: 'Organization ID required' },
          { status: 400 }
        );
      }

      // Get Supabase client
      const { getSupabaseServerClient } = await import('@/lib/supabase/client');
      const client = getSupabaseServerClient();

      // Check membership if required
      if (options.requireMembership || options.minRole) {
        const minRoleToCheck = options.minRole || 'viewer';
        await requireMinRole(
          client,
          organizationId,
          authContext.userId,
          minRoleToCheck
        );
      }

      // Call the original handler with additional context
      return await handler(...args, authContext, organizationId, client);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }
  }) as T;
}

/**
 * Create a permission check middleware for a specific resource and category
 */
export function createPermissionMiddleware(
  resource: Resource,
  category: PermissionCategory
) {
  return <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T => {
    return (async (...args: any[]) => {
      try {
        const request = args[0] as Request;
        const authContext = await requireAuth();

        // Get organization ID
        const url = new URL(request.url);
        let organizationId = url.searchParams.get('organization_id');

        if (!organizationId) {
          try {
            const clonedRequest = request.clone();
            const body = await clonedRequest.json();
            organizationId = body.organization_id;
          } catch {
            // Body might not be JSON
          }
        }

        if (!organizationId) {
          organizationId = authContext.organizationId;
        }

        if (!organizationId) {
          throw NextResponse.json(
            { error: 'Bad Request', message: 'Organization ID required' },
            { status: 400 }
          );
        }

        // Get Supabase client and check permission
        const { getSupabaseServerClient } =
          await import('@/lib/supabase/client');
        const client = getSupabaseServerClient();

        await requirePermission(client, authContext.userId, organizationId, {
          resource,
          category,
        });

        // Call the original handler with additional context
        return await handler(...args, authContext, organizationId, client);
      } catch (error) {
        if (error instanceof NextResponse) {
          return error;
        }
        throw error;
      }
    }) as T;
  };
}

/**
 * Pre-built middleware for common operations
 */
export const rbac = {
  /** Require viewer role (read access) */
  viewer: (handler: (...args: any[]) => Promise<NextResponse>) =>
    createPermissionMiddleware(
      'articles' as Resource,
      'read' as PermissionCategory
    )(handler),

  /** Require editor role (create/edit) */
  editor: (handler: (...args: any[]) => Promise<NextResponse>) =>
    createPermissionMiddleware(
      'articles' as Resource,
      'create' as PermissionCategory
    )(handler),

  /** Require admin role */
  admin: (handler: (...args: any[]) => Promise<NextResponse>) =>
    createPermissionMiddleware(
      'team' as Resource,
      'manage_team' as PermissionCategory
    )(handler),

  /** Require owner role */
  owner: (handler: (...args: any[]) => Promise<NextResponse>) =>
    createPermissionMiddleware(
      'settings' as Resource,
      'admin' as PermissionCategory
    )(handler),
};
