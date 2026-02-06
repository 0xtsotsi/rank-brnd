/**
 * Publish Article to CMS API Route
 * Handles single and bulk publishing of articles to CMS platforms
 *
 * POST /api/articles/[id]/publish - Publish a single article to CMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { publishArticleToCMSSchema, validateRequest } from '@/lib/schemas';
import {
  getArticleById,
  publishArticleToCMS,
  getOrganizationIntegrations,
} from '@/lib/supabase/articles';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/articles/[id]/publish
 * Publish a single article to a CMS platform (adds to publishing queue)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const articleId = params.id;

    const body = await request.json();
    const validationResult = validateRequest(body, publishArticleToCMSSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Get the article to verify it exists and get organization info
    const articleResult = await getArticleById(client, articleId);

    if (!articleResult.success) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articleResult.data;

    // Check if user has admin/owner access to the article's organization
    const { data: memberRole } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', article.organization_id)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Only organization admins and owners can publish articles' },
        { status: 403 }
      );
    }

    // If integration_id is provided, verify it exists and belongs to the organization
    const publishOptions = {
      integrationId: validationResult.data.integration_id,
      platform: validationResult.data.platform,
      scheduledFor: validationResult.data.scheduled_for,
      priority: validationResult.data.priority,
      metadata: validationResult.data.metadata,
    };

    if (publishOptions.integrationId) {
      const { data: integration } = await client
        .from('integrations')
        .select('id, platform, status')
        .eq('id', publishOptions.integrationId)
        .eq('organization_id', article.organization_id)
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
      if (!publishOptions.platform) {
        publishOptions.platform = (integration as any).platform as any;
      }
    }

    // If no integration or platform specified, try to find the default integration for this organization
    if (!publishOptions.platform && !publishOptions.integrationId) {
      const integrationsResult = await getOrganizationIntegrations(
        client,
        article.organization_id
      );

      if (integrationsResult.success && integrationsResult.data.length > 0) {
        // Use the first active integration
        publishOptions.integrationId = integrationsResult.data[0].id;
        publishOptions.platform = integrationsResult.data[0].platform as any;
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

    // Publish the article to CMS (adds to publishing queue)
    const result = await publishArticleToCMS(client, articleId, publishOptions);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      queueItemId: result.data.queueItemId,
      article: result.data.article,
      message: publishOptions.scheduledFor
        ? `Article scheduled for publishing on ${new Date(publishOptions.scheduledFor).toLocaleString()}`
        : 'Article queued for publishing',
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/articles/[id]/publish');
  }
}
