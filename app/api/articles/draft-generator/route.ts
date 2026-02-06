/**
 * Article Draft Generator API Route
 *
 * POST /api/articles/draft-generator - Generate an article draft from outline
 * GET /api/articles/draft-generator - Get article drafts
 * PATCH /api/articles/draft-generator - Update a draft
 * DELETE /api/articles/draft-generator - Delete a draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import {
  generateArticleDraft,
  saveDraftToDatabase,
  listOrganizationDrafts,
  getDraftById,
  deleteDraft,
} from '@/lib/article-draft-generator';
import { ArticleDraftGeneratorError } from '@/types/article-draft-generator';
import {
  generateArticleDraftSchema,
  getArticleDraftSchema,
  updateArticleDraftSchema,
  deleteArticleDraftSchema,
  listArticleDraftsQuerySchema,
  validateRequest,
  type ValidationResult,
} from '@/lib/schemas';

// ============================================================================
// POST - Generate Article Draft
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = validateRequest(body, generateArticleDraftSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify user has access to the organization
    // (In production, you'd verify organization membership here)

    // Generate article draft
    const response = await generateArticleDraft(data);

    // Save to database (optional, can be controlled by request)
    const saveToDb = body.save_to_db !== false; // Default: true
    let draftId: string | undefined;

    if (saveToDb) {
      draftId = await saveDraftToDatabase(data.organization_id, data, response);
    }

    return NextResponse.json({
      success: true,
      data: {
        draft_id: draftId,
        ...response,
      },
    });
  } catch (error) {
    console.error('Article draft generation error:', error);

    if (error instanceof ArticleDraftGeneratorError) {
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          details: error.details,
        },
        { status: getErrorStatusCode(error.type) }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate article draft' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List or Get Article Drafts
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Check if getting a single draft
    const draftId = searchParams.get('id');
    const organizationId = searchParams.get('organization_id');

    if (draftId && organizationId) {
      // Get single draft
      const validationResult = validateRequest(
        { id: draftId, organization_id: organizationId },
        getArticleDraftSchema
      );

      if (!validationResult.success) {
        return NextResponse.json(
          { error: validationResult.error },
          { status: 400 }
        );
      }

      const draft = await getDraftById(draftId, organizationId);

      if (!draft) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: draft,
      });
    }

    // List drafts with query parameters
    const queryResult: ValidationResult = validateRequest(
      Object.fromEntries(searchParams.entries()),
      listArticleDraftsQuerySchema
    );

    if (!queryResult.success || !queryResult.data) {
      return NextResponse.json({ error: queryResult.error }, { status: 400 });
    }

    const {
      limit = 20,
      offset = 0,
      status,
      organization_id,
    } = queryResult.data;

    const drafts = await listOrganizationDrafts(organization_id, {
      limit,
      offset,
      status,
    });

    return NextResponse.json({
      success: true,
      data: drafts,
      meta: {
        limit,
        offset,
        count: drafts.length,
      },
    });
  } catch (error) {
    console.error('Article draft retrieval error:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve article drafts' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update Article Draft
// ============================================================================

export async function PATCH(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = validateRequest(body, updateArticleDraftSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get existing draft
    const existingDraft = await getDraftById(data.id, data.organization_id);

    if (!existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Apply updates
    const updates: Record<string, unknown> = {};
    const metadata = (existingDraft.metadata as Record<string, unknown>) || {};

    if (data.content_updates) {
      if (data.content_updates.title)
        updates.title = data.content_updates.title;
      if (data.content_updates.content)
        updates.content = data.content_updates.content;
      if (data.content_updates.excerpt)
        updates.excerpt = data.content_updates.excerpt;

      // Handle internal link additions/removals
      if (
        data.content_updates.add_internal_link ||
        data.content_updates.remove_internal_link
      ) {
        const internalLinks = (metadata.internal_links || []) as Array<{
          anchor_text: string;
          target_keyword: string;
        }>;

        if (data.content_updates.add_internal_link) {
          internalLinks.push(data.content_updates.add_internal_link);
        }

        if (data.content_updates.remove_internal_link) {
          const toRemove = data.content_updates.remove_internal_link;
          const index = internalLinks.findIndex(
            (l) => l.anchor_text === toRemove.anchor_text
          );
          if (index >= 0) internalLinks.splice(index, 1);
        }

        metadata.internal_links = internalLinks;
      }
    }

    if (data.regen_metadata) {
      metadata.word_count = data.regen_metadata.word_count;
      metadata.keyword_density = data.regen_metadata.keyword_density;
    }

    if (Object.keys(updates).length > 0) {
      updates.metadata = metadata;
      updates.updated_at = new Date().toISOString();

      // Update in database
      const { getSupabaseServerClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseServerClient();

      const { error } = await (supabase as any)
        .from('articles')
        .update(updates)
        .eq('id', data.id)
        .eq('organization_id', data.organization_id);

      if (error) {
        throw new Error(`Failed to update draft: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...existingDraft, ...updates },
    });
  } catch (error) {
    console.error('Article draft update error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update article draft',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Article Draft
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = validateRequest(body, deleteArticleDraftSchema);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    if (!data) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Delete draft
    await deleteDraft(data.id, data.organization_id);

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    });
  } catch (error) {
    console.error('Article draft deletion error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete article draft',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Maps error types to HTTP status codes
 */
function getErrorStatusCode(errorType: string): number {
  const statusMap: Record<string, number> = {
    API_KEY_MISSING: 500,
    INVALID_INPUT: 400,
    OUTLINE_REQUIRED: 400,
    KEYWORD_REQUIRED: 400,
    WORD_COUNT_OUT_OF_RANGE: 400,
    GENERATION_FAILED: 500,
    RATE_LIMIT_EXCEEDED: 429,
    CONTENT_POLICY_VIOLATION: 400,
    BRAND_VOICE_NOT_FOUND: 404,
    UNKNOWN_ERROR: 500,
  };

  return statusMap[errorType] || 500;
}
