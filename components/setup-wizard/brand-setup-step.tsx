'use client';

/**
 * Brand Setup Step Component
 *
 * Guides users through configuring their brand identity including
 * name, website, industry, colors, and tone of voice.
 */

import { useState } from 'react';
import {
  Palette,
  Building2,
  Globe,
  CheckCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrandConfig } from '@/types/setup-wizard';

interface BrandSetupStepProps {
  onNext: () => void;
  onSkip?: () => void;
  initialData?: BrandConfig;
}

const INDUSTRIES = [
  'Technology',
  'E-commerce',
  'Healthcare',
  'Finance',
  'Education',
  'Real Estate',
  'Travel & Hospitality',
  'Food & Beverage',
  'Fashion & Apparel',
  'Media & Entertainment',
  'Professional Services',
  'Other',
];

const TONES = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Formal and authoritative',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Relaxed and conversational',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable',
  },
  {
    value: 'authoritative',
    label: 'Authoritative',
    description: 'Expert and confident',
  },
] as const;

const PRESET_COLORS = [
  { name: 'Indigo', primary: '#4f46e5', secondary: '#818cf8' },
  { name: 'Blue', primary: '#2563eb', secondary: '#60a5fa' },
  { name: 'Green', primary: '#10b981', secondary: '#34d399' },
  { name: 'Purple', primary: '#9333ea', secondary: '#a855f7' },
  { name: 'Red', primary: '#ef4444', secondary: '#f87171' },
  { name: 'Orange', primary: '#f97316', secondary: '#fb923c' },
  { name: 'Pink', primary: '#ec4899', secondary: '#f472b6' },
  { name: 'Teal', primary: '#14b8a6', secondary: '#2dd4bf' },
];

export function BrandSetupStep({
  onNext,
  onSkip,
  initialData,
}: BrandSetupStepProps) {
  const [brandName, setBrandName] = useState(initialData?.name || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(
    initialData?.primaryColor || '#4f46e5'
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialData?.secondaryColor || '#818cf8'
  );
  const [tone, setTone] = useState<
    'professional' | 'casual' | 'friendly' | 'authoritative'
  >(initialData?.tone || 'professional');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePresetSelect = (preset: (typeof PRESET_COLORS)[number]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brandName.trim()) {
      setError('Please enter your brand name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const config: BrandConfig = {
        name: brandName.trim(),
        website: website.trim() || undefined,
        industry: industry || undefined,
        primaryColor,
        secondaryColor,
        tone,
        description: description.trim() || undefined,
      };

      // Save to store (will be done by parent component)
      // For now, just show success and proceed
      setIsSuccess(true);
      setTimeout(() => onNext(), 800);
    } catch (err) {
      setError('Failed to save brand configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Brand Configured!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {brandName} is all set up and ready to go.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <Palette className="w-8 h-8" style={{ color: primaryColor }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Set Up Your Brand
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your brand identity to personalize your content.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Brand Name */}
        <div>
          <label
            htmlFor="brandName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Brand Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="brandName"
              type="text"
              value={brandName}
              onChange={(e) => {
                setBrandName(e.target.value);
                setError('');
              }}
              placeholder="Acme Corp"
              disabled={isLoading}
              className={cn(
                'w-full pl-12 pr-4 py-3 rounded-lg border',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'transition-colors',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label
            htmlFor="website"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Website
          </label>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                setError('');
              }}
              placeholder="https://example.com"
              disabled={isLoading}
              className={cn(
                'w-full pl-12 pr-4 py-3 rounded-lg border',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'transition-colors',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>
        </div>

        {/* Industry */}
        <div>
          <label
            htmlFor="industry"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Industry
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIndustryDropdown(!showIndustryDropdown)}
              disabled={isLoading}
              className={cn(
                'w-full px-4 py-3 rounded-lg border text-left',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-white',
                'transition-colors',
                'flex items-center justify-between',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={industry ? '' : 'text-gray-400 dark:text-gray-500'}
              >
                {industry || 'Select your industry'}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            {showIndustryDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => {
                      setIndustry(ind);
                      setShowIndustryDropdown(false);
                    }}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                      'text-gray-900 dark:text-white',
                      industry === ind &&
                        'bg-indigo-50 dark:bg-indigo-900/20 font-medium'
                    )}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Brand Colors
          </label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                disabled={isLoading}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all',
                  'hover:scale-105',
                  primaryColor === preset.primary
                    ? 'border-gray-900 dark:border-white ring-2 ring-indigo-500'
                    : 'border-transparent'
                )}
              >
                <div className="flex">
                  <div
                    className="w-4 h-4 rounded-l-full"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-r-full"
                    style={{ backgroundColor: preset.secondary }}
                  />
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Primary
              </label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                disabled={isLoading}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Secondary
              </label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                disabled={isLoading}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Tone of Voice */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Tone of Voice
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((toneOption) => (
              <button
                key={toneOption.value}
                type="button"
                onClick={() => setTone(toneOption.value)}
                disabled={isLoading}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  'hover:border-gray-300 dark:hover:border-gray-600',
                  tone === toneOption.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {toneOption.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {toneOption.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Brand Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError('');
            }}
            placeholder="Briefly describe what your brand does..."
            rows={3}
            disabled={isLoading}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'transition-colors resize-none',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isLoading}
              className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Skip for Now
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
