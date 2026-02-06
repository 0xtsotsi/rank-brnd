'use client';

/**
 * Approval Panel Component
 * Panel for reviewing and managing exchange requests
 */

import { useState } from 'react';
import type {
  ExchangeRequest,
  ExchangeRequestStatus,
} from '@/types/backlink-marketplace';
import {
  EXCHANGE_STATUS_LABELS,
  EXCHANGE_STATUS_COLORS,
} from '@/types/backlink-marketplace';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Clock,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';

interface ApprovalPanelProps {
  requests: ExchangeRequest[];
  onApprove?: (requestId: string) => Promise<void>;
  onReject?: (requestId: string, reason: string) => Promise<void>;
  onCancel?: (requestId: string) => Promise<void>;
  userCanApprove: boolean;
  isLoading?: boolean;
  className?: string;
}

type TabType = 'pending' | 'approved' | 'all';

export function ApprovalPanel({
  requests,
  onApprove,
  onReject,
  onCancel,
  userCanApprove,
  isLoading = false,
  className,
}: ApprovalPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(
    new Set()
  );
  const [rejectDialog, setRejectDialog] = useState<{
    id: string;
    reason: string;
  } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  // Filter requests by tab
  const filteredRequests = requests.filter((req) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return req.status === 'pending';
    if (activeTab === 'approved')
      return ['approved', 'in_progress', 'completed'].includes(req.status);
    return true;
  });

  // Toggle request expansion
  const toggleExpansion = (id: string) => {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRequests(newExpanded);
  };

  // Handle approve
  const handleApprove = async (id: string) => {
    await onApprove?.(id);
    setActionMenu(null);
  };

  // Handle reject - open dialog
  const handleRejectClick = (id: string) => {
    setRejectDialog({ id, reason: '' });
    setActionMenu(null);
  };

  // Confirm rejection
  const confirmReject = async () => {
    if (rejectDialog) {
      await onReject?.(rejectDialog.id, rejectDialog.reason);
      setRejectDialog(null);
    }
  };

  // Handle cancel
  const handleCancel = async (id: string) => {
    await onCancel?.(id);
    setActionMenu(null);
  };

  // Count by status
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) =>
    ['approved', 'in_progress', 'completed'].includes(r.status)
  ).length;

  return (
    <div
      className={cn('approval-panel', className)}
      data-testid="approval-panel"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={activeTab === 'pending'}
          count={pendingCount}
          onClick={() => setActiveTab('pending')}
        >
          Pending Review
        </TabButton>
        <TabButton
          active={activeTab === 'approved'}
          count={approvedCount}
          onClick={() => setActiveTab('approved')}
        >
          Approved
        </TabButton>
        <TabButton
          active={activeTab === 'all'}
          count={requests.length}
          onClick={() => setActiveTab('all')}
        >
          All Requests
        </TabButton>
      </div>

      {/* Requests List */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="mx-auto h-10 w-10 opacity-20 mb-2" />
            <p className="font-medium">No requests found</p>
            <p className="text-sm">
              {activeTab === 'pending' && 'No pending requests to review'}
              {activeTab === 'approved' && 'No approved requests yet'}
              {activeTab === 'all' && 'No exchange requests yet'}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const statusColors = EXCHANGE_STATUS_COLORS[request.status];
            const isExpanded = expandedRequests.has(request.id);
            const isPending = request.status === 'pending';
            const showActionMenu = actionMenu === request.id;

            return (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                data-request-id={request.id}
              >
                {/* Request Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleExpansion(request.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {request.marketplace_site.title}
                        </p>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                            statusColors.bg,
                            statusColors.text,
                            statusColors.border,
                            'border'
                          )}
                        >
                          {EXCHANGE_STATUS_LABELS[request.status]}
                        </span>
                      </div>
                      <a
                        href={request.marketplace_site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {request.marketplace_site.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Target:{' '}
                        <a
                          href={request.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {request.target_url}
                        </a>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick Actions for pending */}
                      {isPending && userCanApprove && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(request.id);
                            }}
                            className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectClick(request.id);
                            }}
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {/* Expand/Collapse */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpansion(request.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {/* Credits */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">
                          Credits Used
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {request.credits_used} credits
                        </p>
                      </div>

                      {/* Created At */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">
                          Requested
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Anchor Text */}
                      {request.anchor_text && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">
                            Anchor Text
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {request.anchor_text}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {request.notes && (
                        <div className="md:col-span-2">
                          <p className="text-gray-500 dark:text-gray-400">
                            Notes
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {request.notes}
                          </p>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {request.status === 'rejected' &&
                        request.rejection_reason && (
                          <div className="md:col-span-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-red-600 dark:text-red-400 text-xs font-medium uppercase mb-1">
                              Rejection Reason
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              {request.rejection_reason}
                            </p>
                          </div>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Timeline
                      </p>
                      <div className="space-y-1 text-xs">
                        <TimelineStep
                          label="Request submitted"
                          date={request.created_at}
                          status="complete"
                        />
                        {request.approved_at && (
                          <TimelineStep
                            label="Approved"
                            date={request.approved_at}
                            status="complete"
                          />
                        )}
                        {request.completed_at && (
                          <TimelineStep
                            label="Completed"
                            date={request.completed_at}
                            status="complete"
                          />
                        )}
                        {request.status === 'pending' && (
                          <TimelineStep
                            label="Waiting for approval"
                            date={request.created_at}
                            status="pending"
                          />
                        )}
                      </div>
                    </div>

                    {/* Additional Actions */}
                    {isPending && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          Cancel this request
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rejection Dialog */}
      {rejectDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setRejectDialog(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Reject Request
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Please provide a reason for rejecting this exchange request.
                </p>
              </div>
            </div>

            <textarea
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog({ ...rejectDialog, reason: e.target.value })
              }
              placeholder="Enter the reason for rejection..."
              rows={3}
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-red-500',
                'transition-colors resize-none mb-4'
              )}
              autoFocus
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectDialog(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectDialog.reason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  count: number;
  children: React.ReactNode;
  onClick: () => void;
}

function TabButton({ active, count, children, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
        active
          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      )}
    >
      {children}
      {count > 0 && (
        <span
          className={cn(
            'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
            active
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface TimelineStepProps {
  label: string;
  date: string;
  status: 'complete' | 'pending';
}

function TimelineStep({ label, date, status }: TimelineStepProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'complete' ? 'bg-green-500' : 'bg-yellow-500'
        )}
      />
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-gray-500 dark:text-gray-500 ml-auto">
        {new Date(date).toLocaleDateString()}
      </span>
    </div>
  );
}
