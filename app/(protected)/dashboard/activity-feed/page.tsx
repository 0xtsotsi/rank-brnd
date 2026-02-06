'use client';

/**
 * Activity Feed Page
 *
 * Displays recent team activities including article creation, publishing,
 * and configuration changes with timestamps and user names.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityLogsTable } from '@/components/activity-feed';

interface SessionData {
  userId: string | null;
  orgId: string | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    tier: string;
  }>;
  email?: string;
  fullName?: string | null;
}

export default function ActivityFeedPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current user and organization data
    const fetchData = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/sign-in');
            return;
          }
          throw new Error('Failed to fetch session');
        }
        const data = await response.json();
        setSessionData(data);

        if (!data.userId) {
          router.push('/sign-in');
          return;
        }

        // Check if user has organizations
        const hasOrg =
          data.orgId || (data.organizations && data.organizations.length > 0);
        if (!hasOrg) {
          setError(
            'No organization found. Please create an organization first.'
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading activity feed...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Activity
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const organizationId =
    sessionData?.orgId || (sessionData?.organizations?.[0]?.id ?? null);
  const userId = sessionData?.userId ?? null;

  if (!organizationId || !userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Organization Found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You need to be part of an organization to view the activity feed.
          </p>
          <button
            onClick={() => router.push('/setup-wizard')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Organization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Activity Feed
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track recent team activities, changes, and events across your
          organization.
        </p>
      </div>

      {/* Activity Logs Table */}
      <ActivityLogsTable
        organizationId={organizationId}
        currentUserId={userId}
        limit={50}
      />
    </div>
  );
}
