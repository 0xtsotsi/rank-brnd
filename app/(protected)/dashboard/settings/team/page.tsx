'use client';

/**
 * Team Management Page
 *
 * Manage team members, roles, and invitations.
 */

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { TeamInvitationForm } from '@/components/team-management/team-invitation-form';
import { TeamMembersTable } from '@/components/team-management/team-members-table';
import { PendingInvitationsList } from '@/components/team-management/pending-invitations-list';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TeamMemberRole } from '@/components/team-management/team-invitation-form';

export default function TeamManagementPage() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();
  const [currentUserRole, setCurrentUserRole] =
    useState<TeamMemberRole>('viewer');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch current user's role in the organization
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!organization?.id || !user?.id) return;

      setIsLoadingRole(true);
      try {
        // Get user ID from Clerk user ID
        const response = await fetch(
          `/api/team-members?organization_id=${organization.id}&include_pending=false`
        );

        if (response.ok) {
          const data = await response.json();
          // Find the current user's membership
          const currentUserMembership = data.team_members?.find(
            (m: any) => m.email === user.emailAddresses?.[0]?.emailAddress
          );

          if (currentUserMembership) {
            setCurrentUserRole(currentUserMembership.role);
            setCurrentUserId(currentUserMembership.user_id);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoadingRole(false);
      }
    };

    if (orgLoaded && userLoaded && organization?.id) {
      fetchUserRole();
    }
  }, [
    organization?.id,
    user?.id,
    user?.emailAddresses,
    orgLoaded,
    userLoaded,
    refreshKey,
  ]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!orgLoaded || !userLoaded || isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Please select an organization to manage team members.
        </p>
      </div>
    );
  }

  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="space-y-6" data-testid="team-management-page">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Team Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage members, roles, and invitations for{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {organization.name}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Invite Form - only for admins and owners */}
      {canInvite && (
        <TeamInvitationForm
          key={`invite-${refreshKey}`}
          organizationId={organization.id}
          currentUserRole={currentUserRole}
          onInvitationSent={handleRefresh}
        />
      )}

      {/* Pending Invitations */}
      <PendingInvitationsList
        key={`pending-${refreshKey}`}
        organizationId={organization.id}
        onRefresh={handleRefresh}
      />

      {/* Team Members Table */}
      <TeamMembersTable
        key={`members-${refreshKey}`}
        organizationId={organization.id}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
