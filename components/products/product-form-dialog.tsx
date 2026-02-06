'use client';

/**
 * Product Form Dialog Component
 * Modal dialog for creating and editing products/websites
 */

import { useState, useEffect } from 'react';
import type { Product, ProductFormData } from '@/types/product';
import {
  TONE_LABELS,
  VOICE_LABELS,
  formDataToProduct,
  productToFormData,
  generateSlugFromName,
} from '@/types/product';
import { cn } from '@/lib/utils';

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProductFormData, id?: string) => Promise<void>;
  product?: Product;
  isSaving?: boolean;
}

export function ProductFormDialog({
  isOpen,
  onClose,
  onSave,
  product,
  isSaving = false,
}: ProductFormDialogProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    url: '',
    description: '',
    status: 'active',
    brand_colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#3b82f6',
    },
    tone_preferences: {
      tone: 'professional',
      voice: 'third-person',
    },
    analytics_config: {
      enabled: false,
    },
    metadata: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [colorPreview, setColorPreview] = useState(
    formData.brand_colors?.primary || '#2563eb'
  );

  useEffect(() => {
    if (product) {
      const data = productToFormData(product);
      setFormData(data);
      setColorPreview(data.brand_colors?.primary || '#2563eb');
    } else {
      setFormData({
        name: '',
        slug: '',
        url: '',
        description: '',
        status: 'active',
        brand_colors: {
          primary: '#2563eb',
          secondary: '#1e40af',
          accent: '#3b82f6',
        },
        tone_preferences: {
          tone: 'professional',
          voice: 'third-person',
        },
        analytics_config: {
          enabled: false,
        },
        metadata: {},
      });
      setColorPreview('#2563eb');
    }
    setErrors({});
  }, [product, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // Handle nested properties
    if (name.startsWith('brand_colors.')) {
      const key = name.split('.')[1] as keyof NonNullable<
        ProductFormData['brand_colors']
      >;
      setFormData((prev) => ({
        ...prev,
        brand_colors: { ...prev.brand_colors, [key]: value },
      }));
      if (key === 'primary') {
        setColorPreview(value);
      }
    } else if (name.startsWith('tone_preferences.')) {
      const key = name.split('.')[1] as keyof NonNullable<
        ProductFormData['tone_preferences']
      >;
      setFormData((prev) => ({
        ...prev,
        tone_preferences: { ...prev.tone_preferences, [key]: value },
      }));
    } else if (name.startsWith('metadata.')) {
      const key = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    const baseName = name.split('.')[0];
    if (errors[baseName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[baseName];
        return newErrors;
      });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlugFromName(name),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.url && formData.url.trim()) {
      try {
        new URL(
          formData.url!.startsWith('http')
            ? formData.url!
            : `https://${formData.url}`
        );
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    if (
      !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(
        formData.brand_colors?.primary || ''
      )
    ) {
      newErrors.primary = 'Invalid hex color format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSave(formData, product?.id);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      data-testid="product-form-dialog"
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isSaving}
            data-testid="close-dialog-button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g., Acme Corporation"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors',
                errors.name
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-600'
              )}
              disabled={isSaving}
              data-testid="product-name-input"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name}
              </p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g., acme-corporation"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors',
                'border-gray-300 dark:border-gray-600'
              )}
              disabled={isSaving}
            />
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Website URL
            </label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url || ''}
              onChange={handleChange}
              placeholder="https://example.com"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors',
                errors.url
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-600'
              )}
              disabled={isSaving}
            />
            {errors.url && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.url}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Brief description of the product..."
              rows={3}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors resize-none',
                'border-gray-300 dark:border-gray-600'
              )}
              disabled={isSaving}
            />
          </div>

          {/* Brand Colors */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Brand Colors
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="primary"
                  className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                >
                  Primary
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary"
                    name="brand_colors.primary"
                    value={formData.brand_colors?.primary || '#2563eb'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    name="brand_colors.primary"
                    value={formData.brand_colors?.primary || ''}
                    onChange={handleChange}
                    className={cn(
                      'flex-1 px-2 py-1 text-sm rounded border',
                      'bg-white dark:bg-gray-900',
                      'text-gray-900 dark:text-white',
                      'border-gray-300 dark:border-gray-600'
                    )}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="secondary"
                  className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                >
                  Secondary
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondary"
                    name="brand_colors.secondary"
                    value={formData.brand_colors?.secondary || '#1e40af'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    name="brand_colors.secondary"
                    value={formData.brand_colors?.secondary || ''}
                    onChange={handleChange}
                    className={cn(
                      'flex-1 px-2 py-1 text-sm rounded border',
                      'bg-white dark:bg-gray-900',
                      'text-gray-900 dark:text-white',
                      'border-gray-300 dark:border-gray-600'
                    )}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="accent"
                  className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                >
                  Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="accent"
                    name="brand_colors.accent"
                    value={formData.brand_colors?.accent || '#3b82f6'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    name="brand_colors.accent"
                    value={formData.brand_colors?.accent || ''}
                    onChange={handleChange}
                    className={cn(
                      'flex-1 px-2 py-1 text-sm rounded border',
                      'bg-white dark:bg-gray-900',
                      'text-gray-900 dark:text-white',
                      'border-gray-300 dark:border-gray-600'
                    )}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
            {/* Color Preview */}
            <div className="flex items-center gap-2 pt-2">
              <div
                className="w-16 h-10 rounded"
                style={{ backgroundColor: colorPreview }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Preview
              </span>
            </div>
          </div>

          {/* Tone Preferences */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tone
              </label>
              <select
                id="tone"
                name="tone_preferences.tone"
                value={formData.tone_preferences?.tone || 'professional'}
                onChange={handleChange}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                  'transition-colors',
                  'border-gray-300 dark:border-gray-600'
                )}
                disabled={isSaving}
              >
                {Object.entries(TONE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="voice"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Voice
              </label>
              <select
                id="voice"
                name="tone_preferences.voice"
                value={formData.tone_preferences?.voice || 'third-person'}
                onChange={handleChange}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                  'transition-colors',
                  'border-gray-300 dark:border-gray-600'
                )}
                disabled={isSaving}
              >
                {Object.entries(VOICE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="industry"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Industry
              </label>
              <input
                type="text"
                id="industry"
                name="metadata.industry"
                value={formData.metadata?.industry || ''}
                onChange={handleChange}
                placeholder="e.g., Technology"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                  'transition-colors',
                  'border-gray-300 dark:border-gray-600'
                )}
                disabled={isSaving}
              />
            </div>
            <div>
              <label
                htmlFor="target_audience"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Target Audience
              </label>
              <input
                type="text"
                id="target_audience"
                name="metadata.target_audience"
                value={formData.metadata?.target_audience || ''}
                onChange={handleChange}
                placeholder="e.g., Enterprise"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                  'transition-colors',
                  'border-gray-300 dark:border-gray-600'
                )}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status || 'active'}
              onChange={handleChange}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors',
                'border-gray-300 dark:border-gray-600'
              )}
              disabled={isSaving}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
              data-testid="save-product-button"
            >
              {isSaving
                ? 'Saving...'
                : product
                  ? 'Save Changes'
                  : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
