import { Loader2 } from 'lucide-react';

/**
 * Dashboard Loading State
 *
 * Shown while dashboard pages are loading.
 */
export default function DashboardLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    </div>
  );
}
