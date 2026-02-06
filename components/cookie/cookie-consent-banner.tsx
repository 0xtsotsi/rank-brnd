'use client';

/**
 * Cookie Consent Banner
 *
 * A GDPR-compliant cookie consent banner that appears at the bottom of the screen.
 * Shows when user hasn't given consent yet, with options to accept all, reject all,
 * or customize preferences.
 */

import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCookieConsentStore } from '@/lib/cookie-consent-store';
import { CookiePreferencesDialog } from './cookie-preferences-dialog';

export function CookieConsentBanner() {
  const [showDialog, setShowDialog] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const showBanner = useCookieConsentStore((state) => state.showBanner);
  const acceptAll = useCookieConsentStore((state) => state.acceptAll);
  const rejectAll = useCookieConsentStore((state) => state.rejectAll);
  const dismissBanner = useCookieConsentStore((state) => state.dismissBanner);

  // Handle animation on mount
  useEffect(() => {
    if (showBanner) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [showBanner]);

  const handleAcceptAll = () => {
    acceptAll();
  };

  const handleRejectAll = () => {
    rejectAll();
  };

  const handleCustomize = () => {
    setShowDialog(true);
  };

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => dismissBanner(), 200);
  };

  if (!showBanner && !isAnimating) return null;

  return (
    <>
      {/* Banner */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6',
          'transition-transform duration-200 ease-out',
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        )}
        role="dialog"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
      >
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close cookie banner"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="hidden sm:flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pr-8">
                <h2
                  id="cookie-consent-title"
                  className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2"
                >
                  We use cookies
                </h2>
                <p
                  id="cookie-consent-description"
                  className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4"
                >
                  We use cookies and similar technologies to help personalize
                  content, tailor and measure ads, and provide a better
                  experience. By clicking accept all, you agree to our use of
                  cookies.
                </p>
                <a
                  href="/privacy"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-block mb-4"
                >
                  Learn more about our cookie policy
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:flex-shrink-0">
                <Button
                  onClick={handleCustomize}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Customize
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="ghost"
                  className="w-full sm:w-auto"
                >
                  Reject All
                </Button>
                <Button onClick={handleAcceptAll} className="w-full sm:w-auto">
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Dialog */}
      <CookiePreferencesDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
}
