/**
 * RBAC Utilities
 *
 * Helper functions for checking permissions and roles throughout the application.
 * These utilities complement the middleware and can be used in any context.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { TeamMemberRole } from '@/lib/supabase/team-members';
import type { Permission, Resource } from '@/lib/rbac/types';
import { PermissionCategory } from '@/lib/rbac/types';
import {
  ROLE_HIERARCHY,
  OPERATION_MIN_ROLE,
  PERMISSION_MATRIX,
} from '@/lib/rbac/types';
import {
  getTeamRole,
  hasMinTeamRole,
  getUserTeamMemberships,
} from '@/lib/supabase/team-members';

/**
 * User permission context
 */
export interface UserPermissionContext {
  userId: string;
  organizationId: string;
  role: TeamMemberRole;
}

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  /** Strict mode - returns false instead of throwing errors */
  strict?: boolean;
}

/**
 * Check if a role has permission for a resource category
 */
export function hasPermission(
  role: TeamMemberRole,
  resource: Resource,
  category: PermissionCategory
): boolean {
  const allowedCategories = PERMISSION_MATRIX[resource]?.[role] || [];
  return allowedCategories.includes(category);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: TeamMemberRole,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => {
    const [category, resource] = permission.split(':') as [
      PermissionCategory,
      Resource,
    ];
    return hasPermission(role, resource, category);
  });
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(
  role: TeamMemberRole,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => {
    const [category, resource] = permission.split(':') as [
      PermissionCategory,
      Resource,
    ];
    return hasPermission(role, resource, category);
  });
}

/**
 * Get the minimum role required for an operation category
 */
export function getMinRoleForOperation(
  category: PermissionCategory
): TeamMemberRole {
  return OPERATION_MIN_ROLE[category];
}

/**
 * Check if a role meets the minimum requirement for an operation
 */
export function meetsRoleRequirement(
  role: TeamMemberRole,
  minRole: TeamMemberRole
): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get user's permission context for an organization
 */
export async function getUserPermissionContext(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string
): Promise<UserPermissionContext | null> {
  const role = await getTeamRole(client, organizationId, userId);

  if (!role) {
    return null;
  }

  return {
    userId,
    organizationId,
    role,
  };
}

/**
 * Check if user can perform an operation in an organization
 */
export async function canUserPerformOperation(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  operation: PermissionCategory
): Promise<boolean> {
  const role = await getTeamRole(client, organizationId, userId);

  if (!role) {
    return false;
  }

  const minRole = getMinRoleForOperation(operation);
  return meetsRoleRequirement(role, minRole);
}

/**
 * Check if user can access a resource with a specific permission
 */
export async function canUserAccessResource(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  resource: Resource,
  category: PermissionCategory
): Promise<boolean> {
  const context = await getUserPermissionContext(
    client,
    userId,
    organizationId
  );

  if (!context) {
    return false;
  }

  return hasPermission(context.role, resource, category);
}

/**
 * Get all organizations where user has a specific role level
 */
export async function getOrganizationsWithRole(
  client: SupabaseClient<Database>,
  userId: string,
  minRole: TeamMemberRole
): Promise<Array<{ id: string; name: string; role: TeamMemberRole }>> {
  const result = await getUserTeamMemberships(client, userId);

  if (!result.success) {
    return [];
  }

  return result.data
    .filter((membership) => meetsRoleRequirement(membership.role, minRole))
    .map((membership) => ({
      id: membership.organization_id,
      name: membership.organization_name,
      role: membership.role,
    }));
}

/**
 * Get all resources a role can read
 */
export function getReadableResources(role: TeamMemberRole): Resource[] {
  const resources: Resource[] = [];

  for (const [resource, permissions] of Object.entries(PERMISSION_MATRIX)) {
    if (permissions[role].includes(PermissionCategory.READ)) {
      resources.push(resource as Resource);
    }
  }

  return resources;
}

/**
 * Get all resources a role can create
 */
export function getCreatableResources(role: TeamMemberRole): Resource[] {
  const resources: Resource[] = [];

  for (const [resource, permissions] of Object.entries(PERMISSION_MATRIX)) {
    if (permissions[role].includes(PermissionCategory.CREATE)) {
      resources.push(resource as Resource);
    }
  }

  return resources;
}

/**
 * Get all resources a role can update
 */
export function getUpdatableResources(role: TeamMemberRole): Resource[] {
  const resources: Resource[] = [];

  for (const [resource, permissions] of Object.entries(PERMISSION_MATRIX)) {
    if (permissions[role].includes(PermissionCategory.UPDATE)) {
      resources.push(resource as Resource);
    }
  }

  return resources;
}

/**
 * Get all resources a role can delete
 */
export function getDeletableResources(role: TeamMemberRole): Resource[] {
  const resources: Resource[] = [];

  for (const [resource, permissions] of Object.entries(PERMISSION_MATRIX)) {
    if (permissions[role].includes(PermissionCategory.DELETE)) {
      resources.push(resource as Resource);
    }
  }

  return resources;
}

/**
 * Get all permissions a role has for a specific resource
 */
export function getResourcePermissionsForRole(
  role: TeamMemberRole,
  resource: Resource
): PermissionCategory[] {
  return PERMISSION_MATRIX[resource]?.[role] || [];
}

/**
 * Check if user can manage team members
 */
export async function canManageTeamMembers(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  return hasMinTeamRole(client, organizationId, userId, 'admin');
}

/**
 * Check if user can manage organization settings
 */
export async function canManageSettings(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  return hasMinTeamRole(client, organizationId, userId, 'admin');
}

/**
 * Check if user can manage billing (owner only)
 */
export async function canManageBilling(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  return hasMinTeamRole(client, organizationId, userId, 'owner');
}

/**
 * Check if user can publish content
 */
export async function canPublish(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  return hasMinTeamRole(client, organizationId, userId, 'editor');
}

/**
 * Get a summary of user's capabilities
 */
export async function getUserCapabilities(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string
): Promise<{
  role: TeamMemberRole | null;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;
  canManageBilling: boolean;
  canPublish: boolean;
}> {
  const role = await getTeamRole(client, organizationId, userId);

  if (!role) {
    return {
      role: null,
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canManageTeam: false,
      canManageSettings: false,
      canManageBilling: false,
      canPublish: false,
    };
  }

  return {
    role,
    canRead: meetsRoleRequirement(role, 'viewer'),
    canCreate: meetsRoleRequirement(role, 'editor'),
    canUpdate: meetsRoleRequirement(role, 'editor'),
    canDelete: meetsRoleRequirement(role, 'admin'),
    canManageTeam: meetsRoleRequirement(role, 'admin'),
    canManageSettings: meetsRoleRequirement(role, 'admin'),
    canManageBilling: meetsRoleRequirement(role, 'owner'),
    canPublish: meetsRoleRequirement(role, 'editor'),
  };
}

/**
 * Check if a user can modify another user's role
 * Rules:
 * - Owners can modify any role except downgrade themselves
 * - Admins can only modify editor and viewer roles
 * - Editors and viewers cannot modify roles
 */
export async function canModifyUserRole(
  client: SupabaseClient<Database>,
  requesterUserId: string,
  targetUserId: string,
  organizationId: string,
  newRole: TeamMemberRole
): Promise<boolean> {
  const requesterRole = await getTeamRole(
    client,
    organizationId,
    requesterUserId
  );

  if (!requesterRole) {
    return false;
  }

  // Can't modify if not admin or above
  if (!meetsRoleRequirement(requesterRole, 'admin')) {
    return false;
  }

  // Get target user's current role
  const targetRole = await getTeamRole(client, organizationId, targetUserId);

  if (!targetRole) {
    return false;
  }

  // Owner can do anything except downgrade themselves
  if (requesterRole === 'owner') {
    if (requesterUserId === targetUserId) {
      // Can't downgrade themselves
      return ROLE_HIERARCHY[newRole] <= ROLE_HIERARCHY[targetRole];
    }
    return true;
  }

  // Admin can only modify editors and viewers
  if (requesterRole === 'admin') {
    // Can't modify owners or other admins
    if (ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY['admin']) {
      return false;
    }
    // Can't promote anyone to admin or above
    if (ROLE_HIERARCHY[newRole] >= ROLE_HIERARCHY['admin']) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Filter data based on user's read permissions
 * Useful when you need to filter a list of resources the user can access
 */
export function filterByReadPermission<T extends { type: Resource }>(
  role: TeamMemberRole,
  items: T[]
): T[] {
  const readableResources = getReadableResources(role);
  return items.filter((item) => readableResources.includes(item.type));
}

/**
 * Validate an operation against user's permissions
 * Returns a detailed result with reason if denied
 */
export async function validateOperation(
  client: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  resource: Resource,
  category: PermissionCategory
): Promise<{
  allowed: boolean;
  reason?: string;
  role?: TeamMemberRole;
}> {
  const context = await getUserPermissionContext(
    client,
    userId,
    organizationId
  );

  if (!context) {
    return {
      allowed: false,
      reason: 'User is not a member of this organization',
    };
  }

  if (!hasPermission(context.role, resource, category)) {
    const minRole = getMinRoleForOperation(category);
    return {
      allowed: false,
      reason: `${context.role} role does not have ${category} permission on ${resource}. Requires at least ${minRole} role.`,
      role: context.role,
    };
  }

  return {
    allowed: true,
    role: context.role,
  };
}
