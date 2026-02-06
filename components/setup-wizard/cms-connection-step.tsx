'use client';

/**
 * CMS Connection Step Component
 *
 * Guides users through connecting their content management system
 * including WordPress, Webflow, Shopify, Contentful, or custom CMS.
 */

import { useState } from 'react';
import {
  Link2,
  CheckCircle,
  Loader2,
  ExternalLink,
  Globe,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CMSIntegration, CMSProvider } from '@/types/setup-wizard';

interface CMSConnectionStepProps {
  onNext: () => void;
  onSkip?: () => void;
  initialData?: CMSIntegration;
}

const CMS_OPTIONS: Array<{
  id: CMSProvider;
  name: string;
  description: string;
  icon: string;
  popular?: boolean;
  setupUrl: string;
  requiresApiKey: boolean;
  requiresSiteUrl: boolean;
}> = [
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'The most popular CMS',
    icon: '🔵',
    popular: true,
    setupUrl: 'https://wordpress.org/plugins/rest-api/',
    requiresApiKey: false,
    requiresSiteUrl: true,
  },
  {
    id: 'webflow',
    name: 'Webflow',
    description: 'Visual website builder',
    icon: '🟣',
    popular: true,
    setupUrl:
      'https://university.webflow.com/lesson/introduction-to-the-webflow-api',
    requiresApiKey: true,
    requiresSiteUrl: true,
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce platform',
    icon: '🟢',
    popular: false,
    setupUrl: 'https://shopify.dev/api',
    requiresApiKey: true,
    requiresSiteUrl: true,
  },
  {
    id: 'contentful',
    name: 'Contentful',
    description: 'Headless CMS',
    icon: '🔶',
    popular: false,
    setupUrl: 'https://www.contentful.com/developers/docs/',
    requiresApiKey: true,
    requiresSiteUrl: true,
  },
  {
    id: 'custom',
    name: 'Custom API',
    description: 'Connect any REST API',
    icon: '⚙️',
    popular: false,
    setupUrl: '',
    requiresApiKey: true,
    requiresSiteUrl: true,
  },
];

export function CMSConnectionStep({
  onNext,
  onSkip,
  initialData,
}: CMSConnectionStepProps) {
  const [selectedProvider, setSelectedProvider] = useState<CMSProvider | null>(
    initialData?.provider || null
  );
  const [siteUrl, setSiteUrl] = useState(initialData?.siteUrl || '');
  const [apiKey, setApiKey] = useState(initialData?.apiKey || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedOption = CMS_OPTIONS.find((opt) => opt.id === selectedProvider);

  const handleTestConnection = async () => {
    if (!selectedProvider || !siteUrl) {
      setError('Please enter your site URL');
      return;
    }

    setIsTesting(true);
    setError('');
    setTestStatus('idle');

    try {
      // Simulate API test
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate successful connection
      setTestStatus('success');
    } catch (err) {
      setTestStatus('error');
      setError('Failed to connect. Please check your credentials.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProvider) {
      setError('Please select a CMS provider');
      return;
    }

    if (selectedOption?.requiresSiteUrl && !siteUrl.trim()) {
      setError('Please enter your site URL');
      return;
    }

    if (selectedOption?.requiresApiKey && !apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const integration: CMSIntegration = {
        provider: selectedProvider,
        siteUrl: siteUrl.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        connected: true,
        lastSync: new Date().toISOString(),
      };

      setIsSuccess(true);
      setTimeout(() => onNext(), 800);
    } catch (err) {
      setError('Failed to save CMS connection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            CMS Connected!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your {selectedOption?.name} integration is ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <Link2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connect Your CMS
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Link your content management system to publish articles directly.
        </p>
      </div>

      {/* CMS Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Your CMS
        </label>
        <div className="grid grid-cols-2 gap-3">
          {CMS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelectedProvider(option.id);
                setError('');
                setTestStatus('idle');
              }}
              disabled={isLoading}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all relative',
                'hover:border-gray-300 dark:hover:border-gray-600',
                selectedProvider === option.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {option.popular && (
                <span className="absolute top-2 right-2 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                  Popular
                </span>
              )}
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {option.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Connection Form */}
      {selectedProvider && selectedOption && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <span>{selectedOption.icon}</span>
                {selectedOption.name} Configuration
              </h3>
              {selectedOption.setupUrl && (
                <a
                  href={selectedOption.setupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Setup Guide
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedOption.id === 'wordpress' &&
                'Enter your WordPress site URL. We will use the WordPress REST API to publish content.'}
              {selectedOption.id === 'webflow' &&
                'Enter your Webflow site URL and API token from your account settings.'}
              {selectedOption.id === 'shopify' &&
                'Enter your Shopify store URL and API credentials from your admin panel.'}
              {selectedOption.id === 'contentful' &&
                'Enter your Contentful space ID and access token from your API keys.'}
              {selectedOption.id === 'custom' &&
                'Enter your custom API endpoint and authentication headers.'}
            </p>
          </div>

          {/* Site URL */}
          {selectedOption.requiresSiteUrl && (
            <div>
              <label
                htmlFor="siteUrl"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Site URL
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="siteUrl"
                  type="url"
                  value={siteUrl}
                  onChange={(e) => {
                    setSiteUrl(e.target.value);
                    setError('');
                    setTestStatus('idle');
                  }}
                  placeholder="https://example.com"
                  disabled={isLoading}
                  className={cn(
                    'w-full pl-12 pr-4 py-3 rounded-lg border',
                    'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    'bg-white dark:bg-gray-800',
                    'border-gray-300 dark:border-gray-600',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500',
                    'transition-colors',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>
            </div>
          )}

          {/* API Key */}
          {selectedOption.requiresApiKey && (
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {selectedOption.id === 'wordpress'
                  ? 'Application Password'
                  : 'API Key'}
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError('');
                    setTestStatus('idle');
                  }}
                  placeholder={
                    selectedOption.id === 'wordpress'
                      ? 'Enter application password'
                      : 'Enter API key'
                  }
                  disabled={isLoading}
                  className={cn(
                    'w-full pl-12 pr-4 py-3 rounded-lg border',
                    'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    'bg-white dark:bg-gray-800',
                    'border-gray-300 dark:border-gray-600',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500',
                    'transition-colors',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>
            </div>
          )}

          {/* Test Connection Button */}
          {siteUrl && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isLoading}
              className={cn(
                'w-full px-4 py-2 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2',
                testStatus === 'success'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : testStatus === 'error'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
                (isTesting || isLoading) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : testStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Connection Successful
                </>
              ) : testStatus === 'error' ? (
                'Connection Failed - Try Again'
              ) : (
                'Test Connection'
              )}
            </button>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedProvider(null)}
              disabled={isLoading}
              className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={isLoading}
                className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Skip for Now
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect CMS'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Skip button when no provider selected */}
      {!selectedProvider && onSkip && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="w-full px-6 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Skip for Now
          </button>
        </div>
      )}
    </div>
  );
}
