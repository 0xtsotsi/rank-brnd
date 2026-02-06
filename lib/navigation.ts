/**
 * Navigation configuration for the application
 * Defines all navigation items and their structure
 */

import type { NavSection } from '@/types/navigation';

export const mainNavigation: NavSection[] = [
  {
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: 'LayoutDashboard',
      },
      {
        id: 'planner',
        label: 'Content Planner',
        href: '/dashboard/planner',
        icon: 'Calendar',
      },
      {
        id: 'keywords',
        label: 'Keywords',
        href: '/dashboard/keywords',
        icon: 'Search',
      },
      {
        id: 'articles',
        label: 'Articles',
        href: '/dashboard/articles',
        icon: 'FileText',
      },
      {
        id: 'publishing',
        label: 'Publishing',
        href: '/dashboard/publishing',
        icon: 'Send',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        href: '/dashboard/analytics',
        icon: 'BarChart3',
      },
      {
        id: 'marketplace',
        label: 'Marketplace',
        href: '/dashboard/marketplace',
        icon: 'Store',
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: '/dashboard/settings',
        icon: 'Settings',
      },
      {
        id: 'pricing',
        label: 'Pricing',
        href: '/dashboard/pricing',
        icon: 'Tag',
      },
      {
        id: 'billing',
        label: 'Billing',
        href: '/dashboard/billing',
        icon: 'CreditCard',
      },
    ],
  },
];

/**
 * Helper function to determine if a nav item is active based on current path
 */
export function isNavItemActive(
  itemHref: string,
  currentPath: string
): boolean {
  // Exact match
  if (itemHref === currentPath) return true;

  // Parent path match (e.g., /dashboard matches /dashboard/keywords)
  if (currentPath.startsWith(itemHref + '/')) return true;

  // Special case for dashboard root
  if (itemHref === '/dashboard' && currentPath === '/dashboard') return true;

  return false;
}

/**
 * Get navigation item by href
 */
export function getNavItemByHref(href: string): string | null {
  for (const section of mainNavigation) {
    for (const item of section.items) {
      if (item.href === href) return item.id;
    }
  }
  return null;
}
