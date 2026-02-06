import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ArticleList } from '@/components/articles/article-list';

interface PageProps {
  searchParams: {
    status?: string;
    search?: string;
    category?: string;
  };
}

export default async function ArticlesPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // Get user's organization
  // TODO: Fetch from actual user data
  const organizationId = 'default-org-id';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Articles
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and edit your content articles
          </p>
        </div>
      </div>

      <ArticleList
        organizationId={organizationId}
        status={searchParams.status}
        search={searchParams.search}
        category={searchParams.category}
      />
    </div>
  );
}
