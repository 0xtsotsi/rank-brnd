/**
 * Navigation type definitions for the application
 * Defines the structure for sidebar navigation items and menus
 */

export interface NavItem {
  /** Unique identifier for the navigation item */
  id: string;
  /** Display label for the navigation item */
  label: string;
  /** URL path for the navigation item */
  href: string;
  /** Icon component name (from lucide-react) */
  icon: string;
  /** Optional badge count or text */
  badge?: string | number;
  /** Whether the item is currently active */
  active?: boolean;
  /** Optional sub-items for nested navigation */
  children?: NavItem[];
  /** Whether the navigation item is disabled */
  disabled?: boolean;
}

export interface NavSection {
  /** Section title for grouping navigation items */
  title?: string;
  /** Navigation items in this section */
  items: NavItem[];
}

export interface UserMenuOption {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component name */
  icon: string;
  /** Action handler or href */
  href?: string;
  onClick?: () => void;
  /** Whether to show a divider before this item */
  divider?: boolean;
  /** Destructive action indicator */
  destructive?: boolean;
}

export interface LayoutProps {
  children: React.ReactNode;
}

export interface ShellProps extends LayoutProps {
  /** Current active path for highlighting navigation */
  currentPath?: string;
}
