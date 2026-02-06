'use client';

/**
 * Activity Logs Table Component
 *
 * Displays activity logs for an organization with user information,
 * action type, resource details, and timestamps. Supports filtering
 * by action type and resource type.
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
import {
  FileText,
  Edit,
  Trash2,
  Share,
  Filter,
  Loader2,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Download,
  User as UserIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export type ActivityAction = 'create' | 'update' | 'delete' | 'publish';

interface ActivityUser {
  id: string;
  name: string;
  email: string;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string;
  user: ActivityUser;
  action: ActivityAction;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  created_at: string;
}

interface ActivityLogsTableProps {
  organizationId: string;
  currentUserId: string;
  limit?: number;
  onRefresh?: () => void;
}

export function ActivityLogsTable({
  organizationId,
  currentUserId,
  limit = 50,
  onRefresh,
}: ActivityLogsTableProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActions, setSelectedActions] = useState<ActivityAction[]>([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>(
    []
  );
  const [availableResourceTypes, setAvailableResourceTypes] = useState<
    string[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
        limit: limit.toString(),
        sort_by: 'timestamp',
        sort_order: 'desc',
      });

      if (selectedActions.length > 0) {
        selectedActions.forEach((action) => params.append('action', action));
      }

      if (selectedResourceTypes.length > 0) {
        selectedResourceTypes.forEach((type) =>
          params.append('resource_type', type)
        );
      }

      const response = await fetch(`/api/activity-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity logs');

      const data = await response.json();
      setLogs(data.activity_logs || []);
      setTotalCount(data.total || 0);

      // Extract unique resource types from the data
      const uniqueTypes = Array.from(
        new Set(
          (data.activity_logs || []).map(
            (log: ActivityLog) => log.resource_type
          )
        )
      ).sort() as string[];
      setAvailableResourceTypes(uniqueTypes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load activity logs'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organizationId, limit, selectedActions, selectedResourceTypes]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
    onRefresh?.();
  };

  const toggleActionFilter = (action: ActivityAction) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action]
    );
  };

  const toggleResourceTypeFilter = (type: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedActions([]);
    setSelectedResourceTypes([]);
  };

  const hasActiveFilters =
    selectedActions.length > 0 || selectedResourceTypes.length > 0;

  const getActionIcon = (action: ActivityAction) => {
    const icons: Record<ActivityAction, React.ReactNode> = {
      create: <Edit className="h-4 w-4" />,
      update: <FileText className="h-4 w-4" />,
      delete: <Trash2 className="h-4 w-4" />,
      publish: <Share className="h-4 w-4" />,
    };
    return icons[action] || null;
  };

  const getActionColor = (action: ActivityAction) => {
    const colors: Record<ActivityAction, string> = {
      create:
        'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300',
      update:
        'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
      delete: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300',
      publish:
        'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return (
      colors[action] ||
      'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
    );
  };

  const getActionLabel = (action: ActivityAction) => {
    const labels: Record<ActivityAction, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      publish: 'Published',
    };
    return labels[action] || action;
  };

  const getActionBadge = (action: ActivityAction) => {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${getActionColor(action)}`}
      >
        {getActionIcon(action)}
        {getActionLabel(action)}
      </span>
    );
  };

  const getResourceTypeLabel = (resourceType: string) => {
    // Convert snake_case or kebab-case to Title Case
    return resourceType
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getUserInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const getUserAvatarColor = (userId: string) => {
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-green-500 to-emerald-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-teal-500 to-green-600',
    ];
    const index =
      userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  const exportLogs = () => {
    const csv = [
      [
        'Timestamp',
        'User',
        'Email',
        'Action',
        'Resource Type',
        'Resource ID',
      ].join(','),
      ...logs.map((log) =>
        [
          new Date(log.timestamp).toISOString(),
          log.user?.name || '',
          log.user?.email || '',
          log.action,
          log.resource_type,
          log.resource_id,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Recent activity in your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
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
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                {logs.length === 0
                  ? 'No activity recorded yet.'
                  : `${totalCount.toLocaleString()} activity ${totalCount !== 1 ? 'entries' : 'entry'} in your organization.`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Resource Type Filter */}
              {availableResourceTypes.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 h-9 px-3 text-xs">
                    <Filter className="h-4 w-4 mr-2" />
                    Resource Types
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    {availableResourceTypes.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => toggleResourceTypeFilter(type)}
                        className={
                          selectedResourceTypes.includes(type)
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : ''
                        }
                      >
                        <span className="mr-2">
                          {selectedResourceTypes.includes(type) ? '✓' : ''}
                        </span>
                        {getResourceTypeLabel(type)}
                      </DropdownMenuItem>
                    ))}
                    {selectedResourceTypes.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setSelectedResourceTypes([])}
                        >
                          Clear resource filter
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Action Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 h-9 px-3 text-xs">
                  <Filter className="h-4 w-4 mr-2" />
                  Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {(
                    [
                      'create',
                      'update',
                      'delete',
                      'publish',
                    ] as ActivityAction[]
                  ).map((action) => (
                    <DropdownMenuItem
                      key={action}
                      onClick={() => toggleActionFilter(action)}
                      className={
                        selectedActions.includes(action)
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : ''
                      }
                    >
                      <span className="mr-2 flex items-center gap-2">
                        {selectedActions.includes(action) ? '✓' : ''}
                        {getActionIcon(action)}
                      </span>
                      {getActionLabel(action)}
                    </DropdownMenuItem>
                  ))}
                  {selectedActions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSelectedActions([])}>
                        Clear action filter
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedActions.map((action) => (
                <button
                  key={action}
                  onClick={() => toggleActionFilter(action)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {getActionLabel(action)}
                  <span className="ml-1 text-gray-500">&times;</span>
                </button>
              ))}
              {selectedResourceTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleResourceTypeFilter(type)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {getResourceTypeLabel(type)}
                  <span className="ml-1 text-gray-500">&times;</span>
                </button>
              ))}
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </CardHeader>

        {error && (
          <div className="px-6 pb-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          </div>
        )}

        {logs.length > 0 ? (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-full bg-gradient-to-br ${getUserAvatarColor(log.user_id)} flex items-center justify-center text-white text-sm font-medium`}
                        >
                          {getUserInitials(
                            log.user?.name || '',
                            log.user?.email || ''
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {log.user?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {log.user?.email || ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {getResourceTypeLabel(log.resource_type)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          ID: {log.resource_id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm text-right">
                      {formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(log.id);
                            }}
                          >
                            Copy Log ID
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(log.resource_id);
                            }}
                          >
                            Copy Resource ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : (
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No activity yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more activity.'
                  : 'Activity will appear here as team members interact with resources.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </>
  );
}
