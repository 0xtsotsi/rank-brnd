/**
 * React Query hooks for articles
 *
 * Provides optimized data fetching with caching, refetching, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  excerpt: string | null;
  word_count: number;
  reading_time_minutes: number;
  category: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface ArticlesResponse {
  articles: Article[];
  categories?: string[];
  total?: number;
  page?: number;
  pageSize?: number;
}

interface ArticlesParams {
  organization_id: string;
  status?: string;
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Query keys factory for articles
 */
export const articlesKeys = {
  all: ['articles'] as const,
  lists: () => [...articlesKeys.all, 'list'] as const,
  list: (params: ArticlesParams) => [...articlesKeys.lists(), params] as const,
  details: () => [...articlesKeys.all, 'detail'] as const,
  detail: (id: string) => [...articlesKeys.details(), id] as const,
};

/**
 * Fetch articles with filters
 */
async function fetchArticles(
  params: ArticlesParams
): Promise<ArticlesResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== 'all') {
      searchParams.append(key, String(value));
    }
  });

  return apiClient.get<ArticlesResponse>(
    `/api/articles?${searchParams.toString()}`
  );
}

/**
 * Hook to fetch articles
 */
export function useArticles(params: ArticlesParams) {
  return useQuery({
    queryKey: articlesKeys.list(params),
    queryFn: () => fetchArticles(params),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Delete an article
 */
async function deleteArticle(articleId: string): Promise<void> {
  return apiClient.delete(`/api/articles?id=${articleId}`);
}

/**
 * Hook to delete an article
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      // Invalidate and refetch articles list
      queryClient.invalidateQueries({
        queryKey: articlesKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete an article with optimistic updates
 */
export function useDeleteArticleOptimistic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArticle,
    onMutate: async (articleId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: articlesKeys.lists(),
      });

      // Snapshot previous value
      const previousArticles = queryClient.getQueryData(articlesKeys.lists());

      // Optimistically update to the new value
      queryClient.setQueryData(
        articlesKeys.lists(),
        (old: ArticlesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            articles: old.articles.filter((a) => a.id !== articleId),
          };
        }
      );

      // Return context with previous value
      return { previousArticles };
    },
    onError: (error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousArticles) {
        queryClient.setQueryData(
          articlesKeys.lists(),
          context.previousArticles
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({
        queryKey: articlesKeys.lists(),
      });
    },
  });
}

// Export types
export type { Article, ArticlesResponse, ArticlesParams };
