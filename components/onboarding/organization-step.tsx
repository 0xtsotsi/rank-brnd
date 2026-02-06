'use client';

/**
 * Organization Setup Step Component
 *
 * Guides users through creating their organization/workspace.
 * Creates organization in database with default product and links user as owner.
 */

import { useState } from 'react';
import { Building2, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

interface OrganizationStepProps {
  onNext: () => void;
  onSkip?: () => void;
  existingOrganization?: {
    name: string;
    slug: string;
  };
}

export function OrganizationStep({
  onNext,
  onSkip,
  existingOrganization,
}: OrganizationStepProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [orgName, setOrgName] = useState(existingOrganization?.name || '');
  const [slug, setSlug] = useState(existingOrganization?.slug || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-generate slug from org name
  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    // Generate slug: lowercase, replace spaces with hyphens, remove special chars
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setSlug(generatedSlug);
    setError('');
  };

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    if (!slug.trim()) {
      setError('Please enter a URL slug');
      return;
    }

    if (!isUserLoaded || !user?.id) {
      setError('Please wait while we verify your account');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (existingOrganization) {
        // User already has an organization, just proceed
        setIsSuccess(true);
        setTimeout(() => onNext(), 500);
        return;
      }

      // Call the API to create the organization
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName.trim(),
          slug: slug.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || 'Failed to create organization. Please try again.'
        );
        return;
      }

      // Organization created successfully
      setIsSuccess(true);

      // Store organization data for next steps
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'createdOrganization',
          JSON.stringify(data.organization)
        );
        if (data.product) {
          sessionStorage.setItem(
            'createdProduct',
            JSON.stringify(data.product)
          );
        }
      }

      setTimeout(() => onNext(), 500);
    } catch (err) {
      console.error('Error creating organization:', err);
      setError('Failed to create organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 animate-bounce-in">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Organization Ready!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {orgName} is all set up and ready to go.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
          <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {existingOrganization ? 'Your Workspace' : 'Create Your Workspace'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {existingOrganization
            ? 'You already have an organization set up.'
            : 'Set up your organization to start creating content.'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Organization Name */}
        <div>
          <label
            htmlFor="orgName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Organization Name
          </label>
          <input
            id="orgName"
            type="text"
            value={orgName}
            onChange={(e) => handleOrgNameChange(e.target.value)}
            placeholder="Acme Corp"
            disabled={!!existingOrganization || isLoading}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'transition-colors',
              (existingOrganization || isLoading) &&
                'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* URL Slug */}
        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            URL Slug
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
              rank.brnd/
            </span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme-corp"
              disabled={!!existingOrganization || isLoading}
              className={cn(
                'flex-1 px-4 py-3 rounded-r-lg border',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'transition-colors',
                (existingOrganization || isLoading) &&
                  'opacity-50 cursor-not-allowed'
              )}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This will be your organization&apos;s unique URL.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onSkip && !existingOrganization && (
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
                Creating...
              </>
            ) : existingOrganization ? (
              'Continue'
            ) : (
              'Create Organization'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
