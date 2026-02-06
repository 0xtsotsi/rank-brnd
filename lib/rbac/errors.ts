/**
 * RBAC Error Helpers
 *
 * Standardized error responses and error handling utilities for RBAC.
 */

import { NextResponse } from 'next/server';
import type { TeamMemberRole } from '@/lib/supabase/team-members';
import type { Resource, PermissionCategory } from '@/lib/rbac/types';
import { ROLE_DISPLAY_NAMES, OPERATION_MIN_ROLE } from '@/lib/rbac/types';

/**
 * RBAC error types
 */
export enum RBACErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_MEMBER = 'NOT_MEMBER',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ORGANIZATION_REQUIRED = 'ORGANIZATION_REQUIRED',
  INVALID_ROLE = 'INVALID_ROLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Detailed RBAC error response
 */
export interface RBACErrorResponse {
  error: string;
  error_type: RBACErrorType;
  message: string;
  required_role?: TeamMemberRole;
  current_role?: TeamMemberRole;
  resource?: Resource;
  permission?: PermissionCategory;
}

/**
 * Create an unauthorized (401) error response
 */
export function unauthorizedResponse(
  message: string = 'Authentication required'
): NextResponse<RBACErrorResponse> {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      error_type: RBACErrorType.UNAUTHORIZED,
      message,
    } as RBACErrorResponse,
    { status: 401 }
  );
}

/**
 * Create a forbidden (403) error response
 */
export function forbiddenResponse(
  message: string,
  details?: Partial<RBACErrorResponse>
): NextResponse<RBACErrorResponse> {
  return NextResponse.json(
    {
      error: 'Forbidden',
      error_type: RBACErrorType.FORBIDDEN,
      message,
      ...details,
    } as RBACErrorResponse,
    { status: 403 }
  );
}

/**
 * Create a forbidden response for insufficient role
 */
export function insufficientRoleResponse(
  currentRole: TeamMemberRole,
  requiredRole: TeamMemberRole,
  resource?: Resource,
  permission?: PermissionCategory
): NextResponse<RBACErrorResponse> {
  return forbiddenResponse(
    `Your role (${ROLE_DISPLAY_NAMES[currentRole]}) does not have sufficient permissions. Required: ${ROLE_DISPLAY_NAMES[requiredRole]}`,
    {
      error_type: RBACErrorType.INSUFFICIENT_ROLE,
      current_role: currentRole,
      required_role: requiredRole,
      resource,
      permission,
    }
  );
}

/**
 * Create a forbidden response for non-members
 */
export function notMemberResponse(
  resource?: Resource
): NextResponse<RBACErrorResponse> {
  return forbiddenResponse('You are not a member of this organization', {
    error_type: RBACErrorType.NOT_MEMBER,
    resource,
  });
}

/**
 * Create a bad request (400) response for missing organization
 */
export function organizationRequiredResponse(): NextResponse<RBACErrorResponse> {
  return NextResponse.json(
    {
      error: 'Bad Request',
      error_type: RBACErrorType.ORGANIZATION_REQUIRED,
      message: 'Organization ID is required',
    } as RBACErrorResponse,
    { status: 400 }
  );
}

/**
 * Create a bad request response for invalid role
 */
export function invalidRoleResponse(
  providedRole: string
): NextResponse<RBACErrorResponse> {
  return NextResponse.json(
    {
      error: 'Bad Request',
      error_type: RBACErrorType.INVALID_ROLE,
      message: `Invalid role: ${providedRole}. Valid roles are: owner, admin, editor, viewer`,
    } as RBACErrorResponse,
    { status: 400 }
  );
}

/**
 * Create a not found (404) response for resource
 */
export function resourceNotFoundResponse(
  resourceType: string,
  identifier: string
): NextResponse<RBACErrorResponse> {
  return NextResponse.json(
    {
      error: 'Not Found',
      error_type: RBACErrorType.RESOURCE_NOT_FOUND,
      message: `${resourceType} with ID "${identifier}" not found`,
    } as RBACErrorResponse,
    { status: 404 }
  );
}

/**
 * Format error for logging
 */
export function formatRBACError(error: RBACErrorResponse): string {
  const parts = [`[${error.error_type}]`, error.message];

  if (error.required_role) {
    parts.push(`(Required: ${error.required_role})`);
  }

  if (error.current_role) {
    parts.push(`(Current: ${error.current_role})`);
  }

  if (error.resource && error.permission) {
    parts.push(
      `(Resource: ${error.resource}, Permission: ${error.permission})`
    );
  }

  return parts.join(' ');
}

/**
 * Check if an error is an RBAC error response
 */
export function isRBACErrorResponse(
  error: unknown
): error is NextResponse<RBACErrorResponse> {
  return (
    error instanceof NextResponse && error.status >= 400 && error.status < 500
  );
}

/**
 * Wrap a handler with standardized error handling
 */
export function withRBACErrorHandling<
  T extends (...args: any[]) => Promise<NextResponse>,
>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      // If it's already a NextResponse (our error responses), return it
      if (error instanceof NextResponse) {
        return error;
      }

      // Log unexpected errors
      console.error('Unexpected error in RBAC-protected handler:', error);

      // Return generic error response
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          error_type: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        } as RBACErrorResponse,
        { status: 500 }
      );
    }
  }) as T;
}

/**
 * Get the minimum role required for a permission category
 */
export function getRequiredRoleForPermission(
  category: PermissionCategory
): TeamMemberRole {
  return OPERATION_MIN_ROLE[category];
}

/**
 * Generate user-friendly permission denied message
 */
export function getPermissionDeniedMessage(
  resource: Resource,
  category: PermissionCategory,
  currentRole: TeamMemberRole
): string {
  const requiredRole = getRequiredRoleForPermission(category);

  if (ROLE_DISPLAY_NAMES[currentRole] === ROLE_DISPLAY_NAMES[requiredRole]) {
    return `Your role (${ROLE_DISPLAY_NAMES[currentRole]}) does not have ${category} permission on ${resource}`;
  }

  return `Your role (${ROLE_DISPLAY_NAMES[currentRole]}) does not have sufficient permissions to ${category} ${resource}. Required: ${ROLE_DISPLAY_NAMES[requiredRole]}`;
}

/**
 * Log RBAC denial for audit purposes
 */
export function logRBACDenial(
  userId: string,
  organizationId: string,
  resource: Resource,
  category: PermissionCategory,
  currentRole: TeamMemberRole,
  reason: string
): void {
  console.warn(
    `[RBAC DENIAL] User: ${userId}, Org: ${organizationId}, ` +
      `Resource: ${resource}, Permission: ${category}, ` +
      `Role: ${currentRole}, Reason: ${reason}`
  );
}

/**
 * RBAC denial info for audit logging
 */
export interface RBACDenialInfo {
  timestamp: string;
  userId: string;
  organizationId: string;
  resource: Resource;
  category: PermissionCategory;
  currentRole: TeamMemberRole;
  requiredRole?: TeamMemberRole;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create a denial info object for logging
 */
export function createDenialInfo(
  userId: string,
  organizationId: string,
  resource: Resource,
  category: PermissionCategory,
  currentRole: TeamMemberRole,
  reason: string,
  request?: Request
): RBACDenialInfo {
  const denialInfo: RBACDenialInfo = {
    timestamp: new Date().toISOString(),
    userId,
    organizationId,
    resource,
    category,
    currentRole,
    reason,
  };

  if (request) {
    // Try to extract IP and user agent
    try {
      const forwarded = request.headers.get('x-forwarded-for');
      denialInfo.ipAddress =
        forwarded?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
      denialInfo.userAgent = request.headers.get('user-agent') || 'unknown';
    } catch {
      // Headers might not be accessible
    }
  }

  return denialInfo;
}
