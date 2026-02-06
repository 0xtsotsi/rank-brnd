/**
 * Article Versions Compare API Route
 * Handles comparing two versions of an article
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { compareVersionsQuerySchema, validateRequest } from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Type for article data
type ArticleData = { id: string; organization_id: string };

/**
 * GET /api/articles/[id]/versions/compare
 * Compare two versions of an article
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const articleId = params.id;

    // Validate query parameters
    const queryParams = Object.fromEntries(request.nextUrl.searchParams);
    const validationResult = validateRequest(
      queryParams,
      compareVersionsQuerySchema
    );

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { version1, version2 } = validationResult.data!;

    const client = getSupabaseServerClient();

    // Check if user has access to the article
    const { data: article, error: articleError } = await client
      .from('articles')
      .select(
        `
        id,
        organization_id
      `
      )
      .eq('id', articleId)
      .filter('deleted_at', 'is', null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check organization membership
    const { data: member, error: memberError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (article as ArticleData).organization_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch both versions
    const { data: version1Data, error: v1Error } = await client
      .from('article_versions')
      .select('*')
      .eq('article_id', articleId)
      .eq('version_number', version1)
      .single();

    const { data: version2Data, error: v2Error } = await client
      .from('article_versions')
      .select('*')
      .eq('article_id', articleId)
      .eq('version_number', version2)
      .single();

    if (v1Error || !version1Data) {
      return NextResponse.json(
        { error: `Version ${version1} not found` },
        { status: 404 }
      );
    }

    if (v2Error || !version2Data) {
      return NextResponse.json(
        { error: `Version ${version2} not found` },
        { status: 404 }
      );
    }

    // Compare fields
    const comparison = {
      version1: {
        version_number: (version1Data as any).version_number,
        title: (version1Data as any).title,
        changed_at: (version1Data as any).changed_at,
        changed_by: (version1Data as any).changed_by,
      },
      version2: {
        version_number: (version2Data as any).version_number,
        title: (version2Data as any).title,
        changed_at: (version2Data as any).changed_at,
        changed_by: (version2Data as any).changed_by,
      },
      differences: [] as Array<{
        field: string;
        label: string;
        value1: string | null;
        value2: string | null;
        is_different: boolean;
      }>,
    };

    // Fields to compare
    const fieldsToCompare = [
      { field: 'title', label: 'Title', truncate: false },
      {
        field: 'content',
        label: 'Content',
        truncate: true,
        truncateLength: 1000,
      },
      {
        field: 'excerpt',
        label: 'Excerpt',
        truncate: true,
        truncateLength: 500,
      },
      { field: 'status', label: 'Status', truncate: false },
      { field: 'seo_score', label: 'SEO Score', truncate: false },
      { field: 'word_count', label: 'Word Count', truncate: false },
      { field: 'meta_title', label: 'Meta Title', truncate: false },
      {
        field: 'meta_description',
        label: 'Meta Description',
        truncate: true,
        truncateLength: 500,
      },
      { field: 'tags', label: 'Tags', truncate: false, array: true },
      { field: 'category', label: 'Category', truncate: false },
    ];

    for (const fieldConfig of fieldsToCompare) {
      const value1 = (version1Data as any)[fieldConfig.field];
      const value2 = (version2Data as any)[fieldConfig.field];

      let displayValue1: string | null = null;
      let displayValue2: string | null = null;
      let isDifferent = false;

      if (fieldConfig.array) {
        displayValue1 = Array.isArray(value1)
          ? value1.join(', ')
          : value1 || '';
        displayValue2 = Array.isArray(value2)
          ? value2.join(', ')
          : value2 || '';
        isDifferent = JSON.stringify(value1) !== JSON.stringify(value2);
      } else if (
        fieldConfig.truncate &&
        typeof value1 === 'string' &&
        typeof value2 === 'string'
      ) {
        const truncateLen = (fieldConfig as any).truncateLength || 500;
        displayValue1 = value1
          ? value1.substring(0, truncateLen) +
            (value1.length > truncateLen ? '...' : '')
          : null;
        displayValue2 = value2
          ? value2.substring(0, truncateLen) +
            (value2.length > truncateLen ? '...' : '')
          : null;
        isDifferent = value1 !== value2;
      } else {
        displayValue1 =
          value1 !== null && value1 !== undefined ? String(value1) : null;
        displayValue2 =
          value2 !== null && value2 !== undefined ? String(value2) : null;
        isDifferent = value1 !== value2;
      }

      comparison.differences.push({
        field: fieldConfig.field,
        label: fieldConfig.label,
        value1: displayValue1,
        value2: displayValue2,
        is_different: isDifferent,
      });
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error comparing article versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
