/**
 * External Linking Stage
 *
 * Analyzes content and generates external link opportunities
 * to authoritative sources for citations.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';

/**
 * Execute external linking stage
 */
export async function executeExternalLinking(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const { organizationId, userId, options, keyword } = context;

  // Check if stage should be skipped
  if (options.skipExternalLinking) {
    console.log('[Pipeline] Skipping external linking stage');
    return data;
  }

  console.log('[Pipeline] Generating external link opportunities');

  try {
    const content = data.content || '';
    const title = data.title || '';

    if (!content) {
      console.log('[Pipeline] No content available for external link analysis');
      return {
        ...data,
        externalLinkOpportunities: [],
      };
    }

    // Dynamically import the external linking service
    const { matchContentWithSources, DEFAULT_GLOBAL_SOURCES } =
      await import('@/lib/external-linking');

    // Use global sources if authority sources are included
    const globalSources =
      options.includeAuthoritySources !== false ? DEFAULT_GLOBAL_SOURCES : [];

    // Match content with sources
    const opportunities = matchContentWithSources(
      content as any,
      globalSources as any
    );

    console.log(
      `[Pipeline] Generated ${opportunities.length} external link opportunities`
    );

    // Convert to pipeline format
    const externalLinkOpportunities = opportunities.map((opp: any) => ({
      url: opp.suggested_url || '',
      anchorText: opp.suggested_anchor_text || '',
      contextSnippet: opp.context_snippet || '',
      relevanceScore: opp.relevance_score || 0,
      authority: opp.domain_authority || 0,
      source: opp.source_name || '',
    }));

    // Auto-apply links if requested
    if (
      options.autoApplyExternalLinks &&
      externalLinkOpportunities.length > 0
    ) {
      console.log('[Pipeline] Auto-applying external links to content');
      // Note: The actual link application would be done here
      // For now, we're just collecting the opportunities
    }

    return {
      ...data,
      externalLinkOpportunities,
    };
  } catch (error) {
    console.error('[Pipeline] External linking failed:', error);
    // Don't fail the pipeline, just continue without external links
    return {
      ...data,
      externalLinkOpportunities: [],
    };
  }
}
