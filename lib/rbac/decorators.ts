/**
 * RBAC Route Handler Helpers
 *
 * Decorators and helper functions for adding RBAC checks to Next.js API routes.
 * These provide a more declarative way to protect routes.
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { TeamMemberRole } from '@/lib/supabase/team-members';
import type { Permission } from '@/lib/rbac/types';
import { PermissionCategory, Resource } from '@/lib/rbac/types';
import {
  requireAuth,
  requirePermission,
  requireMinRole,
  requireOwner,
  requireAdminOrOwner,
} from '@/lib/rbac/middleware';
import { canModifyUserRole } from '@/lib/rbac/permissions';

/**
 * Extended context passed to protected route handlers
 */
export interface ProtectedRouteContext {
  userId: string;
  organizationId: string;
  client: SupabaseClient<Database>;
  role: TeamMemberRole;
}

/**
 * Route handler with authentication only
 */
export type AuthenticatedHandler = (
  request: Request,
  context: ProtectedRouteContext
) => Promise<NextResponse>;

/**
 * Options for protecting a route
 */
export interface ProtectRouteOptions {
  /** Minimum role required */
  minRole?: TeamMemberRole;
  /** Specific resource permission required */
  resource?: Resource;
  /** Specific permission category required */
  permission?: PermissionCategory;
  /** Require owner role */
  requireOwner?: boolean;
  /** Custom organization ID extractor */
  getOrganizationId?: (request: Request) => string | Promise<string>;
}

/**
 * Protect a route with authentication and authorization
 *
 * @example
 * ```ts
 * export const GET = protectRoute({
 *   minRole: 'admin'
 * })(async (request, { userId, organizationId, client, role }) => {
 *   // Handler logic here
 *   return NextResponse.json({ data: 'success' });
 * });
 * ```
 */
export function protectRoute(options: ProtectRouteOptions = {}) {
  return (
    handler: AuthenticatedHandler
  ): ((request: Request) => Promise<NextResponse>) => {
    return async (request: Request) => {
      try {
        // 1. Authenticate user
        const authContext = await requireAuth();
        const userId = authContext.userId;

        // 2. Extract organization ID
        let organizationId: string;

        if (options.getOrganizationId) {
          organizationId = await options.getOrganizationId(request);
        } else {
          const url = new URL(request.url);
          organizationId =
            url.searchParams.get('organization_id') ||
            authContext.organizationId ||
            '';

          // Try body for POST/PUT requests
          if (!organizationId) {
            try {
              const clonedRequest = request.clone();
              const body = await clonedRequest.json();
              organizationId = body.organization_id || '';
            } catch {
              // Body might not be JSON or already read
            }
          }
        }

        if (!organizationId) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Organization ID required' },
            { status: 400 }
          );
        }

        // 3. Get Supabase client
        const { getSupabaseServerClient } =
          await import('@/lib/supabase/client');
        const client = getSupabaseServerClient();

        // 4. Check role/permission requirements
        let role: TeamMemberRole;

        if (options.requireOwner) {
          await requireOwner(client, organizationId, userId);
          role = 'owner';
        } else if (options.minRole) {
          role = await requireMinRole(
            client,
            organizationId,
            userId,
            options.minRole
          );
        } else if (options.resource && options.permission) {
          role = await requirePermission(client, userId, organizationId, {
            resource: options.resource,
            category: options.permission,
          });
        } else {
          // Default to viewer role check
          role = await requireMinRole(client, organizationId, userId, 'viewer');
        }

        // 5. Call the handler with full context
        return await handler(request, {
          userId,
          organizationId,
          client,
          role,
        });
      } catch (error) {
        if (error instanceof NextResponse) {
          return error;
        }
        console.error('Error in protected route:', error);
        return NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Helper factories for common role requirements
 */

/**
 * Protect route - viewer access (read-only)
 */
export function withViewerAccess(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({ minRole: 'viewer' })(handler);
}

/**
 * Protect route - editor access (can create and edit)
 */
export function withEditorAccess(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({ minRole: 'editor' })(handler);
}

/**
 * Protect route - admin access (can manage team and settings)
 */
export function withAdminAccess(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({ minRole: 'admin' })(handler);
}

/**
 * Protect route - owner access (full control)
 */
export function withOwnerAccess(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({ requireOwner: true })(handler);
}

/**
 * Protect route with custom resource permission
 */
export function withPermission(
  resource: Resource,
  category: PermissionCategory
) {
  return (
    handler: AuthenticatedHandler
  ): ((request: Request) => Promise<NextResponse>) => {
    return protectRoute({ resource, permission: category })(handler);
  };
}

/**
 * Protect route for team member operations
 */
export function withTeamManagement(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({
    resource: Resource.TEAM,
    permission: PermissionCategory.MANAGE_TEAM,
  })(handler);
}

/**
 * Protect route for settings operations
 */
export function withSettingsAccess(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({
    resource: Resource.SETTINGS,
    permission: PermissionCategory.MANAGE_SETTINGS,
  })(handler);
}

/**
 * Protect route for billing operations
 */
export function withBillingAccess(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({
    resource: Resource.BILLING,
    permission: PermissionCategory.MANAGE_BILLING,
  })(handler);
}

/**
 * Protect route for publishing operations
 */
export function withPublishAccess(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return protectRoute({
    resource: Resource.PUBLISHING,
    permission: PermissionCategory.PUBLISH,
  })(handler);
}

/**
 * Wrapper for routes that handle role modifications
 * Adds additional validation for role change operations
 */
export function withRoleModification(
  handler: (
    request: Request,
    context: ProtectedRouteContext & {
      canModifyRole: (
        targetUserId: string,
        newRole: TeamMemberRole
      ) => Promise<boolean>;
    }
  ) => Promise<NextResponse>
): (request: Request) => Promise<NextResponse> {
  return protectRoute({ minRole: 'admin' })(async (request, context) => {
    const canModifyRole = async (
      targetUserId: string,
      newRole: TeamMemberRole
    ): Promise<boolean> => {
      return canModifyUserRole(
        context.client,
        context.userId,
        targetUserId,
        context.organizationId,
        newRole
      );
    };

    return await handler(request, { ...context, canModifyRole });
  });
}

/**
 * Extract organization ID from various request locations
 */
export function getOrgFromQuery(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('organization_id');
}

export async function getOrgFromBody(request: Request): Promise<string | null> {
  try {
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    return body.organization_id || null;
  } catch {
    return null;
  }
}

/**
 * Combine multiple organization ID sources
 */
export async function extractOrganizationId(
  request: Request,
  fallbackOrgId: string | null = null
): Promise<string | null> {
  // Try query params first
  const fromQuery = getOrgFromQuery(request);
  if (fromQuery) return fromQuery;

  // Try body
  const fromBody = await getOrgFromBody(request);
  if (fromBody) return fromBody;

  // Use fallback (from auth session)
  return fallbackOrgId;
}

/**
 * Validate request body against RBAC rules
 * Checks if user has permission to perform the requested action
 */
export async function validateRequestBody<T extends Record<string, any>>(
  request: Request,
  context: ProtectedRouteContext,
  options: {
    validateOrganization?: boolean;
    validateUserInOrganization?: boolean;
  } = {}
): Promise<{ valid: boolean; error?: string; data?: T }> {
  try {
    const body = (await request.json()) as T;

    // Validate organization ID matches if required
    if (options.validateOrganization && body.organization_id) {
      if (body.organization_id !== context.organizationId) {
        return {
          valid: false,
          error: 'Organization ID mismatch',
        };
      }
    }

    // Additional validations can be added here

    return {
      valid: true,
      data: body,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid request body',
    };
  }
}

/**
 * Check if user can access a specific resource (by ID)
 * Useful for routes like /api/articles/[id]
 */
export async function canAccessResource(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  resourceId: string,
  resourceType: Resource,
  requiredPermission: PermissionCategory = PermissionCategory.READ
): Promise<boolean> {
  const { validateOperation } = await import('@/lib/rbac/permissions');
  const result = await validateOperation(
    client,
    userId,
    organizationId,
    resourceType,
    requiredPermission
  );
  return result.allowed;
}
