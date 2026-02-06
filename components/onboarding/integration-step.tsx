'use client';

/**
 * Integration Setup Step Component
 *
 * Guides users through connecting their preferred CMS/platform.
 */

import { useState } from 'react';
import { Link2, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  popular?: boolean;
  setupTime: string;
}

const integrations: IntegrationOption[] = [
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: '🔵',
    description: 'The world&apos;s most popular CMS',
    popular: true,
    setupTime: '2 min',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    icon: '👻',
    description: 'Modern publishing platform',
    setupTime: '2 min',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    description: 'All-in-one workspace',
    popular: true,
    setupTime: '1 min',
  },
  {
    id: 'webflow',
    name: 'Webflow',
    icon: '🌊',
    description: 'No-code website builder',
    setupTime: '3 min',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛒',
    description: 'E-commerce platform',
    setupTime: '2 min',
  },
  {
    id: 'medium',
    name: 'Medium',
    icon: '✍️',
    description: 'Publishing platform',
    setupTime: '1 min',
  },
];

interface IntegrationStepProps {
  onNext: () => void;
  onSkip?: () => void;
}

export function IntegrationStep({ onNext, onSkip }: IntegrationStepProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleConnect = async () => {
    if (!selectedIntegration) return;

    setIsConnecting(true);
    // Simulate connection process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(false);
    setIsSuccess(true);
    setTimeout(() => onNext(), 1500);
  };

  if (isSuccess) {
    const integration = integrations.find((i) => i.id === selectedIntegration);
    return (
      <div className="text-center space-y-6 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 animate-bounce-in">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Connected Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your {integration?.name} account is now connected. You can publish
            articles directly from Rank.brnd.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
          <Link2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connect Your CMS
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Publish directly to your favorite platform. Choose one or skip for
          now.
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {integrations.map((integration) => (
          <button
            key={integration.id}
            onClick={() => {
              setSelectedIntegration(integration.id);
              setShowDetails(false);
            }}
            className={cn(
              'relative p-4 rounded-lg border-2 transition-all text-left',
              selectedIntegration === integration.id
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            {integration.popular && (
              <span className="absolute top-2 right-2 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                Popular
              </span>
            )}
            <span className="text-2xl mb-2 block">{integration.icon}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {integration.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {integration.description}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              ⏱️ {integration.setupTime} setup
            </p>
          </button>
        ))}
      </div>

      {/* Selected Integration Details */}
      {selectedIntegration && !showDetails && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {integrations.find((i) => i.id === selectedIntegration)?.icon}
              </span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {integrations.find((i) => i.id === selectedIntegration)?.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect via OAuth API key
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm flex items-center gap-1"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Setup Info */}
      {selectedIntegration && showDetails && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            How to connect{' '}
            {integrations.find((i) => i.id === selectedIntegration)?.name}:
          </h4>
          <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>Click the connect button below</li>
            <li>
              You&apos;ll be redirected to{' '}
              {integrations.find((i) => i.id === selectedIntegration)?.name}
            </li>
            <li>Authorize Rank.brnd to access your account</li>
            <li>That&apos;s it! You&apos;ll be redirected back here</li>
          </ol>
          <button
            onClick={() => setShowDetails(false)}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Hide details
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isConnecting}
            className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Skip for Now
          </button>
        )}
        <button
          onClick={handleConnect}
          disabled={!selectedIntegration || isConnecting}
          className={cn(
            'flex-1 px-6 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
            selectedIntegration && !isConnecting
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
        >
          {isConnecting ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="w-5 h-5" />
              Connect{' '}
              {integrations.find((i) => i.id === selectedIntegration)?.name ||
                'Platform'}
            </>
          )}
        </button>
      </div>

      {/* Note */}
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        You can add more integrations anytime from Settings
      </p>
    </div>
  );
}
