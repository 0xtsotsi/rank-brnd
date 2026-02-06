'use client';

/**
 * Products Page
 * Main page for managing products/websites with CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import type { Product, ProductFilters } from '@/types/product';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { ProductCard } from '@/components/products/product-card';
import { cn } from '@/lib/utils';

const defaultFilters: ProductFilters = {
  search: '',
  status: 'all',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);

      const response = await fetch(`/api/products?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
      setFilteredProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle filters change
  const handleFiltersChange = (key: keyof ProductFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  // Handle open add dialog
  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setShowFormDialog(true);
  };

  // Handle open edit dialog
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowFormDialog(true);
  };

  // Handle save product
  const handleSaveProduct = async (data: any, id?: string) => {
    setIsSaving(true);

    try {
      const url = id ? '/api/products' : '/api/products';
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save product');
      }

      const savedProduct = await response.json();

      // Update local state
      if (id) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? savedProduct : p))
        );
      } else {
        setProducts((prev) => [...prev, savedProduct]);
      }

      // Refresh from server
      await fetchProducts();

      setShowFormDialog(false);
      setEditingProduct(undefined);
    } catch (err) {
      console.error('Error saving product:', err);
      alert(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (product: Product) => {
    try {
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      console.error('Error deleting product:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  // Calculate stats
  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    draft: products.filter((p) => p.status === 'pending').length,
    inactive: products.filter((p) => p.status === 'archived').length,
  };

  return (
    <div className="space-y-6 fade-in" data-testid="products-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Products & Websites
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your products and websites for content creation
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
          data-testid="add-product-button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Product
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-medium text-red-900 dark:text-red-300">
              Error loading products
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} color="indigo" />
        <StatCard label="Active" value={stats.active} color="green" />
        <StatCard label="Draft" value={stats.draft} color="amber" />
        <StatCard label="Inactive" value={stats.inactive} color="gray" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => handleFiltersChange('search', e.target.value)}
                className={cn(
                  'w-full pl-10 pr-4 py-2 rounded-lg border',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  'border-gray-300 dark:border-gray-600'
                )}
                data-testid="search-products-input"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={filters.status}
              onChange={(e) => handleFiltersChange('status', e.target.value)}
              className={cn(
                'w-full px-4 py-2 rounded-lg border',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'border-gray-300 dark:border-gray-600'
              )}
              data-testid="status-filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(filters.search || filters.status !== 'all') && (
            <button
              onClick={handleClearFilters}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                'border border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
              data-testid="clear-filters-button"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filters.search || filters.status !== 'all'
              ? 'No products found'
              : 'No products yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {filters.search || filters.status !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Get started by adding your first product or website'}
          </p>
          {!filters.search && filters.status === 'all' && (
            <button
              onClick={handleAddProduct}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium',
                'bg-indigo-600 text-white hover:bg-indigo-700'
              )}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="products-grid"
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ProductFormDialog
        isOpen={showFormDialog}
        onClose={() => {
          setShowFormDialog(false);
          setEditingProduct(undefined);
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
        isSaving={isSaving}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: 'indigo' | 'green' | 'amber' | 'gray';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      iconText: 'text-indigo-600 dark:text-indigo-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      iconText: 'text-green-600 dark:text-green-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      iconText: 'text-amber-600 dark:text-amber-400',
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      iconBg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-700 dark:text-gray-300',
      iconText: 'text-gray-600 dark:text-gray-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        classes.bg,
        'border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', classes.iconBg)}>
          <svg
            className={cn('h-5 w-5', classes.iconText)}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <div>
          <p className={cn('text-2xl font-bold', classes.text)}>{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
