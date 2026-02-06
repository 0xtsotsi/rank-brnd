'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeletionSummary {
  organizationCount: number;
  ownedOrganizations: string[];
  memberOrganizations: string[];
  activeSubscriptions: number;
}

interface DeletionStatusData {
  hasPendingRequest: boolean;
  pendingRequest: {
    id: string;
    status: string;
    requestedAt: string;
  } | null;
  summary: DeletionSummary;
  activeSubscriptions: {
    hasActive: boolean;
    count: number;
    organizations: string[];
  };
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [data, setData] = useState<DeletionStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDeletionStatus();
  }, []);

  const fetchDeletionStatus = async () => {
    try {
      const response = await fetch('/api/user/account/deletion');
      if (!response.ok) {
        throw new Error('Failed to fetch deletion status');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/account/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to request deletion');
      }

      setSuccess(true);
      setShowConfirm(false);

      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/');
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to request deletion'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/account/deletion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to cancel deletion');
      }

      await fetchDeletionStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to cancel deletion'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Account Deletion Initiated
              </h3>
              <p className="text-green-700 dark:text-green-300 mt-2">
                Your account and all associated data are being deleted. You will
                be redirected to the home page shortly.
              </p>
              <p className="text-green-600 dark:text-green-400 text-sm mt-4">
                Redirecting in 3 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Account Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and personal data
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Pending Request Warning */}
      {data?.hasPendingRequest && data.pendingRequest && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Pending Account Deletion
              </h3>
              <p className="text-amber-700 dark:text-amber-300 mt-2">
                You have a pending account deletion request requested on{' '}
                {new Date(data.pendingRequest.requestedAt).toLocaleDateString()}
                .
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleCancelDeletion}
                  disabled={deleting}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Deletion Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete Account
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          {data?.summary && data.summary.organizationCount > 0 && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Data that will be deleted:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {data.summary.ownedOrganizations.length > 0 && (
                  <li>
                    <strong>Organizations you own:</strong>{' '}
                    {data.summary.ownedOrganizations.join(', ')}
                  </li>
                )}
                {data.summary.memberOrganizations.length > 0 && (
                  <li>
                    <strong>Organization memberships:</strong>{' '}
                    {data.summary.memberOrganizations.join(', ')}
                  </li>
                )}
                {data.activeSubscriptions?.hasActive && (
                  <li className="text-amber-600 dark:text-amber-400">
                    <strong>Active subscriptions:</strong>{' '}
                    {data.activeSubscriptions.organizations.join(', ')} - These
                    will be cancelled
                  </li>
                )}
                <li>All your uploaded files and personal data</li>
              </ul>
            </div>
          )}

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={data?.hasPendingRequest || deleting}
              className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {data?.hasPendingRequest
                ? 'Deletion Already Pending'
                : 'Delete Account'}
            </button>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 dark:text-red-100">
                  Are you sure you want to delete your account?
                </h4>
                <p className="text-red-700 dark:text-red-300 text-sm mt-2">
                  This action is irreversible. All your data will be permanently
                  deleted including:
                </p>
                <ul className="text-red-700 dark:text-red-300 text-sm mt-2 list-disc list-inside space-y-1">
                  <li>Your profile and personal information</li>
                  <li>Organizations you own</li>
                  <li>Your memberships in other organizations</li>
                  <li>Active subscriptions (will be cancelled)</li>
                  <li>Uploaded files and documents</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRequestDeletion}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete My Account'
                  )}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
