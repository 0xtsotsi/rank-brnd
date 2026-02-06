/**
 * UI Store Types
 *
 * Type definitions for the Zustand UI state management store.
 * Handles theme, sidebar collapse, and product selection preferences.
 */

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Product selection for multi-tenant/organization scenarios
 */
export interface SelectedProduct {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
}

/**
 * UI State interface
 */
export interface UIState {
  /** Theme preference */
  theme: ThemeMode;
  /** Whether sidebar is collapsed (icon-only mode) */
  sidebarCollapsed: boolean;
  /** Currently selected product/organization */
  selectedProduct: SelectedProduct | null;
  /** Mobile sidebar open state */
  mobileSidebarOpen: boolean;
}

/**
 * UI Actions interface
 */
export interface UIActions {
  /** Set theme mode */
  setTheme: (theme: ThemeMode) => void;
  /** Toggle between light and dark mode */
  toggleTheme: () => void;
  /** Set sidebar collapsed state */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Toggle sidebar collapsed state */
  toggleSidebar: () => void;
  /** Set selected product */
  setSelectedProduct: (product: SelectedProduct | null) => void;
  /** Set mobile sidebar open state */
  setMobileSidebarOpen: (open: boolean) => void;
  /** Toggle mobile sidebar */
  toggleMobileSidebar: () => void;
  /** Reset all UI state to defaults */
  resetUIState: () => void;
}

/**
 * Combined UI store interface
 */
export type UIStore = UIState & UIActions;

/**
 * Default UI state values
 */
export const defaultUIState: UIState = {
  theme: 'system',
  sidebarCollapsed: false,
  selectedProduct: null,
  mobileSidebarOpen: false,
};

/**
 * Local storage key for UI preferences
 */
export const UI_STORAGE_KEY = 'rankbrnd_ui_preferences';
