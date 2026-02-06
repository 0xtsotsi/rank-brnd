// @ts-nocheck - Database types need to be regenerated with Supabase CLI

'use client';

/**
 * Team Invitation Form Component
 *
 * Allows team admins to invite new members by email.
 * Supports single and bulk invitations.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, Plus, Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';

export type TeamMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface InvitationRecipient {
  email: string;
  role: TeamMemberRole;
}

interface InvitationResult {
  email: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

interface TeamInvitationFormProps {
  organizationId: string;
  onInvitationSent?: (results: InvitationResult[]) => void;
  currentUserRole?: TeamMemberRole;
}

const roleOptions: {
  value: TeamMemberRole;
  label: string;
  description: string;
}[] = [
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
  {
    value: 'editor',
    label: 'Editor',
    description: 'Can create and edit content',
  },
  { value: 'admin', label: 'Admin', description: 'Can manage team members' },
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access to all settings',
  },
];

export function TeamInvitationForm({
  organizationId,
  onInvitationSent,
  currentUserRole = 'admin',
}: TeamInvitationFormProps) {
  const [recipients, setRecipients] = useState<InvitationRecipient[]>([
    { email: '', role: 'viewer' },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<InvitationResult[]>([]);

  const addRecipient = () => {
    setRecipients([...recipients, { email: '', role: 'viewer' }]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (
    index: number,
    field: keyof InvitationRecipient,
    value: string
  ) => {
    const newRecipients = [...recipients];
    newRecipients[index][field] = value as TeamMemberRole;
    setRecipients(newRecipients);
  };

  const validateRecipients = (): boolean => {
    return recipients.every(
      (r) => r.email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)
    );
  };

  const sendInvitations = async () => {
    if (!validateRecipients()) {
      setResults(
        recipients.map((r) => ({
          email: r.email,
          status: 'error' as const,
          message: 'Invalid email address',
        }))
      );
      return;
    }

    setIsSending(true);
    setResults([]);

    try {
      const response = await fetch('/api/team-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          organization_id: organizationId,
          invitations: recipients.map((r) => ({
            email: r.email.trim().toLowerCase(),
            role: r.role,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Mark all as success
        setResults(
          recipients.map((r) => ({
            email: r.email,
            status: 'success' as const,
            message: 'Invitation sent successfully',
          }))
        );

        // Reset form after a delay
        setTimeout(() => {
          setRecipients([{ email: '', role: 'viewer' }]);
          setResults([]);
        }, 3000);
      } else {
        // Handle error
        setResults(
          recipients.map((r) => ({
            email: r.email,
            status: 'error' as const,
            message: data.error || 'Failed to send invitation',
          }))
        );
      }
    } catch (error) {
      setResults(
        recipients.map((r) => ({
          email: r.email,
          status: 'error' as const,
          message: 'Network error. Please try again.',
        }))
      );
    } finally {
      setIsSending(false);
      onInvitationSent?.(results);
    }
  };

  const canManageRoles =
    currentUserRole === 'owner' || currentUserRole === 'admin';
  const maxRole = canManageRoles ? 'admin' : 'editor';

  const availableRoles = roleOptions.filter(
    (r) =>
      roleOptions.findIndex((opt) => opt.value === maxRole) >=
      roleOptions.findIndex((opt) => opt.value === r.value)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Members</CardTitle>
        <CardDescription>
          Send email invitations to join your team. Invitations expire after 7
          days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {recipients.map((recipient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-[2fr,1fr] gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`email-${index}`} className="sr-only">
                    Email
                  </Label>
                  <Input
                    id={`email-${index}`}
                    type="email"
                    placeholder="colleague@example.com"
                    value={recipient.email}
                    onChange={(e) =>
                      updateRecipient(index, 'email', e.target.value)
                    }
                    disabled={isSending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`role-${index}`} className="sr-only">
                    Role
                  </Label>
                  <Select
                    value={recipient.role}
                    onValueChange={(value) =>
                      updateRecipient(index, 'role', value)
                    }
                    disabled={isSending}
                  >
                    <SelectTrigger id={`role-${index}`}>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {recipients.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRecipient(index)}
                  disabled={isSending}
                  className="mt-0.5"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {results[index] && (
                <div className="mt-0.5">
                  {results[index].status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRecipient}
            disabled={isSending || recipients.length >= 10}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Another
          </Button>

          <div className="flex-1" />

          <Button
            type="button"
            onClick={sendInvitations}
            disabled={isSending || recipients.length === 0}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation{recipients.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>

        {/* Display results */}
        {results.length > 0 && (
          <div className="rounded-md border p-3 text-sm">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 ${
                  index > 0 ? 'mt-1 pt-1 border-t' : ''
                }`}
              >
                {result.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <span className="flex-1">{result.email}</span>
                <span className="text-muted-foreground text-xs">
                  {result.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Role descriptions */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">Role permissions:</p>
          {roleOptions.map((role) => (
            <p key={role.value}>
              <strong>{role.label}:</strong> {role.description}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
