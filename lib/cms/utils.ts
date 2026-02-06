/**
 * CMS Utility Functions
 *
 * This file contains utility functions for content formatting,
 * tag management, and other common CMS operations.
 */

/**
 * Convert Markdown content to HTML
 *
 * This is a basic implementation that handles common Markdown patterns.
 * For production use, consider using a library like 'marked' or 'remark'.
 *
 * @param markdown - The Markdown content to convert
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Escape HTML special characters (except for already converted elements)
  html = escapeHtmlCharacters(html);

  // Convert code blocks first (to preserve their content)
  html = convertCodeBlocks(html);

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert headings (h1 - h6)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Convert bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Convert strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<figure><img src="$2" alt="$1"><figcaption>$1</figcaption></figure>'
  );

  // Convert blockquotes
  html = convertBlockquotes(html);

  // Convert unordered lists
  html = convertUnorderedLists(html);

  // Convert ordered lists
  html = convertOrderedLists(html);

  // Convert horizontal rules
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>');

  // Convert paragraphs (lines that are not already wrapped in tags)
  html = convertParagraphs(html);

  return html.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtmlCharacters(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert fenced code blocks
 */
function convertCodeBlocks(html: string): string {
  // Handle fenced code blocks with language
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    // Restore escaped characters in code blocks
    const decodedCode = code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    return `<pre><code${langClass}>${decodedCode.trim()}</code></pre>`;
  });

  return html;
}

/**
 * Convert blockquotes
 */
function convertBlockquotes(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inBlockquote = false;
  let blockquoteContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^>\s?(.*)$/);
    if (match) {
      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteContent = [];
      }
      blockquoteContent.push(match[1]);
    } else {
      if (inBlockquote) {
        result.push(
          `<blockquote>${blockquoteContent.join('<br>')}</blockquote>`
        );
        inBlockquote = false;
        blockquoteContent = [];
      }
      result.push(line);
    }
  }

  if (inBlockquote) {
    result.push(`<blockquote>${blockquoteContent.join('<br>')}</blockquote>`);
  }

  return result.join('\n');
}

/**
 * Convert unordered lists
 */
function convertUnorderedLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  for (const line of lines) {
    const match = line.match(/^[\*\-\+]\s+(.+)$/);
    if (match) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(`<li>${match[1]}</li>`);
    } else {
      if (inList) {
        result.push(`<ul>${listItems.join('')}</ul>`);
        inList = false;
        listItems = [];
      }
      result.push(line);
    }
  }

  if (inList) {
    result.push(`<ul>${listItems.join('')}</ul>`);
  }

  return result.join('\n');
}

/**
 * Convert ordered lists
 */
function convertOrderedLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\d+\.\s+(.+)$/);
    if (match) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(`<li>${match[1]}</li>`);
    } else {
      if (inList) {
        result.push(`<ol>${listItems.join('')}</ol>`);
        inList = false;
        listItems = [];
      }
      result.push(line);
    }
  }

  if (inList) {
    result.push(`<ol>${listItems.join('')}</ol>`);
  }

  return result.join('\n');
}

/**
 * Convert paragraphs
 */
function convertParagraphs(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let paragraph: string[] = [];

  const isBlockElement = (line: string): boolean => {
    return /^<(h[1-6]|ul|ol|li|pre|code|blockquote|figure|hr|p)/.test(
      line.trim()
    );
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      // Empty line - flush paragraph
      if (paragraph.length > 0) {
        result.push(`<p>${paragraph.join(' ')}</p>`);
        paragraph = [];
      }
    } else if (isBlockElement(trimmedLine)) {
      // Block element - flush paragraph and add line
      if (paragraph.length > 0) {
        result.push(`<p>${paragraph.join(' ')}</p>`);
        paragraph = [];
      }
      result.push(line);
    } else {
      // Regular text - add to paragraph
      paragraph.push(trimmedLine);
    }
  }

  // Flush remaining paragraph
  if (paragraph.length > 0) {
    result.push(`<p>${paragraph.join(' ')}</p>`);
  }

  return result.join('\n');
}

/**
 * Sanitize and limit tags for CMS platforms
 *
 * @param tags - Array of tags to sanitize
 * @param maxTags - Maximum number of tags allowed (default: 5 for Medium)
 * @returns Sanitized array of tags
 */
export function sanitizeTags(tags: string[], maxTags: number = 5): string[] {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }

  return (
    tags
      // Remove empty strings and whitespace-only tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      // Remove duplicates (case-insensitive)
      .filter(
        (tag, index, self) =>
          self.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === index
      )
      // Limit to maxTags
      .slice(0, maxTags)
      // Clean up tag format (alphanumeric, spaces, hyphens)
      .map((tag) => {
        // Remove special characters except spaces and hyphens
        return tag
          .replace(/[^a-zA-Z0-9\s\-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      })
      .filter((tag) => tag.length > 0)
  );
}

/**
 * Validate a URL string
 *
 * @param url - The URL to validate
 * @returns Whether the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Generate a slug from a title
 *
 * @param title - The title to convert
 * @returns URL-friendly slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract plain text from HTML
 *
 * @param html - The HTML content
 * @returns Plain text without HTML tags
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
