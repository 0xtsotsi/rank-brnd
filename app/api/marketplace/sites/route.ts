// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Marketplace Sites API Route
 * Returns available sites for backlink exchange
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { ZodError } from 'zod';
import { calculateRelevanceScore } from '@/lib/niche-relevance';

/**
 * GET /api/marketplace/sites
 * Fetch marketplace sites with filtering and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get('search') || undefined;
    const min_da = searchParams.get('min_da')
      ? parseInt(searchParams.get('min_da')!)
      : undefined;
    const max_da = searchParams.get('max_da')
      ? parseInt(searchParams.get('max_da')!)
      : undefined;
    const min_pa = searchParams.get('min_pa')
      ? parseInt(searchParams.get('min_pa')!)
      : undefined;
    const max_pa = searchParams.get('max_pa')
      ? parseInt(searchParams.get('max_pa')!)
      : undefined;
    const max_spam_score = searchParams.get('max_spam_score')
      ? parseInt(searchParams.get('max_spam_score')!)
      : undefined;
    const min_quality_score = searchParams.get('min_quality_score')
      ? parseInt(searchParams.get('min_quality_score')!)
      : undefined;
    const niches = searchParams.get('niches')
      ? searchParams
          .get('niches')!
          .split(',')
          .map((n) => n.trim())
      : undefined;
    const categories = searchParams.get('categories')
      ? searchParams
          .get('categories')!
          .split(',')
          .map((c) => c.trim())
      : undefined;
    const min_traffic = searchParams.get('min_traffic')
      ? parseInt(searchParams.get('min_traffic')!)
      : undefined;
    const language = searchParams.get('language') || 'en';
    const region = searchParams.get('region') || undefined;
    const max_credits = searchParams.get('max_credits')
      ? parseInt(searchParams.get('max_credits')!)
      : undefined;
    const sort = searchParams.get('sort') || 'quality_score';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const limit = searchParams.get('limit')
      ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
      : 50;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    // Niche relevance scoring parameters
    const article_title = searchParams.get('article_title') || undefined;
    const article_category = searchParams.get('article_category') || undefined;
    const article_tags = searchParams.get('article_tags')
      ? searchParams
          .get('article_tags')!
          .split(',')
          .map((t) => t.trim())
      : undefined;

    const client = getSupabaseServerClient();

    // For demo purposes, return mock data if the table doesn't exist
    // In production, you would query the actual marketplace_sites table

    // Mock data for demonstration
    const mockSites: any[] = [
      {
        id: 'site-1',
        domain: 'techblog.example.com',
        url: 'https://techblog.example.com',
        title: 'Tech Insights Blog',
        description:
          'A leading technology blog covering AI, machine learning, and software development topics.',
        niche: ['Technology', 'SaaS', 'Marketing'],
        domain_authority: 55,
        page_authority: 48,
        spam_score: 5,
        traffic: 125000,
        credits_required: 50,
        quality_score: 85,
        available: true,
        response_time: 24,
        success_rate: 92,
        guidelines:
          'Original content only. Minimum 800 words. No gambling or casino-related content.',
        categories: ['Technology', 'Business'],
        language: 'en',
        region: 'us',
        created_at: new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'site-2',
        domain: 'healthwise.example.com',
        url: 'https://healthwise.example.com',
        title: 'Healthwise Magazine',
        description:
          'Trusted health and wellness information reviewed by medical professionals.',
        niche: ['Health', 'Fitness', 'Nutrition'],
        domain_authority: 62,
        page_authority: 55,
        spam_score: 3,
        traffic: 250000,
        credits_required: 75,
        quality_score: 92,
        available: true,
        response_time: 48,
        success_rate: 88,
        guidelines:
          'Health content must be backed by scientific sources. No medical advice content.',
        categories: ['Health', 'Lifestyle'],
        language: 'en',
        region: 'us',
        created_at: new Date(
          Date.now() - 120 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'site-3',
        domain: 'financeguru.example.com',
        url: 'https://financeguru.example.com',
        title: 'Finance Guru Daily',
        description:
          'Personal finance, investing, and cryptocurrency news for modern investors.',
        niche: ['Finance', 'Crypto', 'Business'],
        domain_authority: 48,
        page_authority: 42,
        spam_score: 8,
        traffic: 85000,
        credits_required: 40,
        quality_score: 78,
        available: true,
        response_time: 18,
        success_rate: 85,
        guidelines:
          'Financial content must include disclaimers. No guaranteed returns content.',
        categories: ['Finance', 'Business'],
        language: 'en',
        region: 'us',
        created_at: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'site-4',
        domain: 'traveladventures.example.com',
        url: 'https://traveladventures.example.com',
        title: 'Travel Adventures',
        description:
          'Inspiring travel stories, guides, and tips for wanderlust travelers.',
        niche: ['Travel', 'Lifestyle'],
        domain_authority: 42,
        page_authority: 38,
        spam_score: 12,
        traffic: 45000,
        credits_required: 30,
        quality_score: 72,
        available: true,
        response_time: 36,
        success_rate: 90,
        guidelines:
          'Travel guides must be original and based on personal experience.',
        categories: ['Travel', 'Lifestyle'],
        language: 'en',
        region: 'eu',
        created_at: new Date(
          Date.now() - 45 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'site-5',
        domain: 'marketingpro.example.com',
        url: 'https://marketingpro.example.com',
        title: 'Marketing Pro Insights',
        description:
          'Digital marketing strategies, SEO tips, and growth hacking techniques.',
        niche: ['Marketing', 'SEO', 'Business'],
        domain_authority: 58,
        page_authority: 52,
        spam_score: 4,
        traffic: 175000,
        credits_required: 65,
        quality_score: 88,
        available: false,
        response_time: 24,
        success_rate: 95,
        guidelines:
          'Marketing case studies must include real data and results.',
        categories: ['Marketing', 'Business'],
        language: 'en',
        region: 'us',
        created_at: new Date(
          Date.now() - 100 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'site-6',
        domain: 'saasweekly.example.com',
        url: 'https://saasweekly.example.com',
        title: 'SaaS Weekly',
        description:
          'Weekly insights on SaaS products, startup news, and software reviews.',
        niche: ['SaaS', 'Technology', 'Business'],
        domain_authority: 45,
        page_authority: 40,
        spam_score: 10,
        traffic: 65000,
        credits_required: 45,
        quality_score: 75,
        available: true,
        response_time: 12,
        success_rate: 87,
        guidelines:
          'SaaS reviews must be unbiased. Product news should be newsworthy.',
        categories: ['Technology', 'Business'],
        language: 'en',
        region: 'us',
        created_at: new Date(
          Date.now() - 75 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'site-7',
        domain: 'ecommerceinsider.example.com',
        url: 'https://ecommerceinsider.example.com',
        title: 'E-commerce Insider',
        description:
          'E-commerce strategies, platform reviews, and online selling tips.',
        niche: ['E-commerce', 'Business', 'Marketing'],
        domain_authority: 50,
        page_authority: 44,
        spam_score: 7,
        traffic: 95000,
        credits_required: 55,
        quality_score: 80,
        available: true,
        response_time: 30,
        success_rate: 91,
        guidelines: 'E-commerce guides must be practical and actionable.',
        categories: ['Business', 'Marketing'],
        language: 'en',
        region: 'us',
        created_at: new Date(
          Date.now() - 85 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'site-8',
        domain: 'gamingzone.example.com',
        url: 'https://gamingzone.example.com',
        title: 'Gaming Zone',
        description: 'Video game reviews, gaming news, and esports coverage.',
        niche: ['Gaming', 'Entertainment'],
        domain_authority: 40,
        page_authority: 35,
        spam_score: 15,
        traffic: 35000,
        credits_required: 25,
        quality_score: 68,
        available: true,
        response_time: 48,
        success_rate: 82,
        guidelines:
          'Game reviews must be based on actual gameplay. No piracy content.',
        categories: ['Gaming', 'Entertainment'],
        language: 'en',
        region: 'us',
        created_at: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Filter mock data
    let filteredSites = mockSites.filter((site) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !site.domain.toLowerCase().includes(searchLower) &&
          !site.title.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // DA range filter
      if (min_da !== undefined && site.domain_authority < min_da) {
        return false;
      }
      if (max_da !== undefined && site.domain_authority > max_da) {
        return false;
      }

      // PA range filter
      if (min_pa !== undefined && site.page_authority < min_pa) {
        return false;
      }
      if (max_pa !== undefined && site.page_authority > max_pa) {
        return false;
      }

      // Spam score filter
      if (max_spam_score !== undefined && site.spam_score > max_spam_score) {
        return false;
      }

      // Quality score filter
      if (
        min_quality_score !== undefined &&
        site.quality_score < min_quality_score
      ) {
        return false;
      }

      // Niche filter
      if (niches && niches.length > 0) {
        if (!niches.some((n) => site.niche.includes(n))) {
          return false;
        }
      }

      // Credits filter
      if (max_credits !== undefined && site.credits_required > max_credits) {
        return false;
      }

      // Traffic filter
      if (min_traffic !== undefined && (site.traffic || 0) < min_traffic) {
        return false;
      }

      // Language filter
      if (language && site.language !== language) {
        return false;
      }

      // Region filter
      if (region && site.region !== region) {
        return false;
      }

      return true;
    });

    // Sort filtered sites
    filteredSites.sort((a, b) => {
      let comparison = 0;

      switch (sort) {
        case 'domain_authority':
          comparison = a.domain_authority - b.domain_authority;
          break;
        case 'page_authority':
          comparison = a.page_authority - b.page_authority;
          break;
        case 'quality_score':
          comparison = a.quality_score - b.quality_score;
          break;
        case 'credits_required':
          comparison = a.credits_required - b.credits_required;
          break;
        case 'traffic':
          comparison = (a.traffic || 0) - (b.traffic || 0);
          break;
        case 'success_rate':
          comparison = a.success_rate - b.success_rate;
          break;
        case 'response_time':
          comparison = (a.response_time || 999) - (b.response_time || 999);
          break;
        case 'relevance_score':
          // Sort by relevance if article context provided
          if (article_title) {
            const scoreA = calculateRelevanceScore(
              {
                title: article_title,
                category: article_category,
                tags: article_tags,
              },
              a
            );
            const scoreB = calculateRelevanceScore(
              {
                title: article_title,
                category: article_category,
                tags: article_tags,
              },
              b
            );
            comparison = scoreA - scoreB;
          } else {
            comparison = a.quality_score - b.quality_score;
          }
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    // Add relevance scores to sites if article context provided
    let sitesWithScores = filteredSites;
    if (article_title) {
      sitesWithScores = filteredSites.map((site) => ({
        ...site,
        relevance_score: calculateRelevanceScore(
          {
            title: article_title,
            category: article_category,
            tags: article_tags,
          },
          site
        ),
      }));
    }

    // Apply pagination
    const paginatedSites = sitesWithScores.slice(offset, offset + limit);

    return NextResponse.json({
      sites: paginatedSites,
      total: sitesWithScores.length,
      pagination: {
        limit,
        offset,
        total: sitesWithScores.length,
      },
      has_relevance_scores: !!article_title,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching marketplace sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace sites' },
      { status: 500 }
    );
  }
}
