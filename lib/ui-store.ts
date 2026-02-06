'use client';

/**
 * UI Store
 *
 * Client-side state management for UI preferences using Zustand.
 * Handles theme, sidebar collapse state, and product selection with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIStore, ThemeMode, SelectedProduct } from '@/types/ui-store';
import { defaultUIState, UI_STORAGE_KEY } from '@/types/ui-store';

/**
 * Get the effective theme (resolving 'system' to actual theme)
 */
function getEffectiveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme !== 'system') return theme;

  // Check system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  return 'light';
}

/**
 * Apply theme to document
 */
function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;

  const effectiveTheme = getEffectiveTheme(theme);
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);

  // Also set data-theme attribute for additional styling hooks
  root.setAttribute('data-theme', effectiveTheme);
}

/**
 * Create the UI store with persistence
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...defaultUIState,

      // Theme actions
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        let newTheme: ThemeMode;

        if (currentTheme === 'system') {
          // If currently system, switch to the opposite of effective theme
          newTheme = getEffectiveTheme('system') === 'dark' ? 'light' : 'dark';
        } else {
          // Toggle between light and dark
          newTheme = currentTheme === 'light' ? 'dark' : 'light';
        }

        set({ theme: newTheme });
        applyTheme(newTheme);
      },

      // Sidebar actions
      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      // Product selection actions
      setSelectedProduct: (product: SelectedProduct | null) => {
        set({ selectedProduct: product });
      },

      // Mobile sidebar actions
      setMobileSidebarOpen: (open: boolean) => {
        set({ mobileSidebarOpen: open });
      },

      toggleMobileSidebar: () => {
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen }));
      },

      // Reset action
      resetUIState: () => {
        set(defaultUIState);
        applyTheme(defaultUIState.theme);
      },
    }),
    {
      name: UI_STORAGE_KEY,
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(name);
        },
      },
      // Apply theme on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
      skipHydration: true,
      // Only persist specific fields
      partialize: (state) => {
        const { mobileSidebarOpen, ...persistedState } = state;
        return persistedState as any;
      },
    }
  )
);

/**
 * Hook to get the effective theme (resolves 'system' to 'light' or 'dark')
 */
export function useEffectiveTheme(): 'light' | 'dark' {
  const theme = useUIStore((state) => state.theme);
  return getEffectiveTheme(theme);
}

/**
 * Initialize theme on app mount (should be called once in root layout)
 */
export function initializeTheme() {
  if (typeof window === 'undefined') return;

  // Get stored theme or use default
  const stored = localStorage.getItem(UI_STORAGE_KEY);
  const theme = stored
    ? JSON.parse(stored).state?.theme || defaultUIState.theme
    : defaultUIState.theme;

  applyTheme(theme);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const currentState = useUIStore.getState();
    if (currentState.theme === 'system') {
      applyTheme('system');
    }
  };

  mediaQuery.addEventListener('change', handler);

  // Return cleanup function
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Selector hooks for optimized re-renders
 */
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarCollapsed = () =>
  useUIStore((state) => state.sidebarCollapsed);
export const useSelectedProduct = () =>
  useUIStore((state) => state.selectedProduct);
export const useMobileSidebarOpen = () =>
  useUIStore((state) => state.mobileSidebarOpen);

// Action hooks
export const useSetTheme = () => useUIStore((state) => state.setTheme);
export const useToggleTheme = () => useUIStore((state) => state.toggleTheme);
export const useSetSidebarCollapsed = () =>
  useUIStore((state) => state.setSidebarCollapsed);
export const useToggleSidebar = () =>
  useUIStore((state) => state.toggleSidebar);
export const useSetSelectedProduct = () =>
  useUIStore((state) => state.setSelectedProduct);
export const useSetMobileSidebarOpen = () =>
  useUIStore((state) => state.setMobileSidebarOpen);
export const useToggleMobileSidebar = () =>
  useUIStore((state) => state.toggleMobileSidebar);
