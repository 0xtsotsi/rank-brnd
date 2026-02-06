/**
 * Internal Linking - Link Applicator
 *
 * Applies internal links to article content and manages the application process.
 */

import type { SuggestedInternalLink } from './types';

/**
 * Apply a single internal link to content
 */
function applySingleLink(
  content: string,
  suggestion: SuggestedInternalLink,
  articleBaseUrl: string
): string {
  const {
    suggested_anchor_text,
    target_article_slug,
    position_in_content,
    context_snippet,
  } = suggestion;

  // Create the internal link HTML
  const linkHtml = `<a href="/article/${target_article_slug}" title="${suggested_anchor_text}">${suggested_anchor_text}</a>`;

  // If we have a specific position, use it
  if (
    position_in_content !== null &&
    position_in_content >= 0 &&
    position_in_content < content.length
  ) {
    // Check if there's already a link at this position
    const before = content.substring(
      Math.max(0, position_in_content - 200),
      position_in_content
    );
    const after = content.substring(
      position_in_content,
      Math.min(content.length, position_in_content + 200)
    );

    // Don't insert if there's already a link nearby
    if (before.includes('<a ') || after.includes('<a ')) {
      return content;
    }

    return (
      content.substring(0, position_in_content) +
      linkHtml +
      content.substring(position_in_content)
    );
  }

  // Otherwise, try to find the best place using the context snippet
  if (context_snippet) {
    const escapedSnippet = context_snippet
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');

    // Try to find a close match in the content (allowing for some variation)
    const regex = new RegExp(escapedSnippet.substring(0, 100), 'i');
    const match = content.match(regex);

    if (match && match.index !== undefined) {
      const insertPos = match.index + match[0].length;
      // Check if there's already a link nearby
      const before = content.substring(Math.max(0, insertPos - 200), insertPos);
      const after = content.substring(
        insertPos,
        Math.min(content.length, insertPos + 200)
      );

      if (!before.includes('<a ') && !after.includes('<a ')) {
        return (
          content.substring(0, insertPos) +
          ' ' +
          linkHtml +
          ' ' +
          content.substring(insertPos)
        );
      }
    }
  }

  // Last resort: append to the end of the content
  return content + `<p>Related: ${linkHtml}</p>`;
}

/**
 * Apply internal links to content
 */
export function applyInternalLinksToContent(
  content: string,
  suggestions: SuggestedInternalLink[],
  options: {
    articleBaseUrl?: string;
    maxLinks?: number;
    respectExistingLinks?: boolean;
  } = {}
): {
  updatedContent: string;
  linksApplied: number;
  suggestionsApplied: string[];
  errors: Array<{ suggestion: SuggestedInternalLink; error: string }>;
} {
  const {
    articleBaseUrl = '',
    maxLinks = suggestions.length,
    respectExistingLinks = true,
  } = options;

  let updatedContent = content;
  const linksApplied: string[] = [];
  const errors: Array<{ suggestion: SuggestedInternalLink; error: string }> =
    [];

  // Count existing internal links
  const existingLinkCount = respectExistingLinks
    ? (content.match(/<a\s+[^>]*href=["']\/article\//gi) || []).length
    : 0;

  const remainingSlots = Math.max(0, maxLinks - existingLinkCount);

  // Apply links up to the limit
  for (const suggestion of suggestions.slice(0, remainingSlots)) {
    try {
      const beforeLength = updatedContent.length;
      updatedContent = applySingleLink(
        updatedContent,
        suggestion,
        articleBaseUrl
      );

      if (updatedContent.length !== beforeLength) {
        linksApplied.push(suggestion.target_article_id);
      } else {
        errors.push({
          suggestion,
          error:
            'Link could not be applied (position invalid or already linked)',
        });
      }
    } catch (e) {
      errors.push({
        suggestion,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return {
    updatedContent,
    linksApplied: linksApplied.length,
    suggestionsApplied: linksApplied,
    errors,
  };
}

/**
 * Remove internal links from content
 */
export function removeInternalLinksFromContent(
  content: string,
  targetArticleSlugs: string[]
): string {
  let updatedContent = content;

  for (const slug of targetArticleSlugs) {
    // Remove links to this article
    const linkRegex = new RegExp(
      `<a\\s+[^>]*href=["'](?:\\./|../|/)?article/${slug}[^"']*["'][^>]*>(.*?)<\\/a>`,
      'gi'
    );

    updatedContent = updatedContent.replace(linkRegex, '$1');
  }

  return updatedContent;
}

/**
 * Preview internal links in content (without applying)
 */
export function previewInternalLinksInContent(
  content: string,
  suggestions: SuggestedInternalLink[]
): Array<{
  suggestion: SuggestedInternalLink;
  preview: string;
  position: number;
  willReplace: boolean;
}> {
  return suggestions.map((suggestion) => {
    const { suggested_anchor_text, target_article_slug, position_in_content } =
      suggestion;

    const previewHtml = `<a href="/article/${target_article_slug}" title="${suggested_anchor_text}">${suggested_anchor_text}</a>`;

    const willReplace =
      position_in_content !== null &&
      position_in_content >= 0 &&
      position_in_content < content.length;

    return {
      suggestion,
      preview: previewHtml,
      position: position_in_content || 0,
      willReplace,
    };
  });
}

/**
 * Generate "Related Articles" section HTML
 */
export function generateRelatedArticlesSection(
  relatedArticles: Array<{
    title: string;
    slug: string;
    excerpt?: string | null;
  }>,
  options: {
    title?: string;
    maxArticles?: number;
    showExcerpts?: boolean;
  } = {}
): string {
  const {
    title = 'Related Articles',
    maxArticles = 5,
    showExcerpts = false,
  } = options;

  const articles = relatedArticles.slice(0, maxArticles);

  if (articles.length === 0) {
    return '';
  }

  let html = `<div class="related-articles">\n<h3>${title}</h3>\n<ul>\n`;

  for (const article of articles) {
    html += `  <li>\n`;
    html += `    <a href="/article/${article.slug}">${article.title}</a>\n`;

    if (showExcerpts && article.excerpt) {
      html += `    <p class="excerpt">${article.excerpt}</p>\n`;
    }

    html += `  </li>\n`;
  }

  html += `</ul>\n</div>`;

  return html;
}

/**
 * Validate internal links in content
 */
export function validateInternalLinks(
  content: string,
  validArticleSlugs: string[]
): {
  validLinks: Array<{ slug: string; anchorText: string; position: number }>;
  invalidLinks: Array<{ slug: string; anchorText: string; position: number }>;
  brokenLinks: Array<{ href: string; anchorText: string; position: number }>;
} {
  const validLinks: Array<{
    slug: string;
    anchorText: string;
    position: number;
  }> = [];
  const invalidLinks: Array<{
    slug: string;
    anchorText: string;
    position: number;
  }> = [];
  const brokenLinks: Array<{
    href: string;
    anchorText: string;
    position: number;
  }> = [];

  // Find all internal links
  const linkRegex =
    /<a\s+([^>]*?)href=["'](\/article\/([^"']+)|\.\/article\/([^"']+)|\.\.\/article\/([^"']+))["']([^>]*?)>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const position = match.index;
    const anchorText = match[7].replace(/<[^>]+>/g, '').trim();

    // Extract the slug from various href formats
    const slug = match[3] || match[4] || match[5];

    if (slug) {
      if (validArticleSlugs.includes(slug)) {
        validLinks.push({ slug, anchorText, position });
      } else {
        invalidLinks.push({ slug, anchorText, position });
      }
    } else {
      brokenLinks.push({
        href: match[2] || '',
        anchorText,
        position,
      });
    }
  }

  return {
    validLinks,
    invalidLinks,
    brokenLinks,
  };
}

/**
 * Count internal links in content
 */
export function countInternalLinks(content: string): {
  totalLinks: number;
  uniqueArticles: number;
  linkDetails: Array<{ slug: string; count: number; anchorTexts: string[] }>;
} {
  const linkMap = new Map<string, { count: number; anchorTexts: string[] }>();

  const linkRegex =
    /<a\s+[^>]*href=["'](\/article\/([^"']+)|\.\/article\/([^"']+))["'][^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const slug = match[2] || match[3];
    const anchorText = match[4].replace(/<[^>]+>/g, '').trim();

    if (slug) {
      const existing = linkMap.get(slug);
      if (existing) {
        existing.count++;
        if (!existing.anchorTexts.includes(anchorText)) {
          existing.anchorTexts.push(anchorText);
        }
      } else {
        linkMap.set(slug, { count: 1, anchorTexts: [anchorText] });
      }
    }
  }

  const linkDetails = Array.from(linkMap.entries()).map(([slug, data]) => ({
    slug,
    count: data.count,
    anchorTexts: data.anchorTexts,
  }));

  return {
    totalLinks: linkDetails.reduce((sum, link) => sum + link.count, 0),
    uniqueArticles: linkDetails.length,
    linkDetails,
  };
}
