// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Marketplace Recommendations API Route
 *
 * Returns personalized exchange site recommendations based on
 * article niche relevance matching using semantic similarity,
 * tag matching, and category analysis.
 *
 * GET /api/marketplace/recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { z } from 'zod';
import {
  getRecommendations,
  analyzeArticleNiches,
  type MarketplaceSite,
} from '@/lib/niche-relevance';

/**
 * Query parameters schema
 */
const recommendationsQuerySchema = z.object({
  // Article identification
  article_id: z.string().optional(),

  // Article content for niche analysis
  article_title: z.string().optional(),
  article_category: z.string().optional(),
  article_tags: z.string().optional(), // Comma-separated

  // Direct niche/keyword targeting
  target_niches: z.string().optional(), // Comma-separated
  target_keywords: z.string().optional(), // Comma-separated

  // Filtering
  min_relevance_score: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .default(0),
  max_results: z.coerce.number().int().min(1).max(100).optional().default(50),

  // Standard marketplace filters
  min_da: z.coerce.number().int().min(0).max(100).optional(),
  max_da: z.coerce.number().int().min(0).max(100).optional(),
  max_spam_score: z.coerce.number().int().min(0).max(100).optional(),
  min_quality_score: z.coerce.number().int().min(0).max(100).optional(),
  language: z.string().optional().default('en'),
  max_credits: z.coerce.number().int().min(0).optional(),

  // Scoring weights (optional, comma-separated key=value pairs)
  weights: z.string().optional(),
});

/**
 * GET /api/marketplace/recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const params = recommendationsQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    // Get Supabase client
    const client = getSupabaseServerClient();

    // Get user's organization
    const { data: orgMember } = await client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    const organization_id = orgMember?.organization_id;
    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // If article_id is provided, fetch article data
    let articleData:
      | {
          title: string;
          content?: string;
          category?: string;
          tags?: string[];
          meta_keywords?: string[];
        }
      | undefined = undefined;

    if (params.article_id) {
      const { data: article } = await client
        .from('articles')
        .select('title, content, category, tags, meta_keywords')
        .eq('id', params.article_id)
        .eq('organization_id', organization_id)
        .single();

      if (article) {
        articleData = {
          title: article.title,
          content: article.content || undefined,
          category: article.category || undefined,
          tags: article.tags || [],
          meta_keywords: article.meta_keywords || [],
        };
      }
    }

    // Build article object from query params if no article data
    if (!articleData && params.article_title) {
      articleData = {
        title: params.article_title,
        category: params.article_category,
        tags: params.article_tags
          ? params.article_tags.split(',').map((t) => t.trim())
          : [],
      };
    }

    // Parse target niches
    const target_niches = params.target_niches
      ? params.target_niches.split(',').map((n) => n.trim())
      : undefined;

    // Parse target keywords
    const target_keywords = params.target_keywords
      ? params.target_keywords.split(',').map((k) => k.trim())
      : undefined;

    // Parse scoring weights
    let scoring_weights = undefined;
    if (params.weights) {
      try {
        const weightPairs = params.weights.split(',');
        scoring_weights = {};
        for (const pair of weightPairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              scoring_weights[key.trim()] = numValue;
            }
          }
        }
      } catch (e) {
        // Invalid weights format, use defaults
      }
    }

    // Mock marketplace sites data (in production, query from database)
    const mockSites: MarketplaceSite[] = [
      {
        id: 'site-1',
        domain: 'techblog.example.com',
        niche: ['Technology', 'SaaS', 'Marketing'],
        categories: ['Technology', 'Business'],
        domain_authority: 55,
        page_authority: 48,
        spam_score: 5,
        quality_score: 85,
        traffic: 125000,
        credits_required: 50,
        available: true,
        response_time: 24,
        success_rate: 92,
        language: 'en',
        region: 'us',
      },
      {
        id: 'site-2',
        domain: 'healthwise.example.com',
        niche: ['Health', 'Fitness', 'Nutrition'],
        categories: ['Health', 'Lifestyle'],
        domain_authority: 62,
        page_authority: 55,
        spam_score: 3,
        quality_score: 92,
        traffic: 250000,
        credits_required: 75,
        available: true,
        response_time: 48,
        success_rate: 88,
        language: 'en',
        region: 'us',
      },
      {
        id: 'site-3',
        domain: 'financeguru.example.com',
        niche: ['Finance', 'Crypto', 'Business'],
        categories: ['Finance', 'Business'],
        domain_authority: 48,
        page_authority: 42,
        spam_score: 8,
        quality_score: 78,
        traffic: 85000,
        credits_required: 40,
        available: true,
        response_time: 18,
        success_rate: 85,
        language: 'en',
        region: 'us',
      },
      {
        id: 'site-4',
        domain: 'traveladventures.example.com',
        niche: ['Travel', 'Lifestyle'],
        categories: ['Travel', 'Lifestyle'],
        domain_authority: 42,
        page_authority: 38,
        spam_score: 12,
        quality_score: 72,
        traffic: 45000,
        credits_required: 30,
        available: true,
        response_time: 36,
        success_rate: 90,
        language: 'en',
        region: 'eu',
      },
      {
        id: 'site-5',
        domain: 'marketingpro.example.com',
        niche: ['Marketing', 'SEO', 'Business'],
        categories: ['Marketing', 'Business'],
        domain_authority: 58,
        page_authority: 52,
        spam_score: 4,
        quality_score: 88,
        traffic: 175000,
        credits_required: 65,
        available: true,
        response_time: 24,
        success_rate: 95,
        language: 'en',
        region: 'us',
      },
      {
        id: 'site-6',
        domain: 'saasweekly.example.com',
        niche: ['SaaS', 'Technology', 'Business'],
        categories: ['Technology', 'Business'],
        domain_authority: 45,
        page_authority: 40,
        spam_score: 10,
        quality_score: 75,
        traffic: 65000,
        credits_required: 45,
        available: true,
        response_time: 12,
        success_rate: 87,
        language: 'en',
        region: 'us',
      },
      {
        id: 'site-7',
        domain: 'ecommerceinsider.example.com',
        niche: ['E-commerce', 'Business', 'Marketing'],
        categories: ['Business', 'Marketing'],
        domain_authority: 50,
        page_authority: 44,
        spam_score: 7,
        quality_score: 80,
        traffic: 95000,
        credits_required: 55,
        available: true,
        response_time: 30,
        success_rate: 91,
        language: 'en',
        region: 'us',
      },
      {
        id: 'site-8',
        domain: 'gamingzone.example.com',
        niche: ['Gaming', 'Entertainment'],
        categories: ['Gaming', 'Entertainment'],
        domain_authority: 40,
        page_authority: 35,
        spam_score: 15,
        quality_score: 68,
        traffic: 35000,
        credits_required: 25,
        available: true,
        response_time: 48,
        success_rate: 82,
        language: 'en',
        region: 'us',
      },
    ];

    // Apply additional filters to sites
    let filteredSites = mockSites.filter((site) => {
      // DA range filter
      if (
        params.min_da !== undefined &&
        site.domain_authority < params.min_da
      ) {
        return false;
      }
      if (
        params.max_da !== undefined &&
        site.domain_authority > params.max_da
      ) {
        return false;
      }

      // Spam score filter
      if (
        params.max_spam_score !== undefined &&
        site.spam_score > params.max_spam_score
      ) {
        return false;
      }

      // Quality score filter
      if (
        params.min_quality_score !== undefined &&
        site.quality_score < params.min_quality_score
      ) {
        return false;
      }

      // Credits filter
      if (
        params.max_credits !== undefined &&
        site.credits_required > params.max_credits
      ) {
        return false;
      }

      // Language filter
      if (params.language && site.language !== params.language) {
        return false;
      }

      return true;
    });

    // Get recommendations
    const result = await getRecommendations({
      article: articleData,
      target_niches,
      target_keywords,
      sites: filteredSites,
      organization_id,
      min_relevance_score: params.min_relevance_score,
      max_results: params.max_results,
      scoring_weights,
    });

    return NextResponse.json({
      recommendations: result.recommendations,
      article_analysis: result.article_analysis,
      filters: result.filters_applied,
      pagination: {
        total: result.total_count,
        limit: params.max_results,
        min_relevance_score: params.min_relevance_score,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching marketplace recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
