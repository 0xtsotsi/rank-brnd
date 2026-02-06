/**
 * External Linking - Link Applicator
 *
 * Applies external links to content and marks opportunities as applied.
 */

import type {
  ExternalLinkApplicationResult,
  ExternalLinkOpportunity,
  SuggestedExternalLink,
} from './types';

/**
 * Apply a single external link to content
 */
function applySingleLink(
  content: string,
  suggestion: SuggestedExternalLink,
  options: {
    anchorTextOverride?: string;
    insertPosition?: 'auto' | 'start' | 'end' | 'after_context';
  } = {}
): { content: string; position: number } {
  const { anchorTextOverride, insertPosition = 'auto' } = options;

  const anchorText = anchorTextOverride || suggestion.suggestedAnchorText;
  const linkHtml = `<a href="${suggestion.suggestedUrl}" rel="nofollow" target="_blank">${anchorText}</a>`;

  let newContent = content;
  let actualPosition = suggestion.positionInContent;

  if (insertPosition === 'auto' && suggestion.contextSnippet) {
    // Try to insert near the context
    const keywordLower = suggestion.keywords[0]?.toLowerCase() || '';
    const contextLower = suggestion.contextSnippet.toLowerCase();

    if (contextLower.includes(keywordLower)) {
      // Find the keyword in content and insert link after it
      const contentLower = content.toLowerCase();
      const searchStart = Math.max(0, suggestion.positionInContent - 200);
      const searchEnd = Math.min(
        content.length,
        suggestion.positionInContent + 200
      );
      const searchArea = content.slice(searchStart, searchEnd);
      const searchAreaLower = searchArea.toLowerCase();

      let bestPos = -1;
      let bestDistance = Infinity;

      let offset = 0;
      while (true) {
        const pos = searchAreaLower.indexOf(keywordLower, offset);
        if (pos === -1) break;

        const distance = Math.abs(
          searchStart + pos - suggestion.positionInContent
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPos = searchStart + pos + keywordLower.length;
        }

        offset = pos + 1;
      }

      if (bestPos >= 0) {
        actualPosition = bestPos;
        newContent =
          content.slice(0, bestPos) + ' ' + linkHtml + content.slice(bestPos);
      } else {
        // Fallback to original position
        newContent =
          content.slice(0, suggestion.positionInContent) +
          ' ' +
          linkHtml +
          content.slice(suggestion.positionInContent);
      }
    } else {
      newContent =
        content.slice(0, suggestion.positionInContent) +
        ' ' +
        linkHtml +
        content.slice(suggestion.positionInContent);
    }
  } else if (insertPosition === 'end') {
    // Append at the end of the content
    const lastParagraphMatch = content.match(/<\/p>\s*$/);
    if (lastParagraphMatch) {
      const insertPos = content.lastIndexOf('</p>');
      newContent =
        content.slice(0, insertPos) +
        ` ${linkHtml}</p>` +
        content.slice(insertPos + 4);
      actualPosition = insertPos;
    } else {
      newContent = content + ' ' + linkHtml;
      actualPosition = content.length;
    }
  } else if (insertPosition === 'start') {
    // Insert after the first paragraph/heading
    const firstParagraphMatch = content.match(/<\/h[1-6]>|<\/p>/);
    if (firstParagraphMatch && firstParagraphMatch.index !== undefined) {
      const insertPos =
        firstParagraphMatch.index + firstParagraphMatch[0].length;
      newContent =
        content.slice(0, insertPos) + ' ' + linkHtml + content.slice(insertPos);
      actualPosition = insertPos;
    } else {
      newContent = linkHtml + ' ' + content;
      actualPosition = 0;
    }
  } else {
    // Use the specified position
    newContent =
      content.slice(0, suggestion.positionInContent) +
      ' ' +
      linkHtml +
      content.slice(suggestion.positionInContent);
  }

  return { content: newContent, position: actualPosition };
}

/**
 * Apply external links to content
 */
export function applyExternalLinksToContent(
  content: string,
  suggestions: SuggestedExternalLink[],
  options: {
    anchorTextOverrides?: Map<string, string>; // opportunity ID -> anchor text
    insertPosition?: 'auto' | 'start' | 'end' | 'after_context';
    maxLinks?: number;
  } = {}
): ExternalLinkApplicationResult {
  const {
    anchorTextOverrides = new Map(),
    insertPosition = 'auto',
    maxLinks = suggestions.length,
  } = options;

  const errors: Array<{ opportunityId: string; error: string }> = [];
  const opportunitiesUpdated: string[] = [];
  let updatedContent = content;
  let linksApplied = 0;

  // Sort suggestions by position (descending) to avoid position shifting issues
  const sortedSuggestions = [...suggestions]
    .sort((a, b) => b.positionInContent - a.positionInContent)
    .slice(0, maxLinks);

  // Apply each link
  for (const suggestion of sortedSuggestions) {
    try {
      const anchorTextOverride = anchorTextOverrides.get(suggestion.source.id);
      const result = applySingleLink(updatedContent, suggestion, {
        anchorTextOverride,
        insertPosition,
      });

      updatedContent = result.content;
      linksApplied++;
      opportunitiesUpdated.push(suggestion.source.id);
    } catch (error) {
      errors.push({
        opportunityId: suggestion.source.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: errors.length === 0,
    updatedContent,
    linksApplied,
    opportunitiesUpdated,
    errors,
  };
}

/**
 * Remove external links from content by opportunity ID
 */
export function removeExternalLinksFromContent(
  content: string,
  opportunityIds: string[]
): { content: string; linksRemoved: number } {
  let updatedContent = content;
  let linksRemoved = 0;

  // This is a simplified version - in production, you'd need to track
  // which links were added by which opportunity
  for (const id of opportunityIds) {
    // Look for links with data-opportunity-id attribute
    const regex = new RegExp(
      `<a[^>]*data-opportunity-id="${id}"[^>]*>.*?<\\/a>`,
      'gi'
    );
    const matches = updatedContent.match(regex);
    if (matches) {
      linksRemoved += matches.length;
      updatedContent = updatedContent.replace(regex, '');
    }
  }

  return { content: updatedContent, linksRemoved };
}

/**
 * Generate link HTML with opportunity tracking
 */
export function generateTrackedLinkHtml(
  suggestion: SuggestedExternalLink,
  opportunityId: string
): string {
  const { suggestedUrl, suggestedAnchorText, linkType } = suggestion;

  const relAttrs = ['nofollow'];
  // Add rel attributes based on link type
  if (linkType === 'citation') {
    // Citation links may include educational/reference context
    relAttrs.push('external');
  } else if (linkType === 'reference') {
    // Reference links are for additional resources
    relAttrs.push('external');
  } else {
    // External links
    relAttrs.push('external');
  }

  return `<a href="${suggestedUrl}" rel="${relAttrs.join(' ')}" target="_blank" data-opportunity-id="${opportunityId}" data-external-link="true">${suggestedAnchorText}</a>`;
}

/**
 * Preview link application without modifying content
 */
export function previewExternalLinksInContent(
  content: string,
  suggestions: SuggestedExternalLink[]
): Array<{
  opportunityId: string;
  url: string;
  anchorText: string;
  contextBefore: string;
  contextAfter: string;
  position: number;
}> {
  return suggestions.map((suggestion) => {
    const position = suggestion.positionInContent;
    const contextRadius = 100;

    const contextBefore = content
      .slice(Math.max(0, position - contextRadius), position)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const contextAfter = content
      .slice(position, Math.min(content.length, position + contextRadius))
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      opportunityId: suggestion.source.id,
      url: suggestion.suggestedUrl,
      anchorText: suggestion.suggestedAnchorText,
      contextBefore,
      contextAfter,
      position,
    };
  });
}

/**
 * Validate that external links are properly formatted
 */
export function validateExternalLinks(content: string): {
  valid: boolean;
  errors: string[];
  linkCount: number;
} {
  const errors: string[] = [];
  let linkCount = 0;

  // Find all external links
  const linkRegex =
    /<a\s+(?:[^>]*?\s+)?href=(["'])([^"']+)\1[^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    linkCount++;
    const url = match[2];
    const anchorText = match[3];

    // Validate URL
    try {
      new URL(url);
    } catch {
      errors.push(`Invalid URL: ${url}`);
    }

    // Validate anchor text
    const cleanAnchor = anchorText.replace(/<[^>]+>/g, '').trim();
    if (cleanAnchor.length === 0) {
      errors.push(`Link with empty anchor text: ${url}`);
    }

    // Check for generic anchor text
    if (/^(click here|read more|learn more|here|this)$/i.test(cleanAnchor)) {
      errors.push(`Generic anchor text "${cleanAnchor}" for URL: ${url}`);
    }

    // Check for rel="nofollow" on external links
    const tag = match[0];
    if (!/rel\s*=\s*["'][^"']*nofollow/i.test(tag)) {
      errors.push(`External link missing rel="nofollow": ${url}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    linkCount,
  };
}
