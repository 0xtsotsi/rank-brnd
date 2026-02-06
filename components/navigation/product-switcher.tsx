'use client';

/**
 * Product Switcher Component
 *
 * A dropdown component to switch between products/websites.
 * Features:
 * - Fetches products from the API
 * - Stores selection in Zustand and localStorage
 * - Shows current product in trigger button
 * - Full keyboard navigation
 * - Click outside to close
 * - Loading and empty states
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  useSelectedProduct,
  useSetSelectedProduct,
  useSidebarCollapsed,
} from '@/lib/ui-store';
import type { SelectedProduct } from '@/types/ui-store';

// Icon components
const Icons = {
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
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
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
  Loader: (props: React.SVGProps<SVGSVGElement>) => (
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface ProductSwitcherProps {
  /** Additional CSS classes */
  className?: string;
}

export function ProductSwitcher({ className }: ProductSwitcherProps) {
  const selectedProduct = useSelectedProduct();
  const setSelectedProduct = useSetSelectedProduct();
  const collapsed = useSidebarCollapsed();

  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?status=active');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);

          // Auto-select first product if none selected
          if (data.products?.length > 0 && !selectedProduct) {
            const firstProduct = data.products[0];
            setSelectedProduct({
              id: firstProduct.id,
              name: firstProduct.name,
              slug: firstProduct.slug,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [selectedProduct, setSelectedProduct]);

  // Toggle menu
  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close menu
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Handle product selection
  const handleSelectProduct = useCallback(
    (product: Product) => {
      const selection: SelectedProduct = {
        id: product.id,
        name: product.name,
        slug: product.slug,
      };
      setSelectedProduct(selection);
      closeMenu();
    },
    [setSelectedProduct, closeMenu]
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

  // Focus trap
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const focusableElements =
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)'
      );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    // Arrow key navigation
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = Array.from(focusableElements).indexOf(
        document.activeElement as HTMLButtonElement
      );

      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + focusableElements.length) %
        focusableElements.length;

      focusableElements[nextIndex]?.focus();
    }
  }, []);

  // Get display name for trigger
  const getDisplayName = () => {
    if (selectedProduct) return selectedProduct.name;
    if (isLoading) return 'Loading...';
    if (products.length === 0) return 'No products';
    return 'Select product';
  };

  const displayName = getDisplayName();

  // Collapsed mode - show icon only
  if (collapsed) {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id="product-switcher-button"
          onClick={toggleMenu}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Switch product"
          className={cn(
            'flex w-full items-center justify-center rounded-lg p-2 transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            'dark:focus:ring-offset-gray-900',
            isOpen && 'bg-gray-100 dark:bg-gray-800',
            className
          )}
        >
          <Icons.Building
            className="h-5 w-5 text-gray-600 dark:text-gray-400"
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden="true"
              onClick={closeMenu}
            />
            <div
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="product-switcher-button"
              onKeyDown={handleKeyDown}
              className="absolute left-full top-0 ml-2 z-50 w-56 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in-0 zoom-in-95 duration-150"
              style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
            >
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Products
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Icons.Loader className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : products.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No products found
                </div>
              ) : (
                products.map((product) => {
                  const isActive = product.id === selectedProduct?.id;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
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
                      <Icons.Building
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-left truncate">
                        {product.name}
                      </span>
                      {isActive && (
                        <Icons.Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  );
                })
              )}

              <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    // Navigate to products page to create new
                    window.location.href = '/dashboard/products';
                  }}
                  role="menuitem"
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-sm',
                    'text-gray-600 dark:text-gray-400',
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    'transition-colors',
                    'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700'
                  )}
                >
                  <Icons.Plus className="h-4 w-4" />
                  <span>Add product</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full mode - show dropdown
  return (
    <div className="relative px-3 py-2">
      <button
        ref={triggerRef}
        type="button"
        id="product-switcher-button"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Switch product"
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
          'bg-gray-50 dark:bg-gray-800/50',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          'dark:focus:ring-offset-gray-900',
          'text-gray-700 dark:text-gray-200',
          isOpen && 'ring-2 ring-indigo-500',
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icons.Building
            className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
          <span className="truncate font-medium">{displayName}</span>
        </div>
        <Icons.ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={closeMenu}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="product-switcher-button"
            onKeyDown={handleKeyDown}
            className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
          >
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Switch Product
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Icons.Loader className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No products found. Create one to get started.
              </div>
            ) : (
              products.map((product) => {
                const isActive = product.id === selectedProduct?.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
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
                    <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                      <Icons.Building className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="flex-1 text-left truncate">
                      {product.name}
                    </span>
                    {isActive && (
                      <Icons.Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                );
              })
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/dashboard/products';
                }}
                role="menuitem"
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm',
                  'text-indigo-600 dark:text-indigo-400',
                  'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                  'transition-colors',
                  'focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20'
                )}
              >
                <Icons.Plus className="h-4 w-4" />
                <span className="font-medium">Add new product</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
