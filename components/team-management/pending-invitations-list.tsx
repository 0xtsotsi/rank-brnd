// @ts-nocheck - Database types need to be regenerated with Supabase CLI

'use client';

/**
 * Pending Invitations List Component
 *
 * Displays pending team invitations with options to cancel or resend.
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
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, RefreshCw, Loader2, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  token: string;
  invited_by_user_id: string;
  invited_by_name: string;
  invited_by_email: string;
  expires_at: string;
  created_at: string;
}

interface PendingInvitationsListProps {
  organizationId: string;
  onRefresh?: () => void;
}

export function PendingInvitationsList({
  organizationId,
  onRefresh,
}: PendingInvitationsListProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/team-invitations/pending?organization_id=${organizationId}`
      );

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleCancel = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      const response = await fetch(
        `/api/team-invitations?invitation_id=${invitationId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setInvitations(invitations.filter((inv) => inv.id !== invitationId));
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error canceling invitation:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const handleResend = async (invitation: PendingInvitation) => {
    // In a real implementation, you would have a resend endpoint
    // For now, we'll just show a notification
    console.log('Resend invitation:', invitation);
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

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      editor: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Invitations that have been sent but not yet accepted.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              {invitations.length === 0
                ? 'No pending invitations.'
                : `${invitations.length} invitation${invitations.length !== 1 ? 's' : ''} waiting to be accepted.`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvitations}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </CardHeader>
      {invitations.length > 0 && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">
                    {invitation.email}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(
                        invitation.role
                      )}`}
                    >
                      {getRoleLabel(invitation.role)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{invitation.invited_by_name}</div>
                      <div className="text-muted-foreground text-xs">
                        {invitation.invited_by_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(invitation.created_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleResend(invitation)}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Resend
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCancel(invitation.id)}
                          disabled={cancellingId === invitation.id}
                          className="text-destructive"
                        >
                          {cancellingId === invitation.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
