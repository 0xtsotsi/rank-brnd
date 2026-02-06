'use client';

/**
 * Platform Card Component
 * Displays a CMS platform card with connect button
 */

import type { Platform } from '@/types/integration';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/types/integration';
import { cn } from '@/lib/utils';

interface PlatformCardProps {
  platform: Platform;
  connected: boolean;
  onClick: () => void;
}

export function PlatformCard({
  platform,
  connected,
  onClick,
}: PlatformCardProps) {
  const platformClasses = PLATFORM_COLORS[platform];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative p-6 rounded-xl border-2 text-left transition-all duration-200',
        connected
          ? cn(
              'border-current',
              platformClasses.bg,
              platformClasses.text,
              platformClasses.border
            )
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
      )}
      data-testid={`platform-card-${platform}`}
    >
      {/* Status indicator */}
      {connected && (
        <div className="absolute top-3 right-3">
          <span
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              platformClasses.bg,
              platformClasses.text,
              'border',
              platformClasses.border
            )}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Connected
          </span>
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-4',
          platformClasses.bg,
          platformClasses.text
        )}
      >
        {getPlatformIcon(platform)}
      </div>

      {/* Name */}
      <h3
        className={cn(
          'text-lg font-semibold mb-1',
          connected ? 'text-inherit' : 'text-gray-900 dark:text-white'
        )}
      >
        {PLATFORM_LABELS[platform]}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-sm',
          connected
            ? 'text-inherit opacity-80'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {getPlatformDescription(platform)}
      </p>

      {/* Connect/Configure text */}
      <p
        className={cn(
          'text-sm mt-3 font-medium',
          connected
            ? 'text-inherit'
            : 'text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300'
        )}
      >
        {connected ? 'Configure →' : 'Connect →'}
      </p>
    </button>
  );
}

function getPlatformIcon(platform: Platform): string {
  const icons: Record<Platform, string> = {
    wordpress: 'W',
    webflow: 'Wf',
    shopify: 'S',
    ghost: 'Gh',
    notion: 'N',
    squarespace: 'SQ',
    wix: 'Wi',
    contentful: 'Cf',
    strapi: 'St',
    google: 'G',
    'google-search-console': 'GSC',
    custom: 'API',
  };
  return icons[platform];
}

function getPlatformDescription(platform: Platform): string {
  const descriptions: Record<Platform, string> = {
    wordpress: 'Publish articles to your WordPress site',
    webflow: 'Sync content with Webflow CMS collections',
    shopify: 'Manage product descriptions and blog posts',
    ghost: 'Publish to your Ghost publication',
    notion: 'Sync content to Notion databases',
    squarespace: 'Publish content to Squarespace websites',
    wix: 'Connect and manage Wix site content',
    contentful: 'Headless CMS integration for structured content',
    strapi: 'Open-source headless CMS integration',
    google: 'Connect to Google services',
    'google-search-console': 'Track search performance and SEO metrics',
    custom: 'Connect to any custom API endpoint',
  };
  return descriptions[platform];
}
