/**
 * Team Invitations API Schemas
 *
 * Zod validation schemas for team invitation-related API routes.
 */

import { z } from 'zod';

/**
 * Team member role enum (for invitations - different from team members)
 */
export const invitationTeamMemberRoleSchema = z.enum([
  'owner',
  'admin',
  'editor',
  'viewer',
]);

export type InvitationTeamMemberRole = z.infer<
  typeof invitationTeamMemberRoleSchema
>;

/**
 * Team invitation status enum
 */
export const teamInvitationStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'expired',
  'cancelled',
]);

export type TeamInvitationStatus = z.infer<typeof teamInvitationStatusSchema>;

/**
 * Get Pending Invitations Query Schema
 *
 * GET /api/team-invitations/pending
 */
export const pendingInvitationsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
});

/**
 * Create Team Invitation Schema
 *
 * POST /api/team-invitations
 */
export const createTeamInvitationSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  email: z.string().email('Invalid email address'),
  role: invitationTeamMemberRoleSchema.optional().default('viewer'),
});

/**
 * Validate Invitation Token Schema
 *
 * GET /api/team-invitations/validate?token=<token>
 */
export const validateInvitationTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Accept Invitation Schema
 *
 * POST /api/team-invitations/accept
 */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Cancel Invitation Schema
 *
 * DELETE /api/team-invitations/[id]
 */
export const cancelInvitationSchema = z.object({
  invitation_id: z.string().min(1, 'Invitation ID is required'),
});

/**
 * Resend Invitation Schema
 *
 * POST /api/team-invitations/[id]/resend
 */
export const resendInvitationSchema = z.object({
  invitation_id: z.string().min(1, 'Invitation ID is required'),
});

/**
 * Decline Invitation Schema
 *
 * POST /api/team-invitations/[id]/decline
 */
export const declineInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Check Invitation Status Schema
 *
 * GET /api/team-invitations/check?email=<email>
 */
export const checkInvitationStatusSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Invitation Email Template Schema
 */
export const invitationEmailDataSchema = z.object({
  organization_name: z.string(),
  inviter_name: z.string(),
  invite_link: z.string().url(),
  role: invitationTeamMemberRoleSchema,
});
