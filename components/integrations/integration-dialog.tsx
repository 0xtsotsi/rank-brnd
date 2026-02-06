'use client';

/**
 * Integration Dialog Component
 * Modal dialog for adding/editing CMS integrations
 */

import { useState, useEffect } from 'react';
import type {
  Integration,
  IntegrationFormData,
  Platform,
  AuthType,
} from '@/types/integration';
import {
  PLATFORM_LABELS,
  AUTH_TYPE_LABELS,
  DEFAULT_SYNC_INTERVAL,
} from '@/types/integration';
import { cn } from '@/lib/utils';

interface IntegrationDialogProps {
  integration?: Integration;
  open: boolean;
  onClose: () => void;
  onSave: (data: IntegrationFormData) => void;
}

export function IntegrationDialog({
  integration,
  open,
  onClose,
  onSave,
}: IntegrationDialogProps) {
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: '',
    platform: 'wordpress',
    auth_type: 'api_key',
    sync_interval_seconds: DEFAULT_SYNC_INTERVAL,
    config: {},
  });

  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        description: integration.description || '',
        platform: integration.platform as Platform,
        product_id: integration.product_id || '',
        auth_type: integration.auth_type,
        auth_token: integration.auth_token || '',
        refresh_token: integration.refresh_token || '',
        config: integration.config,
        sync_interval_seconds: integration.sync_interval_seconds,
      });
    } else {
      setFormData({
        name: '',
        platform: 'wordpress',
        auth_type: 'api_key',
        sync_interval_seconds: DEFAULT_SYNC_INTERVAL,
        config: {},
      });
    }
  }, [integration, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const updateField = <K extends keyof IntegrationFormData>(
    key: K,
    value: IntegrationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateConfig = <
    K extends keyof NonNullable<IntegrationFormData['config']>,
  >(
    key: K,
    value: NonNullable<IntegrationFormData['config']>[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      data-testid="integration-dialog-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="integration-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {integration ? 'Configure Integration' : 'Connect New Platform'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            data-testid="close-dialog"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Platform *
            </label>
            <select
              value={formData.platform}
              onChange={(e) =>
                updateField('platform', e.target.value as Platform)
              }
              disabled={!!integration}
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                integration
                  ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed'
                  : ''
              )}
              data-testid="platform-select"
            >
              <option value="wordpress">WordPress</option>
              <option value="webflow">Webflow</option>
              <option value="shopify">Shopify</option>
              <option value="ghost">Ghost</option>
              <option value="notion">Notion</option>
              <option value="squarespace">Squarespace</option>
              <option value="wix">Wix</option>
              <option value="contentful">Contentful</option>
              <option value="strapi">Strapi</option>
              <option value="custom">Custom API</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Integration Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="My Blog"
              required
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500'
              )}
              data-testid="integration-name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Optional description for this integration"
              rows={2}
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500'
              )}
            />
          </div>

          {/* Platform-specific fields */}
          {renderPlatformFields(
            formData.platform,
            formData.config,
            updateConfig
          )}

          {/* Authentication Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Authentication Method
            </label>
            <select
              value={formData.auth_type}
              onChange={(e) =>
                updateField('auth_type', e.target.value as AuthType)
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            >
              <option value="api_key">API Key</option>
              <option value="bearer_token">Bearer Token</option>
              <option value="basic_auth">Basic Auth</option>
              <option value="oauth">OAuth</option>
            </select>
          </div>

          {/* API Key / Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {formData.auth_type === 'api_key'
                ? 'API Key'
                : formData.auth_type === 'bearer_token'
                  ? 'Bearer Token'
                  : formData.auth_type === 'basic_auth'
                    ? 'Password'
                    : 'Client Secret'}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.auth_token}
                onChange={(e) => updateField('auth_token', e.target.value)}
                placeholder={
                  formData.auth_type === 'oauth'
                    ? 'OAuth client secret'
                    : 'Enter your credentials'
                }
                className={cn(
                  'w-full px-3 py-2 pr-10 rounded-lg border',
                  'bg-white dark:bg-gray-700',
                  'text-gray-900 dark:text-white',
                  'border-gray-300 dark:border-gray-600',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                )}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showApiKey ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Sync Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sync Interval
            </label>
            <select
              value={formData.sync_interval_seconds?.toString()}
              onChange={(e) =>
                updateField('sync_interval_seconds', parseInt(e.target.value))
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            >
              <option value="300">Every 5 minutes</option>
              <option value="900">Every 15 minutes</option>
              <option value="1800">Every 30 minutes</option>
              <option value="3600">Every hour</option>
              <option value="7200">Every 2 hours</option>
              <option value="21600">Every 6 hours</option>
              <option value="43200">Every 12 hours</option>
              <option value="86400">Every day</option>
              <option value="604800">Every week</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg',
                'text-sm font-medium transition-colors',
                'bg-gray-100 dark:bg-gray-700',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                'flex-1 px-4 py-2 rounded-lg',
                'text-sm font-medium transition-colors',
                'bg-indigo-600 text-white',
                'hover:bg-indigo-700',
                'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              )}
              data-testid="save-integration"
            >
              {integration ? 'Save Changes' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderPlatformFields(
  platform: Platform,
  config: IntegrationFormData['config'] = {},
  updateConfig: <K extends keyof NonNullable<IntegrationFormData['config']>>(
    key: K,
    value: NonNullable<IntegrationFormData['config']>[K]
  ) => void
) {
  switch (platform) {
    case 'wordpress':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site URL *
            </label>
            <input
              type="url"
              value={config.siteUrl || ''}
              onChange={(e) => updateConfig('siteUrl', e.target.value)}
              placeholder="https://myblog.com"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
          </div>
        </>
      );

    case 'webflow':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site ID *
            </label>
            <input
              type="text"
              value={config.siteId || ''}
              onChange={(e) => updateConfig('siteId', e.target.value)}
              placeholder="5f3d4e5e8b5b8c0012e3f4a5"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Collection ID
            </label>
            <input
              type="text"
              value={config.collectionId || ''}
              onChange={(e) => updateConfig('collectionId', e.target.value)}
              placeholder="Optional collection ID"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
          </div>
        </>
      );

    case 'shopify':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shop Domain *
            </label>
            <input
              type="text"
              value={config.shopDomain || ''}
              onChange={(e) => updateConfig('shopDomain', e.target.value)}
              placeholder="my-shop.myshopify.com"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
          </div>
        </>
      );

    case 'ghost':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin URL *
            </label>
            <input
              type="url"
              value={config.adminUrl || ''}
              onChange={(e) => updateConfig('adminUrl', e.target.value)}
              placeholder="https://ghost.example.com"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
          </div>
        </>
      );

    case 'notion':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workspace ID
            </label>
            <input
              type="text"
              value={config.workspaceId || ''}
              onChange={(e) => updateConfig('workspaceId', e.target.value)}
              placeholder="Optional workspace ID"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Database ID
            </label>
            <input
              type="text"
              value={config.databaseId || ''}
              onChange={(e) => updateConfig('databaseId', e.target.value)}
              placeholder="Optional database ID"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
          </div>
        </>
      );

    default:
      return (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure your {PLATFORM_LABELS[platform]} integration using the
            authentication field above.
          </p>
        </div>
      );
  }
}
