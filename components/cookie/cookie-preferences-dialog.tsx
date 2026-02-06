'use client';

/**
 * Cookie Preferences Dialog
 *
 * A detailed dialog for users to customize their cookie preferences.
 * Shows all cookie categories with descriptions and toggle controls.
 */

import { useState } from 'react';
import { Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { COOKIE_CATEGORIES, type CookieCategory } from '@/types/cookie-consent';
import { useCookieConsentStore } from '@/lib/cookie-consent-store';

interface CookiePreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CookiePreferencesDialog({
  isOpen,
  onClose,
}: CookiePreferencesDialogProps) {
  const [localConsent, setLocalConsent] = useState(() => {
    const state = useCookieConsentStore.getState();
    return {
      essential: state.essential,
      analytics: state.analytics,
      marketing: state.marketing,
      preferences: state.preferences,
    };
  });

  const setCategories = useCookieConsentStore((state) => state.setCategories);
  const dismissBanner = useCookieConsentStore((state) => state.dismissBanner);

  const handleToggle = (category: CookieCategory) => {
    if (category === 'essential') return; // Essential cannot be disabled
    setLocalConsent((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleAcceptAll = () => {
    setLocalConsent({
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  const handleRejectAll = () => {
    setLocalConsent({
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  const handleSave = () => {
    setCategories(localConsent);
    dismissBanner();
    onClose();
  };

  const handleCancel = () => {
    // Reset to store values
    const state = useCookieConsentStore.getState();
    setLocalConsent({
      essential: state.essential,
      analytics: state.analytics,
      marketing: state.marketing,
      preferences: state.preferences,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Cookie Preferences"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-3">
            <Button onClick={handleAcceptAll} variant="ghost" size="sm">
              Accept All
            </Button>
            <Button onClick={handleRejectAll} variant="ghost" size="sm">
              Reject All
            </Button>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCancel} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Preferences</Button>
          </div>
        </div>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Manage your cookie preferences below. Essential cookies are required for
        the site to function and cannot be disabled.
      </p>

      <div className="space-y-4">
        {COOKIE_CATEGORIES.map((category) => {
          const isEnabled = localConsent[category.id];
          const isEssential = !category.optional;

          return (
            <div
              key={category.id}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                isEssential
                  ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    {isEssential && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {category.description}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    <span className="font-medium">Examples:</span>{' '}
                    {category.examples.join(', ')}
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(category.id)}
                  disabled={isEssential}
                  className={cn(
                    'relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    isEnabled
                      ? 'bg-indigo-600'
                      : 'bg-gray-300 dark:bg-gray-600',
                    isEssential && 'cursor-not-allowed opacity-60'
                  )}
                  aria-checked={isEnabled}
                  role="switch"
                  aria-label={`Toggle ${category.name}`}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out',
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  >
                    {isEnabled && (
                      <Check className="h-3 w-3 text-indigo-600 m-0.5" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-900 dark:text-indigo-100">
            <p className="font-medium mb-1">Your privacy matters</p>
            <p className="text-indigo-700 dark:text-indigo-300">
              Your consent preferences will be saved locally and applied across
              all your visits to this site. You can change these preferences at
              any time.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
