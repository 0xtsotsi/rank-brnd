/**
 * Bulk Publish Articles API Route
 * Handles bulk publishing of articles to CMS platforms
 *
 * POST /api/articles/publish/bulk - Publish multiple articles to CMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { bulkPublishArticlesSchema, validateRequest } from '@/lib/schemas';
import {
  getArticleById,
  bulkPublishArticlesToCMS,
  getOrganizationIntegrations,
} from '@/lib/supabase/articles';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/articles/publish/bulk
 * Publish multiple articles to a CMS platform (adds to publishing queue)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, bulkPublishArticlesSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { article_ids, ...publishOptions } = validationResult.data;

    const client = getSupabaseServerClient();

    // Get the first article to determine the organization and validate access
    const firstArticleResult = await getArticleById(client, article_ids[0]);

    if (!firstArticleResult.success) {
      return NextResponse.json(
        { error: 'First article not found' },
        { status: 404 }
      );
    }

    const organizationId = firstArticleResult.data.organization_id;

    // Check if user has admin/owner access to the organization
    const { data: memberRole } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Only organization admins and owners can publish articles' },
        { status: 403 }
      );
    }

    // Verify all articles belong to the same organization
    const articlesOrgCheck = await client
      .from('articles')
      .select('id, organization_id')
      .in('id', article_ids)
      .is('deleted_at', null);

    if (articlesOrgCheck.error) {
      return NextResponse.json(
        { error: 'Failed to verify articles' },
        { status: 500 }
      );
    }

    const articles = articlesOrgCheck.data || [];

    // Check if all requested articles exist and belong to the organization
    const foundIds = new Set(articles.map((a) => (a as any).id));
    const missingIds = article_ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Some articles not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    const invalidOrgArticles = articles.filter(
      (a) => (a as any).organization_id !== organizationId
    );

    if (invalidOrgArticles.length > 0) {
      return NextResponse.json(
        { error: 'All articles must belong to the same organization' },
        { status: 400 }
      );
    }

    // Prepare publish options
    const bulkPublishOptions = {
      integrationId: publishOptions.integration_id,
      platform: publishOptions.platform,
      scheduledFor: publishOptions.scheduled_for,
      priority: publishOptions.priority,
      metadata: publishOptions.metadata,
    };

    // If integration_id is provided, verify it exists and belongs to the organization
    if (bulkPublishOptions.integrationId) {
      const { data: integration } = await client
        .from('integrations')
        .select('id, platform, status')
        .eq('id', bulkPublishOptions.integrationId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!integration) {
        return NextResponse.json(
          {
            error:
              'Integration not found or does not belong to your organization',
          },
          { status: 404 }
        );
      }

      if ((integration as any).status !== 'active') {
        return NextResponse.json(
          { error: 'Integration is not active' },
          { status: 400 }
        );
      }

      // Use the platform from the integration if not explicitly provided
      if (!bulkPublishOptions.platform) {
        bulkPublishOptions.platform = (integration as any).platform as any;
      }
    }

    // If no integration or platform specified, try to find the default integration
    if (!bulkPublishOptions.platform && !bulkPublishOptions.integrationId) {
      const integrationsResult = await getOrganizationIntegrations(
        client,
        organizationId
      );

      if (integrationsResult.success && integrationsResult.data.length > 0) {
        // Use the first active integration
        bulkPublishOptions.integrationId = integrationsResult.data[0].id;
        bulkPublishOptions.platform = integrationsResult.data[0]
          .platform as any;
      } else {
        return NextResponse.json(
          {
            error:
              'No active CMS integration found. Please connect a CMS platform first.',
          },
          { status: 400 }
        );
      }
    }

    // Bulk publish the articles to CMS (adds to publishing queue)
    const result = await bulkPublishArticlesToCMS(
      client,
      article_ids,
      bulkPublishOptions
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      queueItemIds: result.data.queueItemIds,
      successful: result.data.successful,
      failed: result.data.failed,
      total: article_ids.length,
      message: bulkPublishOptions.scheduledFor
        ? `${result.data.successful} articles scheduled for publishing on ${new Date(bulkPublishOptions.scheduledFor).toLocaleString()}`
        : `${result.data.successful} articles queued for publishing`,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/articles/publish/bulk');
  }
}
