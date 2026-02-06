import {
  FileText,
  Search,
  Eye,
  Plus,
  Upload,
  BarChart3,
  Settings,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PublishingStatusCard } from '@/components/dashboard/publishing-status-card';
import { QuickActions } from '@/components/dashboard/quick-actions';

interface DashboardMetrics {
  articles: {
    total: number;
    trend: {
      value: number;
      isPositive: boolean;
    };
  };
  keywords: {
    total: number;
    trend: {
      value: number;
      isPositive: boolean;
    };
  };
  views: {
    total: string;
    trend: {
      value: number;
      isPositive: boolean;
    };
  };
  publishingStatus: {
    published: number;
    draft: number;
    scheduled: number;
    pending_review: number;
  };
}

async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dashboard/metrics`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return default metrics on error
      return {
        articles: { total: 0, trend: { value: 0, isPositive: true } },
        keywords: { total: 0, trend: { value: 0, isPositive: true } },
        views: { total: '0', trend: { value: 0, isPositive: true } },
        publishingStatus: {
          published: 0,
          draft: 0,
          scheduled: 0,
          pending_review: 0,
        },
      };
    }

    return await response.json();
  } catch {
    // Return default metrics on fetch error
    return {
      articles: { total: 0, trend: { value: 0, isPositive: true } },
      keywords: { total: 0, trend: { value: 0, isPositive: true } },
      views: { total: '0', trend: { value: 0, isPositive: true } },
      publishingStatus: {
        published: 0,
        draft: 0,
        scheduled: 0,
        pending_review: 0,
      },
    };
  }
}

const quickActions = [
  {
    label: 'New Article',
    icon: Plus,
    href: '/dashboard/articles/new',
    description: 'Create a new article',
    variant: 'primary' as const,
  },
  {
    label: 'Import Content',
    icon: Upload,
    href: '/dashboard/import',
    description: 'Import from CMS',
  },
  {
    label: 'Track Keywords',
    icon: Search,
    href: '/dashboard/keywords',
    description: 'Add new keywords',
  },
  {
    label: 'View Analytics',
    icon: BarChart3,
    href: '/dashboard/analytics',
    description: 'See performance',
  },
];

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  const publishingStatusItems = [
    {
      status: 'published' as const,
      count: metrics.publishingStatus.published,
      label: 'Published',
    },
    {
      status: 'draft' as const,
      count: metrics.publishingStatus.draft,
      label: 'Draft',
    },
    {
      status: 'scheduled' as const,
      count: metrics.publishingStatus.scheduled,
      label: 'Scheduled',
    },
    {
      status: 'pending_review' as const,
      count: metrics.publishingStatus.pending_review,
      label: 'Pending Review',
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Overview of your content performance and activity
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Articles Written"
          value={metrics.articles.total}
          icon={FileText}
          trend={metrics.articles.trend}
          description="Total published articles"
        />
        <MetricCard
          title="Keywords Tracked"
          value={metrics.keywords.total}
          icon={Search}
          trend={metrics.keywords.trend}
          description="Active keyword tracking"
        />
        <MetricCard
          title="Total Views"
          value={metrics.views.total}
          icon={Eye}
          trend={metrics.views.trend}
          description="All-time article views"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Publishing Status */}
      <PublishingStatusCard items={publishingStatusItems} />
    </div>
  );
}
