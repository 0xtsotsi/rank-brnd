import { Loader2 } from 'lucide-react';

/**
 * Protected Route Loading State
 *
 * Shown while pages in the (protected) route group are loading.
 * This provides a consistent loading experience for authenticated pages.
 */
export default function ProtectedLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
