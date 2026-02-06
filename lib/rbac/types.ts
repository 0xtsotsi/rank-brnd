/**
 * RBAC Types and Constants
 *
 * Defines role-based access control types, permissions, and constants
 * for the application.
 */

import type { TeamMemberRole } from '@/lib/supabase/team-members';

/**
 * Permission categories for organizing access control
 */
export enum PermissionCategory {
  /** Read access to resources */
  READ = 'read',
  /** Create new resources */
  CREATE = 'create',
  /** Update existing resources */
  UPDATE = 'update',
  /** Delete resources */
  DELETE = 'delete',
  /** Manage team members and roles */
  MANAGE_TEAM = 'manage_team',
  /** Manage organization settings */
  MANAGE_SETTINGS = 'manage_settings',
  /** Manage billing and subscriptions */
  MANAGE_BILLING = 'manage_billing',
  /** Publish content */
  PUBLISH = 'publish',
  /** Access analytics and reports */
  ANALYTICS = 'analytics',
  /** Manage integrations */
  INTEGRATIONS = 'integrations',
  /** Full system access */
  ADMIN = 'admin',
}

/**
 * Resource types for granular permission control
 */
export enum Resource {
  /** Articles and content */
  ARTICLES = 'articles',
  /** Keywords and SEO data */
  KEYWORDS = 'keywords',
  /** Products */
  PRODUCTS = 'products',
  /** Schedule and calendar */
  SCHEDULE = 'schedule',
  /** Publishing queue */
  PUBLISHING = 'publishing',
  /** Team members */
  TEAM = 'team',
  /** Organization settings */
  SETTINGS = 'settings',
  /** Billing and subscriptions */
  BILLING = 'billing',
  /** Analytics and reports */
  ANALYTICS = 'analytics',
  /** Integrations */
  INTEGRATIONS = 'integrations',
  /** Images and media */
  IMAGES = 'images',
  /** Brand voice settings */
  BRAND_VOICE = 'brand_voice',
  /** SERP analysis */
  SERP = 'serp',
  /** Rank tracking */
  RANK_TRACKING = 'rank_tracking',
  /** Search Console data */
  SEARCH_CONSOLE = 'search_console',
}

/**
 * Permission definition combining category and resource
 */
export type Permission = `${PermissionCategory}:${Resource}`;

/**
 * Role hierarchy levels for comparison
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<TeamMemberRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
} as const;

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<TeamMemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
} as const;

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<TeamMemberRole, string> = {
  owner: 'Full access to all settings, billing, and can manage team members',
  admin:
    'Can manage team members, settings, and access all organization resources',
  editor: 'Can create, edit, and publish content within the organization',
  viewer: 'Read-only access to organization resources',
} as const;

/**
 * Permission matrix defining what each role can do
 * Format: resource -> [permission categories allowed for each role]
 */
export const PERMISSION_MATRIX: Record<
  Resource,
  {
    viewer: PermissionCategory[];
    editor: PermissionCategory[];
    admin: PermissionCategory[];
    owner: PermissionCategory[];
  }
> = {
  [Resource.ARTICLES]: {
    viewer: [PermissionCategory.READ],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.PUBLISH,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.PUBLISH,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.PUBLISH,
    ],
  },

  [Resource.KEYWORDS]: {
    viewer: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.ANALYTICS,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.ANALYTICS,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.ANALYTICS,
    ],
  },

  [Resource.PRODUCTS]: {
    viewer: [PermissionCategory.READ],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.SCHEDULE]: {
    viewer: [PermissionCategory.READ],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.PUBLISHING]: {
    viewer: [PermissionCategory.READ],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.PUBLISH,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.PUBLISH,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.PUBLISH,
    ],
  },

  [Resource.TEAM]: {
    viewer: [],
    editor: [],
    admin: [PermissionCategory.READ, PermissionCategory.MANAGE_TEAM],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.MANAGE_TEAM,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.SETTINGS]: {
    viewer: [],
    editor: [],
    admin: [PermissionCategory.READ, PermissionCategory.MANAGE_SETTINGS],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.MANAGE_SETTINGS,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.BILLING]: {
    viewer: [PermissionCategory.READ],
    editor: [PermissionCategory.READ],
    admin: [PermissionCategory.READ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.MANAGE_BILLING,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.ANALYTICS]: {
    viewer: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    editor: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    admin: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    owner: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
  },

  [Resource.INTEGRATIONS]: {
    viewer: [PermissionCategory.READ],
    editor: [PermissionCategory.READ],
    admin: [PermissionCategory.READ, PermissionCategory.INTEGRATIONS],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.INTEGRATIONS,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.IMAGES]: {
    viewer: [PermissionCategory.READ],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.DELETE,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.BRAND_VOICE]: {
    viewer: [PermissionCategory.READ],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
    ],
  },

  [Resource.SERP]: {
    viewer: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.ANALYTICS,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.ANALYTICS,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.ANALYTICS,
    ],
  },

  [Resource.RANK_TRACKING]: {
    viewer: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    editor: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.ANALYTICS,
    ],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.ANALYTICS,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.CREATE,
      PermissionCategory.UPDATE,
      PermissionCategory.DELETE,
      PermissionCategory.ANALYTICS,
    ],
  },

  [Resource.SEARCH_CONSOLE]: {
    viewer: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    editor: [PermissionCategory.READ, PermissionCategory.ANALYTICS],
    admin: [
      PermissionCategory.READ,
      PermissionCategory.INTEGRATIONS,
      PermissionCategory.ANALYTICS,
    ],
    owner: [
      PermissionCategory.READ,
      PermissionCategory.INTEGRATIONS,
      PermissionCategory.ANALYTICS,
    ],
  },
};

/**
 * Check if a role has a specific permission for a resource
 */
export function roleHasPermission(
  role: TeamMemberRole,
  resource: Resource,
  category: PermissionCategory
): boolean {
  return PERMISSION_MATRIX[resource][role].includes(category);
}

/**
 * Check if a role meets a minimum hierarchy level
 */
export function roleHasMinLevel(
  role: TeamMemberRole,
  minRole: TeamMemberRole
): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: TeamMemberRole): Permission[] {
  const permissions: Permission[] = [];

  for (const [resource, categories] of Object.entries(PERMISSION_MATRIX)) {
    for (const category of categories[role]) {
      permissions.push(`${category}:${resource}` as Permission);
    }
  }

  return permissions;
}

/**
 * Minimum role required for each operation type
 */
export const OPERATION_MIN_ROLE: Record<PermissionCategory, TeamMemberRole> = {
  [PermissionCategory.READ]: 'viewer' as TeamMemberRole,
  [PermissionCategory.CREATE]: 'editor' as TeamMemberRole,
  [PermissionCategory.UPDATE]: 'editor' as TeamMemberRole,
  [PermissionCategory.DELETE]: 'admin' as TeamMemberRole,
  [PermissionCategory.MANAGE_TEAM]: 'admin' as TeamMemberRole,
  [PermissionCategory.MANAGE_SETTINGS]: 'admin' as TeamMemberRole,
  [PermissionCategory.MANAGE_BILLING]: 'owner' as TeamMemberRole,
  [PermissionCategory.PUBLISH]: 'editor' as TeamMemberRole,
  [PermissionCategory.ANALYTICS]: 'viewer' as TeamMemberRole,
  [PermissionCategory.INTEGRATIONS]: 'admin' as TeamMemberRole,
  [PermissionCategory.ADMIN]: 'admin' as TeamMemberRole,
};
