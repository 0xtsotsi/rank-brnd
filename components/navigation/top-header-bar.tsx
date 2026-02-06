'use client';

/**
 * Top Header Bar Component
 *
 * A responsive header bar with search functionality, notifications,
 * and custom user menu dropdown with profile info, settings link,
 * team switcher, and logout button.
 *
 * Uses Zustand store for theme toggle functionality.
 */

import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useToggleTheme, useTheme, useEffectiveTheme } from '@/lib/ui-store';
import { UserMenuDropdown } from './user-menu-dropdown';

interface HeaderBarProps {
  /** Optional title to display in the header */
  title?: string;
  /** Breadcrumb items to display */
  breadcrumbs?: { label: string; href?: string }[];
}

// Simple icon components
const Icons = {
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Sun: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41-1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  Moon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  Monitor: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  ),
  Bell: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  HelpCircle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
};

export function TopHeaderBar({ title, breadcrumbs = [] }: HeaderBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const toggleTheme = useToggleTheme();
  const theme = useTheme();
  const effectiveTheme = useEffectiveTheme();

  // Determine which icon to show based on theme
  const ThemeIcon =
    theme === 'system'
      ? Icons.Monitor
      : effectiveTheme === 'dark'
        ? Icons.Sun
        : Icons.Moon;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-all duration-300',
        // Adjust for collapsed sidebar
        'lg:ml-0'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side: Breadcrumbs and Title */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {breadcrumbs.length > 0 && (
            <nav
              className="hidden sm:flex items-center gap-2 text-sm"
              aria-label="Breadcrumb"
            >
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && (
                    <Icons.ChevronRight
                      className="h-4 w-4 text-gray-400 dark:text-gray-500"
                      aria-hidden="true"
                    />
                  )}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="font-medium text-gray-900 dark:text-white">
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          )}
          {title && !breadcrumbs.length && (
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Right Side: Search, Notifications, User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Search - Hidden on mobile */}
          <div className="hidden md:block relative">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border transition-all duration-200',
                'bg-gray-50 dark:bg-gray-800',
                'border-gray-300 dark:border-gray-700',
                searchFocused &&
                  'ring-2 ring-indigo-500 border-indigo-500 dark:border-indigo-400'
              )}
            >
              <Icons.Search
                className="h-4 w-4 text-gray-400 ml-3"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 py-2 pr-3 w-48 lg:w-64"
                aria-label="Search"
              />
            </div>
          </div>

          {/* Notifications Button */}
          <button
            type="button"
            className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors tap-highlight-none"
            aria-label="View notifications"
          >
            <Icons.Bell className="h-5 w-5" aria-hidden="true" />
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"
              aria-label="Unread notifications"
            />
          </button>

          {/* Help Button */}
          <a
            href="https://docs.rank.brnd"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors tap-highlight-none"
            aria-label="Get help (opens in new tab)"
          >
            <Icons.HelpCircle className="h-5 w-5" aria-hidden="true" />
          </a>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors tap-highlight-none"
            onClick={toggleTheme}
            aria-label={`Toggle theme (current: ${theme})`}
            title={`Current theme: ${theme}${theme === 'system' ? ` (${effectiveTheme})` : ''}`}
          >
            <ThemeIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* User Menu Dropdown */}
          <UserMenuDropdown />
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-3">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border transition-all duration-200',
            'bg-gray-50 dark:bg-gray-800',
            'border-gray-300 dark:border-gray-700',
            searchFocused &&
              'ring-2 ring-indigo-500 border-indigo-500 dark:border-indigo-400'
          )}
        >
          <Icons.Search
            className="h-4 w-4 text-gray-400 ml-3"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 py-2 pr-3 flex-1"
            aria-label="Search"
          />
        </div>
      </div>
    </header>
  );
}
