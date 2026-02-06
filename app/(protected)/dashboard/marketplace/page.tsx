'use client';

/**
 * Backlink Marketplace Page
 * Main page for the backlink exchange marketplace
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  MarketplaceSite,
  MarketplaceFilters,
  ExchangeRequest,
  ExchangeRequestFormData,
} from '@/types/backlink-marketplace';
import { MarketplaceFilters as MarketplaceFiltersComponent } from '@/components/backlink-marketplace/marketplace-filters';
import { SitesTable } from '@/components/backlink-marketplace/sites-table';
import { ExchangeRequestDialog } from '@/components/backlink-marketplace/exchange-request-dialog';
import { ApprovalPanel } from '@/components/backlink-marketplace/approval-panel';
import { cn } from '@/lib/utils';
import {
  Store,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';

const defaultFilters: MarketplaceFilters = {
  search: '',
  min_da: undefined,
  max_da: undefined,
  min_pa: undefined,
  max_pa: undefined,
  max_spam_score: undefined,
  min_quality_score: undefined,
  niches: [],
  categories: [],
  min_traffic: undefined,
  language: 'en',
  region: '',
  max_credits: undefined,
  sort: 'quality_score',
  order: 'desc',
};

type ViewMode = 'browse' | 'requests';

export default function MarketplacePage() {
  const [sites, setSites] = useState<MarketplaceSite[]>([]);
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [userCredits, setUserCredits] = useState(100);
  const [userArticles, setUserArticles] = useState<
    Array<{ id: string; title: string; slug: string }>
  >([]);
  const [filters, setFilters] = useState<MarketplaceFilters>(defaultFilters);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('browse');

  // Dialog states
  const [selectedSite, setSelectedSite] = useState<MarketplaceSite | null>(
    null
  );
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Fetch marketplace sites
  const fetchSites = useCallback(async () => {
    setIsLoadingSites(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.min_da !== undefined)
        params.append('min_da', filters.min_da.toString());
      if (filters.max_da !== undefined)
        params.append('max_da', filters.max_da.toString());
      if (filters.max_spam_score !== undefined)
        params.append('max_spam_score', filters.max_spam_score.toString());
      if (filters.min_quality_score !== undefined)
        params.append(
          'min_quality_score',
          filters.min_quality_score.toString()
        );
      if (filters.niches.length > 0)
        params.append('niches', filters.niches.join(','));
      if (filters.language) params.append('language', filters.language);
      if (filters.region) params.append('region', filters.region);
      if (filters.max_credits !== undefined)
        params.append('max_credits', filters.max_credits.toString());
      if (filters.min_traffic !== undefined)
        params.append('min_traffic', filters.min_traffic.toString());
      params.append('sort', filters.sort);
      params.append('order', filters.order);

      const response = await fetch(
        `/api/marketplace/sites?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch marketplace sites');
      }

      const data = await response.json();
      setSites(data.sites || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sites');
      setSites([]);
    } finally {
      setIsLoadingSites(false);
    }
  }, [filters]);

  // Fetch exchange requests
  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);

    try {
      const response = await fetch('/api/marketplace/requests');

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSites();
    fetchRequests();

    // Fetch user articles for the dialog
    fetch('/api/articles?limit=50')
      .then((res) => res.json())
      .then((data) => {
        setUserArticles(data.articles || []);
      })
      .catch(() => {
        // Articles are optional, continue without them
        setUserArticles([]);
      });
  }, [fetchSites, fetchRequests]);

  // Handle filters change
  const handleFiltersChange = (newFilters: MarketplaceFilters) => {
    setFilters(newFilters);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  // Handle site selection for exchange request
  const handleSiteSelect = (site: MarketplaceSite) => {
    setSelectedSite(site);
    setShowRequestDialog(true);
  };

  // Handle exchange request submission
  const handleSubmitRequest = async (
    data: ExchangeRequestFormData
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/marketplace/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit request');
      }

      const result = await response.json();

      // Update user credits
      if (result.credits_remaining !== undefined) {
        setUserCredits(result.credits_remaining);
      }

      // Refresh both sites and requests
      await Promise.all([fetchSites(), fetchRequests()]);

      // Show success message
      setSuccessMessage('Exchange request submitted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      return true;
    } catch (err) {
      console.error('Error submitting request:', err);
      return false;
    }
  };

  // Handle request approval
  const handleApprove = async (requestId: string) => {
    try {
      const response = await fetch(
        `/api/marketplace/requests/${requestId}/approve`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      await fetchRequests();
      setSuccessMessage('Request approved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error approving request:', err);
    }
  };

  // Handle request rejection
  const handleReject = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(
        `/api/marketplace/requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      await fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  // Handle request cancellation
  const handleCancel = async (requestId: string) => {
    try {
      const response = await fetch(
        `/api/marketplace/requests/${requestId}/cancel`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel request');
      }

      await fetchRequests();
      setSuccessMessage('Request cancelled');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error cancelling request:', err);
    }
  };

  // Calculate stats
  const stats = {
    availableSites: sites.filter((s) => s.available).length,
    pendingRequests: requests.filter((r) => r.status === 'pending').length,
    approvedRequests: requests.filter((r) =>
      ['approved', 'in_progress', 'completed'].includes(r.status)
    ).length,
    avgQuality:
      sites.length > 0
        ? Math.round(
            sites.reduce((sum, s) => sum + s.quality_score, 0) / sites.length
          )
        : 0,
  };

  return (
    <div className="space-y-6 fade-in" data-testid="marketplace-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Backlink Marketplace
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse and request backlinks from quality sites
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchSites();
              fetchRequests();
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'border border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-900 dark:text-red-300">Error</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded"
          >
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-400">
            {successMessage}
          </p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded"
          >
            <X className="h-3 w-3 text-green-600 dark:text-green-400" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Available Sites"
          value={stats.availableSites}
          icon={Store}
          color="indigo"
        />
        <StatCard
          label="Your Credits"
          value={userCredits}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Pending Requests"
          value={stats.pendingRequests}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Approved Exchanges"
          value={stats.approvedRequests}
          icon={Check}
          color="emerald"
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <ViewTabButton
          active={viewMode === 'browse'}
          onClick={() => setViewMode('browse')}
        >
          Browse Sites
        </ViewTabButton>
        <ViewTabButton
          active={viewMode === 'requests'}
          onClick={() => setViewMode('requests')}
        >
          My Requests ({requests.length})
        </ViewTabButton>
      </div>

      {/* Browse View */}
      {viewMode === 'browse' && (
        <>
          {/* Filters */}
          <MarketplaceFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />

          {/* Sites Table */}
          <SitesTable
            sites={sites}
            onSiteSelect={handleSiteSelect}
            onRequestExchange={handleSiteSelect}
            userCredits={userCredits}
            isLoading={isLoadingSites}
          />
        </>
      )}

      {/* Requests View */}
      {viewMode === 'requests' && (
        <ApprovalPanel
          requests={requests}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
          userCanApprove={false} // In a real app, check user permissions
          isLoading={isLoadingRequests}
        />
      )}

      {/* Exchange Request Dialog */}
      <ExchangeRequestDialog
        isOpen={showRequestDialog}
        site={selectedSite}
        userArticles={userArticles}
        userCredits={userCredits}
        onClose={() => {
          setShowRequestDialog(false);
          setSelectedSite(null);
        }}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'green' | 'amber' | 'emerald';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      iconText: 'text-indigo-600 dark:text-indigo-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      iconText: 'text-green-600 dark:text-green-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      iconText: 'text-amber-600 dark:text-amber-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconText: 'text-emerald-600 dark:text-emerald-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        classes.bg,
        'border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', classes.iconBg)}>
          <Icon className={cn('h-5 w-5', classes.iconText)} />
        </div>
        <div>
          <p className={cn('text-2xl font-bold', classes.text)}>{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface ViewTabButtonProps {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

function ViewTabButton({ active, children, onClick }: ViewTabButtonProps) {
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
    </button>
  );
}
