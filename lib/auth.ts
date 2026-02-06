import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Authentication utility functions
 *
 * These helpers provide consistent authentication patterns across the application.
 * All JWT handling is done securely via httpOnly cookies managed by Clerk.
 */

/**
 * Get current user ID from session
 * @throws {Error} If user is not authenticated
 */
export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: User must be authenticated');
  }
  return userId;
}

/**
 * Get current user ID from session (safe version)
 * @returns {string | null} User ID or null if not authenticated
 */
export async function getUserId() {
  const { userId } = await auth();
  return userId;
}

/**
 * Get session claims with metadata
 * @throws {Error} If user is not authenticated
 */
export async function requireSessionClaims() {
  const { sessionClaims } = await auth();
  if (!sessionClaims) {
    throw new Error('Unauthorized: No session claims found');
  }
  return sessionClaims;
}

/**
 * Get authentication redirect response for API routes
 */
export function authRedirect() {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Authentication required' },
    { status: 401 }
  );
}

/**
 * Verify user is authenticated and return user data
 * @returns {Object} User authentication data
 * @throws {Error} If user is not authenticated
 */
export async function requireAuth() {
  const { userId, sessionClaims } = await auth();
  if (!userId || !sessionClaims) {
    throw new Error('Unauthorized: User must be authenticated');
  }
  return {
    userId,
    sessionClaims,
  };
}

/**
 * Extract organization ID from session metadata
 * @returns {string | null} Organization ID or null if not set
 */
export async function getOrganizationId() {
  const { orgId } = await auth();
  return orgId;
}

/**
 * Require organization membership
 * @throws {Error} If user is not in an organization
 */
export async function requireOrganizationId() {
  const orgId = await getOrganizationId();
  if (!orgId) {
    throw new Error('Unauthorized: User must belong to an organization');
  }
  return orgId;
}

/**
 * Check if user has specific role from metadata
 * @param role - Role to check (e.g., 'admin', 'owner')
 */
export async function hasRole(role: string): Promise<boolean> {
  const sessionClaims = await requireSessionClaims();
  const userRole = (sessionClaims.metadata as any)?.role;
  return userRole === role;
}

/**
 * Require specific role
 * @param role - Required role
 * @throws {Error} If user doesn't have the required role
 */
export async function requireRole(role: string) {
  const hasRequiredRole = await hasRole(role);
  if (!hasRequiredRole) {
    throw new Error(`Forbidden: User must have ${role} role`);
  }
}

/**
 * Get user's full name from session claims
 */
export async function getUserFullName(): Promise<string> {
  const sessionClaims = await requireSessionClaims();
  const metadata = sessionClaims.metadata as any;
  const firstName = metadata?.firstName || sessionClaims.given_name;
  const lastName = metadata?.lastName || sessionClaims.family_name;
  return `${firstName || ''} ${lastName || ''}`.trim();
}

/**
 * Get user's email from session claims
 */
export async function getUserEmail(): Promise<string> {
  const sessionClaims = await requireSessionClaims();
  return (sessionClaims as any).email || '';
}
