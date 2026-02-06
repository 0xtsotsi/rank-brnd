'use client';

/**
 * CMS Integrations Page
 * Main page for managing CMS platform connections
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Integration,
  IntegrationFormData,
  Platform,
} from '@/types/integration';
import {
  IntegrationCard,
  IntegrationDialog,
  PlatformCard,
} from '@/components/integrations';
import { cn } from '@/lib/utils';

const AVAILABLE_PLATFORMS: Platform[] = [
  'wordpress',
  'webflow',
  'shopify',
  'ghost',
  'notion',
  'squarespace',
  'wix',
  'contentful',
  'strapi',
  'custom',
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'error'
  >('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<
    Integration | undefined
  >();
  const [submitting, setSubmitting] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/integrations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  }, [search, platformFilter, statusFilter]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchIntegrations();
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [search, platformFilter, statusFilter, fetchIntegrations]);

  const handleConnect = (platform: Platform) => {
    const existing = integrations.find((i) => i.platform === platform);
    if (existing) {
      setEditingIntegration(existing);
    } else {
      setEditingIntegration(undefined);
      // Pre-fill the platform
      const newFormData: IntegrationFormData = {
        name: '',
        platform,
        auth_type: 'api_key',
        sync_interval_seconds: 3600,
        config: {},
      };
      setEditingIntegration(undefined as any);
      // We'll handle this in the dialog
    }
    setDialogOpen(true);
  };

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setDialogOpen(true);
  };

  const handleDisconnect = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/integrations?id=${integration.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setIntegrations((prev) => prev.filter((i) => i.id !== integration.id));
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
    }
  };

  const handleSave = async (data: IntegrationFormData) => {
    setSubmitting(true);
    try {
      if (editingIntegration) {
        // Update existing
        const response = await fetch('/api/integrations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingIntegration.id, ...data }),
        });
        if (response.ok) {
          const updated = await response.json();
          setIntegrations((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i))
          );
        }
      } else {
        // Create new
        const response = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          const created = await response.json();
          setIntegrations((prev) => [...prev, created]);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving integration:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async (
    integration: Integration
  ): Promise<boolean> => {
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Random success/failure for demo
    return Math.random() > 0.3;
  };

  const connectedPlatforms = new Set(integrations.map((i) => i.platform));
  const filteredIntegrations = integrations.filter((i) => {
    if (platformFilter !== 'all' && i.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="integrations-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CMS Integrations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Connect and manage your content management platforms
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
            'text-sm font-medium transition-colors',
            'bg-indigo-600 text-white',
            'hover:bg-indigo-700',
            'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
          )}
          data-testid="add-integration-button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Integration
        </button>
      </div>

      {/* Available Platforms */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Platforms
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AVAILABLE_PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform}
              platform={platform}
              connected={connectedPlatforms.has(platform)}
              onClick={() => handleConnect(platform)}
            />
          ))}
        </div>
      </section>

      {/* Active Integrations */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Integrations ({filteredIntegrations.length})
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg border',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
              data-testid="search-integrations"
            />
          </div>
          <select
            value={platformFilter}
            onChange={(e) =>
              setPlatformFilter(e.target.value as typeof platformFilter)
            }
            className={cn(
              'px-4 py-2 rounded-lg border',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'border-gray-300 dark:border-gray-600',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            )}
          >
            <option value="all">All Platforms</option>
            {AVAILABLE_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                WordPress
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className={cn(
              'px-4 py-2 rounded-lg border',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'border-gray-300 dark:border-gray-600',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            )}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Integrations Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filteredIntegrations.length === 0 ? (
          <div
            className={cn(
              'text-center py-12 px-4 rounded-xl border-2 border-dashed',
              'border-gray-300 dark:border-gray-600'
            )}
          >
            <svg
              className="mx-auto w-12 h-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {search || platformFilter !== 'all' || statusFilter !== 'all'
                ? 'No integrations found'
                : 'No integrations yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {search || platformFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Connect a CMS platform above to get started'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onEdit={handleEdit}
                onDisconnect={handleDisconnect}
                onTest={handleTestConnection}
              />
            ))}
          </div>
        )}
      </section>

      {/* Dialog */}
      <IntegrationDialog
        integration={editingIntegration}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
