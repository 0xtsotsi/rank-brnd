/**
 * RBAC (Role-Based Access Control)
 *
 * Comprehensive RBAC system for protecting API routes and managing permissions.
 *
 * @example Basic route protection
 * ```ts
 * import { withEditorAccess } from '@/lib/rbac';
 *
 * export const POST = withEditorAccess(async (request, { userId, organizationId, client, role }) => {
 *   // Your handler logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 *
 * @example Custom permission check
 * ```ts
 * import { protectRoute } from '@/lib/rbac';
 * import { Resource, PermissionCategory } from '@/lib/rbac/types';
 *
 * export const DELETE = protectRoute({
 *   resource: Resource.ARTICLES,
 *   permission: PermissionCategory.DELETE,
 * })(async (request, context) => {
 *   // Handler logic here
 * });
 * ```
 *
 * @example Server-side permission check
 * ```ts
 * import { canUserAccessResource } from '@/lib/rbac';
 *
 * const canAccess = await canUserAccessResource(client, userId, orgId, Resource.ARTICLES, 'read');
 * ```
 */

// Types and constants
export {
  PermissionCategory,
  Resource,
  ROLE_HIERARCHY,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  PERMISSION_MATRIX,
  OPERATION_MIN_ROLE,
  roleHasPermission,
  roleHasMinLevel,
  getRolePermissions,
} from './types';

// Middleware for API routes
export {
  requireAuth,
  requireOrganizationMember,
  requirePermission,
  requireMinRole,
  requireAdminOrOwner,
  requireOwner,
  withAuth,
  withOrganizationAccess,
  createPermissionMiddleware,
  rbac,
  checkPermission,
  type PermissionCheckResult,
  type AuthContext,
  type PermissionRequirement,
} from './middleware';

// Permission checking utilities
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getMinRoleForOperation,
  meetsRoleRequirement,
  getUserPermissionContext,
  canUserPerformOperation,
  canUserAccessResource,
  getOrganizationsWithRole,
  getReadableResources,
  getCreatableResources,
  getUpdatableResources,
  getDeletableResources,
  getResourcePermissionsForRole,
  canManageTeamMembers,
  canManageSettings,
  canManageBilling,
  canPublish,
  getUserCapabilities,
  canModifyUserRole,
  filterByReadPermission,
  validateOperation,
} from './permissions';

// Route handler decorators/helpers
export {
  protectRoute,
  withViewerAccess,
  withEditorAccess,
  withAdminAccess,
  withOwnerAccess,
  withPermission,
  withTeamManagement,
  withSettingsAccess,
  withBillingAccess,
  withPublishAccess,
  withRoleModification,
  getOrgFromQuery,
  getOrgFromBody,
  extractOrganizationId,
  validateRequestBody,
  canAccessResource,
  type ProtectedRouteContext,
  type ProtectRouteOptions,
} from './decorators';

// Error handling helpers
export {
  RBACErrorType,
  unauthorizedResponse,
  forbiddenResponse,
  insufficientRoleResponse,
  notMemberResponse,
  organizationRequiredResponse,
  invalidRoleResponse,
  resourceNotFoundResponse,
  formatRBACError,
  isRBACErrorResponse,
  withRBACErrorHandling,
  getRequiredRoleForPermission,
  getPermissionDeniedMessage,
  logRBACDenial,
  createDenialInfo,
  type RBACErrorResponse,
  type RBACDenialInfo,
} from './errors';

// Re-export types from team-members for convenience
export type { TeamMemberRole } from '@/lib/supabase/team-members';
