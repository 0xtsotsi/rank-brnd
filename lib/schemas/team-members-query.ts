/**
 * Get Pending Invitations Query Schema
 *
 * GET /api/team-members/pending
 * Renamed from pendingInvitationsQuerySchema to avoid conflicts
 */
import { z } from 'zod';

export const getPendingInvitationsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
});
