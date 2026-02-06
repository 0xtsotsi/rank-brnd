// @ts-nocheck - Database types need to be regenerated with Supabase CLI

'use client';

/**
 * Team Members Table Component
 *
 * Displays team members with roles, status, and actions.
 * Supports role changes and member removal for authorized users.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Modal, ModalFooter } from '@/components/ui/modal';
import {
  MoreHorizontal,
  Trash2,
  Loader2,
  Crown,
  Shield,
  Edit2,
  Eye,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export type TeamMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: TeamMemberRole;
  invited_at: string;
  accepted_at: string | null;
  is_pending: boolean;
}

interface TeamMembersTableProps {
  organizationId: string;
  currentUserRole: TeamMemberRole;
  currentUserId: string;
  onRefresh?: () => void;
}

export function TeamMembersTable({
  organizationId,
  currentUserRole,
  currentUserId,
  onRefresh,
}: TeamMembersTableProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/team-members?organization_id=${organizationId}&include_pending=false`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      setMembers(data.team_members || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load team members'
      );
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (
    memberId: string,
    newRole: TeamMemberRole
  ) => {
    setUpdatingId(memberId);
    setError(null);
    try {
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      // Update local state
      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveClick = (member: TeamMember) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  const handleRemoveConfirm = async () => {
    if (!memberToDelete) return;

    setDeletingId(memberToDelete.id);
    setError(null);
    try {
      const response = await fetch(`/api/team-members/${memberToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      // Update local state
      setMembers(members.filter((m) => m.id !== memberToDelete.id));
      setShowDeleteDialog(false);
      setMemberToDelete(null);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Owner',
      admin: 'Admin',
      editor: 'Editor',
      viewer: 'Viewer',
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ReactNode> = {
      owner: <Crown className="h-3.5 w-3.5" />,
      admin: <Shield className="h-3.5 w-3.5" />,
      editor: <Edit2 className="h-3.5 w-3.5" />,
      viewer: <Eye className="h-3.5 w-3.5" />,
    };
    return icons[role] || null;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      owner:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      editor:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getAvailableRoles = (
    targetMemberRole: TeamMemberRole
  ): TeamMemberRole[] => {
    // Users cannot promote others to a role higher than their own
    const roleHierarchy: Record<TeamMemberRole, number> = {
      viewer: 1,
      editor: 2,
      admin: 3,
      owner: 4,
    };

    const currentLevel = roleHierarchy[currentUserRole];
    const targetLevel = roleHierarchy[targetMemberRole];

    // Can only change to roles at or below current user's level
    const available: TeamMemberRole[] = [];
    for (const [role, level] of Object.entries(roleHierarchy)) {
      if (level <= currentLevel) {
        available.push(role as TeamMemberRole);
      }
    }

    return available;
  };

  const canManageMember = (member: TeamMember): boolean => {
    // Can't manage self
    if (member.user_id === currentUserId) return false;

    // Owners can manage everyone except themselves
    if (currentUserRole === 'owner') return true;

    // Admins can manage non-owners
    if (currentUserRole === 'admin' && member.role !== 'owner') return true;

    return false;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People with access to your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {members.length === 0
                  ? 'No team members yet.'
                  : `${members.length} member${members.length !== 1 ? 's' : ''} in your organization.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {error && (
          <div className="px-6 pb-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          </div>
        )}

        {members.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                          {member.avatar_url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={member.avatar_url}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                              />
                            </>
                          ) : (
                            <span>
                              {member.name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || member.email[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {member.email}
                          </div>
                          {member.user_id === currentUserId && (
                            <span className="text-xs text-gray-400">(You)</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageMember(member) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${getRoleBadgeColor(
                                member.role
                              )} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                            >
                              {getRoleIcon(member.role)}
                              {getRoleLabel(member.role)}
                              {updatingId === member.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <svg
                                  className="h-3 w-3 opacity-50"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {getAvailableRoles(member.role).map((role) => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() =>
                                  handleRoleChange(member.id, role)
                                }
                                disabled={
                                  updatingId === member.id ||
                                  member.role === role
                                }
                              >
                                <span className="mr-2">
                                  {getRoleIcon(role)}
                                </span>
                                {getRoleLabel(role)}
                                {member.role === role && (
                                  <span className="ml-auto text-xs text-gray-400">
                                    Current
                                  </span>
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {getRoleIcon(member.role)}
                          {getRoleLabel(member.role)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.is_pending ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Mail className="h-3 w-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <span className="h-2 w-2 rounded-full bg-current" />
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {member.accepted_at
                        ? formatDistanceToNow(new Date(member.accepted_at), {
                            addSuffix: true,
                          })
                        : formatDistanceToNow(new Date(member.invited_at), {
                            addSuffix: true,
                          })}
                    </TableCell>
                    <TableCell>
                      {canManageMember(member) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(member.id, 'viewer')
                              }
                              disabled={updatingId === member.id}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Change to Viewer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(member.id, 'editor')
                              }
                              disabled={updatingId === member.id}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Change to Editor
                            </DropdownMenuItem>
                            {currentUserRole === 'owner' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRoleChange(member.id, 'admin')
                                  }
                                  disabled={updatingId === member.id}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Change to Admin
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveClick(member)}
                              disabled={deletingId === member.id}
                              className="text-destructive focus:text-destructive"
                            >
                              {deletingId === member.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        size="sm"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            Remove Team Member
          </div>
        }
        footer={
          <ModalFooter
            secondaryAction={{
              label: 'Cancel',
              onClick: () => setShowDeleteDialog(false),
            }}
            primaryAction={{
              label: deletingId ? 'Removing...' : 'Remove Member',
              onClick: handleRemoveConfirm,
              disabled: !!deletingId,
              loading: !!deletingId,
              className: 'bg-red-600 hover:bg-red-700',
            }}
          />
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to remove{' '}
          <strong>{memberToDelete?.name || memberToDelete?.email}</strong> from
          your organization? They will lose access to all organization resources
          immediately.
        </p>
      </Modal>
    </>
  );
}
