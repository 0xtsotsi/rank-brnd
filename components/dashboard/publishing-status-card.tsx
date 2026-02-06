interface PublishingStatusItem {
  status: 'published' | 'draft' | 'scheduled' | 'pending_review';
  count: number;
  label: string;
}

interface PublishingStatusCardProps {
  items: PublishingStatusItem[];
  total?: number;
  className?: string;
}

const statusConfig = {
  published: {
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
    dotColor: 'bg-green-500',
  },
  draft: {
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-400',
    dotColor: 'bg-gray-500',
  },
  scheduled: {
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
  pending_review: {
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
  },
};

export function PublishingStatusCard({
  items,
  total,
  className = '',
}: PublishingStatusCardProps) {
  const calculatedTotal =
    total ?? items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={`card p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Publishing Status
      </h3>
      <div className="space-y-4">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const percentage =
            calculatedTotal > 0
              ? Math.round((item.count / calculatedTotal) * 100)
              : 0;

          return (
            <div key={item.status}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                  <span className={`text-sm font-medium ${config.textColor}`}>
                    {item.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.count}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${config.bgColor.replace('50', '500').replace('900/20', '600')}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {calculatedTotal > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total:{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {calculatedTotal}
            </span>{' '}
            articles
          </p>
        </div>
      )}
    </div>
  );
}
