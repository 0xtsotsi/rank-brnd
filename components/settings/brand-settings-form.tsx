'use client';

/**
 * Brand Settings Form Component
 * Form for configuring brand colors, tone, style guides, and logo
 */

import { useState, useEffect } from 'react';
import type { BrandSettingsFormData, BrandTone } from '@/types/brand-settings';
import { cn } from '@/lib/utils';

// Tone options with descriptions
const TONE_OPTIONS: Record<BrandTone, { label: string; description: string }> =
  {
    professional: {
      label: 'Professional',
      description: 'Formal and business-focused communication',
    },
    casual: {
      label: 'Casual',
      description: 'Relaxed and friendly communication',
    },
    friendly: {
      label: 'Friendly',
      description: 'Warm and approachable communication',
    },
    formal: {
      label: 'Formal',
      description: 'Respectful and dignified communication',
    },
  };

interface BrandSettingsFormProps {
  initialData?: BrandSettingsFormData;
  onSave: (data: BrandSettingsFormData) => Promise<void>;
  isSaving?: boolean;
  className?: string;
}

export function BrandSettingsForm({
  initialData,
  onSave,
  isSaving = false,
  className,
}: BrandSettingsFormProps) {
  const [formData, setFormData] = useState<BrandSettingsFormData>({
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    accentColor: '#3b82f6',
    tone: 'professional',
    typography: '',
    imagery: '',
    additional: '',
    logoUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<BrandTone>('professional');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setSelectedTone(initialData.tone);
      if (initialData.logoUrl) {
        setLogoPreview(initialData.logoUrl);
      }
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Update selected tone
    if (name === 'tone') {
      setSelectedTone(value as BrandTone);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        logoUrl: 'Please select a valid image file',
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        logoUrl: 'Image size must be less than 5MB',
      }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.logoUrl;
        return newErrors;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.primaryColor)) {
      newErrors.primaryColor = 'Invalid hex color format (e.g., #2563eb)';
    }

    if (
      formData.secondaryColor &&
      !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.secondaryColor)
    ) {
      newErrors.secondaryColor = 'Invalid hex color format (e.g., #1e40af)';
    }

    if (
      formData.accentColor &&
      !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.accentColor)
    ) {
      newErrors.accentColor = 'Invalid hex color format (e.g., #3b82f6)';
    }

    if (
      formData.logoUrl &&
      !formData.logoUrl.startsWith('data:') &&
      !/^https?:\/\//.test(formData.logoUrl)
    ) {
      newErrors.logoUrl = 'Invalid logo URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-8', className)}>
      {/* Brand Colors Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Brand Colors
        </h3>
        <div className="space-y-4">
          {/* Primary Color */}
          <div>
            <label
              htmlFor="primaryColor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Primary Color <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primaryColor"
                name="primaryColor"
                value={formData.primaryColor}
                onChange={handleChange}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-600"
                disabled={isSaving}
                data-testid="primary-color-input"
              />
              <input
                type="text"
                name="primaryColor"
                value={formData.primaryColor}
                onChange={handleChange}
                placeholder="#2563eb"
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border font-mono text-sm',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  'transition-colors',
                  errors.primaryColor
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600'
                )}
                disabled={isSaving}
              />
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                style={{ backgroundColor: formData.primaryColor }}
                data-testid="primary-color-preview"
              />
            </div>
            {errors.primaryColor && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.primaryColor}
              </p>
            )}
          </div>

          {/* Secondary Color */}
          <div>
            <label
              htmlFor="secondaryColor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Secondary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="secondaryColor"
                name="secondaryColor"
                value={formData.secondaryColor || '#000000'}
                onChange={handleChange}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-600"
                disabled={isSaving}
                data-testid="secondary-color-input"
              />
              <input
                type="text"
                name="secondaryColor"
                value={formData.secondaryColor || ''}
                onChange={handleChange}
                placeholder="#1e40af (optional)"
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border font-mono text-sm',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  'transition-colors',
                  errors.secondaryColor
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600'
                )}
                disabled={isSaving}
              />
              {formData.secondaryColor && (
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: formData.secondaryColor }}
                  data-testid="secondary-color-preview"
                />
              )}
            </div>
            {errors.secondaryColor && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.secondaryColor}
              </p>
            )}
          </div>

          {/* Accent Color */}
          <div>
            <label
              htmlFor="accentColor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="accentColor"
                name="accentColor"
                value={formData.accentColor || '#000000'}
                onChange={handleChange}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-600"
                disabled={isSaving}
                data-testid="accent-color-input"
              />
              <input
                type="text"
                name="accentColor"
                value={formData.accentColor || ''}
                onChange={handleChange}
                placeholder="#3b82f6 (optional)"
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border font-mono text-sm',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  'transition-colors',
                  errors.accentColor
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600'
                )}
                disabled={isSaving}
              />
              {formData.accentColor && (
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: formData.accentColor }}
                  data-testid="accent-color-preview"
                />
              )}
            </div>
            {errors.accentColor && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.accentColor}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Brand Tone Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Brand Tone
        </h3>
        <div>
          <label
            htmlFor="tone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Tone Preference
          </label>
          <select
            id="tone"
            name="tone"
            value={formData.tone}
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
            data-testid="tone-select"
          >
            {(Object.keys(TONE_OPTIONS) as BrandTone[]).map((tone) => (
              <option key={tone} value={tone}>
                {TONE_OPTIONS[tone].label} - {TONE_OPTIONS[tone].description}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {TONE_OPTIONS[selectedTone].description}
          </p>
        </div>
      </section>

      {/* Logo Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Logo
        </h3>
        <div>
          <label
            htmlFor="logoUpload"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Logo Image
          </label>
          <div className="mt-1 flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-24 w-auto rounded-lg border-2 border-gray-200 dark:border-gray-600 object-contain bg-white dark:bg-gray-800 p-2"
                  data-testid="logo-preview"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  disabled={isSaving}
                  data-testid="remove-logo-button"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                id="logoUpload"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isSaving}
                data-testid="logo-upload-input"
              />
              <label
                htmlFor="logoUpload"
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer',
                  'border border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload Logo
              </label>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF up to 5MB
              </p>
            </div>
          </div>
          {errors.logoUrl && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.logoUrl}
            </p>
          )}
        </div>
      </section>

      {/* Style Guide Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Style Guide
        </h3>
        <div className="space-y-4">
          {/* Typography */}
          <div>
            <label
              htmlFor="typography"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Typography Guidelines
            </label>
            <textarea
              id="typography"
              name="typography"
              value={formData.typography || ''}
              onChange={handleChange}
              placeholder="Describe your typography preferences, fonts to use, heading styles, etc."
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
              data-testid="typography-input"
            />
          </div>

          {/* Imagery */}
          <div>
            <label
              htmlFor="imagery"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Imagery Guidelines
            </label>
            <textarea
              id="imagery"
              name="imagery"
              value={formData.imagery || ''}
              onChange={handleChange}
              placeholder="Describe your imagery preferences, photo styles, illustrations, etc."
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
              data-testid="imagery-input"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label
              htmlFor="additional"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Additional Guidelines
            </label>
            <textarea
              id="additional"
              name="additional"
              value={formData.additional || ''}
              onChange={handleChange}
              placeholder="Any other brand guidelines or notes..."
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
              data-testid="additional-input"
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            'px-6 py-2.5 rounded-lg font-medium transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center gap-2'
          )}
          data-testid="save-brand-settings-button"
        >
          {isSaving ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save Brand Settings
            </>
          )}
        </button>
      </div>
    </form>
  );
}
