'use client';

/**
 * Settings Index Page
 * Main settings page with navigation to different settings sections
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SettingCard {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const settingsCards: SettingCard[] = [
  {
    title: 'Account Settings',
    description:
      'Manage your account and personal data, including account deletion',
    href: '/dashboard/settings/account',
    icon: 'User',
  },
  {
    title: 'Team Management',
    description: 'Manage team members, roles, invitations, and permissions',
    href: '/dashboard/settings/team',
    icon: 'Users',
  },
  {
    title: 'Brand Settings',
    description: 'Configure your brand colors, tone, style guides, and logo',
    href: '/dashboard/settings/brand',
    icon: 'Palette',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account and application settings
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={cn(
              'group block p-6 bg-white dark:bg-gray-800 rounded-xl border',
              'border-gray-200 dark:border-gray-700',
              'hover:border-indigo-300 dark:hover:border-indigo-700',
              'hover:shadow-md transition-all duration-200'
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'p-3 rounded-lg',
                  'bg-indigo-50 dark:bg-indigo-900/30',
                  'text-indigo-600 dark:text-indigo-400',
                  'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50',
                  'transition-colors'
                )}
              >
                {getIcon(card.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {card.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getIcon(name: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    User: (
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
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    Users: (
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    Palette: (
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
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
  };
  return icons[name] || icons.User;
}
