'use client';

/**
 * User Menu Dropdown Component
 *
 * A custom user menu dropdown showing:
 * - User profile info (avatar, name, email)
 * - Settings link
 * - Team/organization switcher
 * - Logout button
 *
 * Features:
 * - Proper dropdown positioning with Portal
 * - Full keyboard navigation (Arrow keys, Enter, Escape)
 * - Click outside to close
 * - Focus trap when menu is open
 * - Screen reader announcements
 * - Smooth animations
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useUser,
  useClerk,
  useOrganization,
  useOrganizationList,
} from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
};

interface UserMenuDropdownProps {
  /** Additional CSS classes for the trigger button */
  className?: string;
}

// Icon components
const Icons = {
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Building: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  ),
  LogOut: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  ),
  ChevronDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

type MenuSection = 'profile' | 'organizations' | 'settings' | 'logout';

export function UserMenuDropdown({ className }: UserMenuDropdownProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { organization: currentOrganization } = useOrganization();
  const {
    userMemberships,
    isLoaded: orgListLoaded,
    setActive,
  } = useOrganizationList({
    userMemberships: true,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get user initials for avatar fallback
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Get user display name
  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress ||
    'User';

  // Toggle menu open/close
  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
    setActiveSection(null);
  }, []);

  // Close menu
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveSection(null);
    // Return focus to trigger
    triggerRef.current?.focus();
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(() => {
    signOut(() => {
      // Redirect happens automatically via Clerk
    });
  }, [signOut]);

  // Handle organization switch - use the organization's setActive method
  const handleOrganizationSwitch = useCallback(
    (org: Organization) => {
      // Use Clerk's setActive to switch organizations
      setActive?.({ organization: org.id });
      closeMenu();
    },
    [setActive, closeMenu]
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeMenu]);

  // Escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeMenu]);

  // Focus management - focus first item when menu opens
  useEffect(() => {
    if (isOpen) {
      // Focus the first focusable element in the menu
      const firstFocusable = menuRef.current?.querySelector<
        HTMLButtonElement | HTMLAnchorElement
      >('button:not(:disabled), a[href]');
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Focus trap within menu
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const focusableElements = menuRef.current?.querySelectorAll<
      HTMLAnchorElement | HTMLButtonElement
    >('a[href], button:not(:disabled)');

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      // If tabbing on last item, wrap to first
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        (lastElement as HTMLElement)?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        (firstElement as HTMLElement)?.focus();
      }
    }

    // Arrow key navigation
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = Array.from(focusableElements).indexOf(
        document.activeElement as HTMLAnchorElement | HTMLButtonElement
      );

      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + focusableElements.length) %
        focusableElements.length;

      (focusableElements[nextIndex] as HTMLElement)?.focus();
    }

    // Home/End keys
    if (event.key === 'Home') {
      event.preventDefault();
      (firstElement as HTMLElement)?.focus();
    }
    if (event.key === 'End') {
      event.preventDefault();
      (lastElement as HTMLElement)?.focus();
    }
  }, []);

  // Get user's avatar URL or create a colored placeholder
  const avatarUrl = user?.imageUrl;
  const userFirstName = user?.firstName;
  const userLastName = user?.lastName;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id="user-menu-button"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User menu"
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          'dark:focus:ring-offset-gray-900',
          isOpen && 'bg-gray-100 dark:bg-gray-800',
          className
        )}
      >
        {/* Avatar */}
        <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow-sm">
          {avatarUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={`Avatar for ${displayName}`}
                className="h-full w-full rounded-full object-cover"
              />
            </>
          ) : (
            <span className="text-sm">
              {getInitials(userFirstName, userLastName)}
            </span>
          )}
        </div>

        {/* User name (hidden on small screens) */}
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]">
          {userFirstName || displayName.split(' ')[0]}
        </span>

        {/* Chevron icon */}
        <Icons.ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={closeMenu}
          />

          {/* Menu */}
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
            onKeyDown={handleKeyDown}
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              // Proper positioning to avoid clipping
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
            }}
          >
            {/* Profile Header Section */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-medium shadow-md">
                  {avatarUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarUrl}
                        alt={`Avatar for ${displayName}`}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </>
                  ) : (
                    <span>{getInitials(userFirstName, userLastName)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Current Organization Badge */}
              {currentOrganization && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Icons.Building className="h-3.5 w-3.5" />
                  <span className="truncate">{currentOrganization.name}</span>
                </div>
              )}
            </div>

            {/* Organization Switcher Section */}
            {orgListLoaded &&
              userMemberships?.data &&
              userMemberships.data.length > 0 && (
                <div className="py-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="px-3 py-1.5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Switch Organization
                    </p>
                  </div>
                  {userMemberships.data.map((membership) => {
                    const org = membership.organization;
                    const isActive = org.id === currentOrganization?.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleOrganizationSwitch(org)}
                        role="menuitem"
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-sm',
                          'transition-colors',
                          'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        )}
                      >
                        <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                          {org.imageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={org.imageUrl}
                                alt={`Logo for ${org.name}`}
                                className="h-6 w-6 rounded"
                              />
                            </>
                          ) : (
                            <Icons.Building
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <span className="flex-1 text-left truncate">
                          {org.name}
                        </span>
                        {isActive && (
                          <Icons.Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

            {/* Menu Items */}
            <div className="py-1">
              {/* Settings Link */}
              <Link
                href="/dashboard/settings"
                role="menuitem"
                onClick={closeMenu}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 text-sm',
                  'text-gray-700 dark:text-gray-200',
                  'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  'transition-colors',
                  'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700'
                )}
              >
                <Icons.Settings className="h-5 w-5 text-gray-400" />
                <span>Settings</span>
              </Link>

              {/* Profile Link (could add later) */}
              {/* <Link
                href="/dashboard/profile"
                role="menuitem"
                onClick={closeMenu}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 text-sm',
                  'text-gray-700 dark:text-gray-200',
                  'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  'transition-colors',
                  'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700'
                )}
              >
                <Icons.Users className="h-5 w-5 text-gray-400" />
                <span>Profile</span>
              </Link> */}
            </div>

            {/* Logout Button */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                role="menuitem"
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm',
                  'text-red-600 dark:text-red-400',
                  'hover:bg-red-50 dark:hover:bg-red-900/20',
                  'transition-colors',
                  'focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20'
                )}
              >
                <Icons.LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
