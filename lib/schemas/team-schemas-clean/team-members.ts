/**
 * Team Members API Schemas
 *
 * Zod validation schemas for team member-related API routes.
 * Note: Invitation-related schemas moved to team-invitations.ts to avoid conflicts
 */

import { z } from 'zod';

/**
 * Team member role enum
 */
export const teamMemberRoleSchema = z.enum([
  'owner',
  'admin',
  'editor',
  'viewer',
]);

export type TeamMemberRole = z.infer<typeof teamMemberRoleSchema>;

/**
 * Create Team Member Schema
 *
 * POST /api/team-members
 */
export const createTeamMemberSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  user_id: z.string().min(1, 'User ID is required'),
  role: teamMemberRoleSchema.optional().default('viewer'),
});

/**
 * Combined POST schema for team members (single or bulk)
 */
export const teamMembersPostSchema = z.discriminatedUnion('bulk', [
  z.object({
    bulk: z.literal(true),
    organization_id: z.string().min(1, 'Organization ID is required'),
    members: z
      .array(
        z.object({
          user_id: z.string().min(1, 'User ID is required'),
          role: teamMemberRoleSchema.optional().default('viewer'),
        })
      )
      .min(1, 'At least one member is required'),
  }),
  z.object({
    bulk: z.literal(false),
    organization_id: z.string().min(1, 'Organization ID is required'),
    user_id: z.string().min(1, 'User ID is required'),
    role: teamMemberRoleSchema.optional().default('viewer'),
  }),
]);

/**
 * Team Members Query Schema
 *
 * GET /api/team-members
 */
export const teamMembersQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  include_pending: z.coerce.boolean().optional().default(true),
  role: teamMemberRoleSchema.optional(),
  sort: z
    .enum(['invited_at', 'accepted_at', 'role', 'name'])
    .optional()
    .default('invited_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Update Team Member Schema
 *
 * PUT /api/team-members/[id]
 */
export const updateTeamMemberSchema = z.object({
  role: teamMemberRoleSchema.optional(),
});

/**
 * Accept Team Invitation Schema
 *
 * POST /api/team-members/[id]/accept
 */
export const acceptTeamInvitationSchema = z.object({
  team_member_id: z.string().min(1, 'Team member ID is required'),
});

/**
 * Remove Team Member Schema
 *
 * DELETE /api/team-members/[id]
 */
export const removeTeamMemberSchema = z.object({
  team_member_id: z.string().min(1, 'Team member ID is required'),
});
