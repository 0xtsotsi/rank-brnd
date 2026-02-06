'use client';

/**
 * Exchange Request Dialog Component
 * Modal for creating a backlink exchange request
 */

import { useState } from 'react';
import type {
  MarketplaceSite,
  ExchangeRequestFormData,
} from '@/types/backlink-marketplace';
import { cn } from '@/lib/utils';
import { X, AlertCircle, Check, ExternalLink, Zap, Globe } from 'lucide-react';

interface ExchangeRequestDialogProps {
  isOpen: boolean;
  site: MarketplaceSite | null;
  userArticles?: Array<{ id: string; title: string; slug: string }>;
  userCredits: number;
  onClose: () => void;
  onSubmit: (data: ExchangeRequestFormData) => Promise<boolean>;
  className?: string;
}

export function ExchangeRequestDialog({
  isOpen,
  site,
  userArticles = [],
  userCredits,
  onClose,
  onSubmit,
  className,
}: ExchangeRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    article_id: '',
    target_url: '',
    anchor_text: '',
    notes: '',
  });

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Reset after close animation
      setTimeout(() => {
        setFormData({
          article_id: '',
          target_url: '',
          anchor_text: '',
          notes: '',
        });
        setError(null);
        setSuccess(false);
      }, 200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        marketplace_site_id: site?.id || '',
        article_id: formData.article_id || null,
        target_url: formData.target_url,
        anchor_text: formData.anchor_text || null,
        notes: formData.notes || null,
      });

      if (result) {
        setSuccess(true);
        // Auto close after success
        setTimeout(() => {
          handleOpenChange(false);
        }, 1500);
      } else {
        setError('Failed to submit request. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAfford = site ? userCredits >= site.credits_required : true;
  const remainingCredits = site ? userCredits - site.credits_required : 0;

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm',
        'animate-fade-in',
        className
      )}
      data-testid="exchange-request-dialog"
      onClick={() => handleOpenChange(false)}
    >
      <div
        className={cn(
          'w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl',
          'border border-gray-200 dark:border-gray-700',
          'animate-slide-up'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Request Exchange
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Submit a backlink exchange request
            </p>
          </div>
          <button
            onClick={() => handleOpenChange(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Site Info */}
        {site && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">
                  {site.title}
                </p>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {site.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>DA: {site.domain_authority}</span>
                  <span>•</span>
                  <span>Quality: {site.quality_score}/100</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    {site.credits_required} credits
                  </span>
                </div>
              </div>
            </div>

            {/* Credits Notice */}
            <div
              className={cn(
                'mt-3 p-3 rounded-lg flex items-center gap-2',
                canAfford
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              )}
            >
              {canAfford ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <p className="text-sm">
                {canAfford ? (
                  <>
                    <span className="font-medium text-green-700 dark:text-green-300">
                      {userCredits} credits available
                    </span>
                    {' • '}
                    <span className="text-green-600 dark:text-green-400">
                      {remainingCredits} will remain after this exchange
                    </span>
                  </>
                ) : (
                  <span className="font-medium text-red-700 dark:text-red-300">
                    Insufficient credits. You need{' '}
                    {site.credits_required - userCredits} more credits.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Article Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Select Article (Optional)
            </label>
            <select
              value={formData.article_id}
              onChange={(e) =>
                setFormData({ ...formData, article_id: e.target.value })
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              disabled={isSubmitting}
            >
              <option value="">Enter URL manually...</option>
              {userArticles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select an article or enter the target URL below
            </p>
          </div>

          {/* Target URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Target URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              placeholder="https://your-site.com/your-page"
              value={formData.target_url}
              onChange={(e) =>
                setFormData({ ...formData, target_url: e.target.value })
              }
              required
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The URL you want the site to link to
            </p>
          </div>

          {/* Anchor Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Anchor Text (Optional)
            </label>
            <input
              type="text"
              placeholder="Your brand name or keyword"
              value={formData.anchor_text}
              onChange={(e) =>
                setFormData({ ...formData, anchor_text: e.target.value })
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The text to be used for the link. Leave blank for site editor
              discretion.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Additional Notes (Optional)
            </label>
            <textarea
              placeholder="Any specific requirements or context for your exchange request..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors resize-none'
              )}
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Exchange request submitted successfully!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || !canAfford || !formData.target_url.trim()
              }
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-indigo-600 text-white hover:bg-indigo-700',
                'disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
