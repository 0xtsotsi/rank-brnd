import { LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  description?: string;
  variant?: 'default' | 'primary';
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className = '' }: QuickActionsProps) {
  return (
    <div className={`card p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className={`
              group flex flex-col items-start rounded-lg border p-4
              transition-all duration-200 hover:shadow-md
              ${
                action.variant === 'primary'
                  ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30'
                  : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
              }
            `}
          >
            <action.icon
              className={`h-5 w-5 ${
                action.variant === 'primary'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            />
            <span className="mt-2 font-medium text-gray-900 dark:text-white text-sm">
              {action.label}
            </span>
            {action.description && (
              <span className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                {action.description}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
