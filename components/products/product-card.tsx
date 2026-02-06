'use client';

/**
 * Product Card Component
 * Displays a product/website with actions for edit and delete
 */

import type { Product } from '@/types/product';
import { STATUS_LABELS, STATUS_COLORS, TONE_LABELS } from '@/types/product';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const statusClasses = STATUS_COLORS[product.status];
  const toneLabel = TONE_LABELS[product.tone_preferences.tone];

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      onDelete(product);
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
      data-testid={`product-card-${product.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Color indicator */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-sm"
            style={{ backgroundColor: product.brand_colors.primary }}
            data-testid={`product-color-${product.id}`}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {product.name}
            </h3>
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                data-testid={`product-url-${product.id}`}
              >
                {new URL(product.url).hostname}
              </a>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            statusClasses.bg,
            statusClasses.text,
            statusClasses.border,
            'border'
          )}
          data-testid={`product-status-${product.id}`}
        >
          {STATUS_LABELS[product.status]}
        </span>
      </div>

      {/* Description */}
      {product.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {toneLabel}
        </span>
        {product.metadata.industry && (
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {product.metadata.industry}
          </span>
        )}
        {product.metadata.target_audience && (
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {product.metadata.target_audience}
          </span>
        )}
      </div>

      {/* Brand colors */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Brand colors:
        </span>
        <div className="flex gap-1">
          <div
            className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: product.brand_colors.primary }}
            title="Primary"
          />
          {product.brand_colors.secondary && (
            <div
              className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600"
              style={{ backgroundColor: product.brand_colors.secondary }}
              title="Secondary"
            />
          )}
          {product.brand_colors.accent && (
            <div
              className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600"
              style={{ backgroundColor: product.brand_colors.accent }}
              title="Accent"
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => onEdit(product)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'text-sm font-medium transition-colors',
            'bg-gray-100 dark:bg-gray-700',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
          data-testid={`edit-product-${product.id}`}
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit
        </button>
        <button
          onClick={handleDelete}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'text-sm font-medium transition-colors',
            'bg-red-50 dark:bg-red-900/20',
            'text-red-600 dark:text-red-400',
            'hover:bg-red-100 dark:hover:bg-red-900/30'
          )}
          data-testid={`delete-product-${product.id}`}
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
