/**
 * Notion CMS Adapter
 *
 * Implements the CMSAdapter interface for Notion using the Notion API.
 * Supports creating database pages, property mapping, and rich text formatting.
 *
 * Notion API Documentation: https://developers.notion.com/
 */

import type {
  NotionConfig,
  NotionPage,
  NotionPageInput,
  NotionPageUpdateInput,
  NotionDatabase,
  NotionUser,
  NotionRichText,
  NotionBlockUnion,
  NotionParagraphBlock,
  NotionHeadingBlock,
  NotionListItemBlock,
  NotionCodeBlock,
  NotionQuoteBlock,
  NotionDividerBlock,
  NotionPropertyValue,
  NotionPropertyMapping,
  NotionResult,
  NotionError,
  NotionPaginatedResponse,
  NotionPagination,
  NotionAnnotations,
  NotionColor,
} from '@/types/notion';
import { DEFAULT_PROPERTY_MAPPING } from '@/types/notion';

import type {
  CMSAdapter,
  CMSPost,
  CMSUser,
  CMSPublication,
  PublishResult,
} from './types';

import { CMSError } from './types';

/**
 * Notion CMS Adapter
 *
 * @example
 * ```typescript
 * const notion = new NotionAdapter({
 *   integrationToken: 'secret_xxx',
 *   defaultDatabaseId: 'your-database-id',
 * });
 *
 * // Publish a post (creates a page in the database)
 * const result = await notion.publish({
 *   title: 'My Post',
 *   content: 'Post content in markdown...',
 *   tags: ['technology', 'news'],
 * });
 * ```
 */
export class NotionAdapter implements CMSAdapter {
  readonly name = 'Notion';

  private readonly config: NotionConfig;
  private readonly baseUrl = 'https://api.notion.com/v1';
  private readonly apiVersion = '2022-06-28';
  private propertyMapping: NotionPropertyMapping;

  constructor(
    config: NotionConfig,
    propertyMapping?: Partial<NotionPropertyMapping>
  ) {
    this.config = config;
    this.propertyMapping = {
      ...DEFAULT_PROPERTY_MAPPING,
      ...propertyMapping,
    };
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.integrationToken && this.config.defaultDatabaseId);
  }

  /**
   * Set custom property mapping for database schema
   */
  setPropertyMapping(mapping: Partial<NotionPropertyMapping>): void {
    this.propertyMapping = {
      ...this.propertyMapping,
      ...mapping,
    };
  }

  /**
   * Make an authenticated request to Notion API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.integrationToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.apiVersion,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new CMSError(
        errorData.message || `Notion API error: ${response.statusText}`,
        errorData.code || 'API_ERROR',
        response.status,
        { details: errorData }
      );
    }

    return response.json();
  }

  // =====================
  // CMSAdapter Interface
  // =====================

  /**
   * Publish a post to Notion (creates a page in the default database)
   */
  async publish(post: CMSPost): Promise<PublishResult> {
    if (!this.config.defaultDatabaseId) {
      throw new CMSError(
        'Default database ID is required to publish',
        'MISSING_DATABASE_ID'
      );
    }

    const properties = this.mapPostToProperties(post);
    const content = this.markdownToBlocks(post.content);

    const pageInput: NotionPageInput = {
      databaseId: this.config.defaultDatabaseId,
      properties,
      content,
    };

    const result = await this.createPage(pageInput);

    if (!result.success) {
      throw new CMSError(
        result.error.message,
        result.error.code || 'PUBLISH_ERROR',
        result.error.status,
        { details: result.error.details }
      );
    }

    return {
      success: true,
      postId: result.data.id,
      url: result.data.url,
      metadata: {
        publicUrl: result.data.public_url,
        createdTime: result.data.created_time,
        lastEditedTime: result.data.last_edited_time,
      },
    };
  }

  /**
   * Get authenticated user information (the integration bot)
   */
  async getUser(): Promise<CMSUser> {
    const response = await this.request<NotionUser>('/users/me');

    return {
      id: response.id,
      username: response.bot?.workspace_name || 'notion-integration',
      name: response.name || 'Notion Integration',
      imageUrl: response.avatar_url || undefined,
    };
  }

  /**
   * Get available databases as publications
   */
  async getPublications(): Promise<CMSPublication[]> {
    const response = await this.searchDatabases();

    if (!response.success) {
      return [];
    }

    return response.data.results.map((db) => ({
      id: db.id,
      name: this.richTextToPlainText(db.title),
      description: this.richTextToPlainText(db.description),
      url: db.url,
      imageUrl:
        db.icon?.type === 'external' ? db.icon.external?.url : undefined,
    }));
  }

  // =====================
  // Page Management
  // =====================

  /**
   * Create a new page in a database
   */
  async createPage(input: NotionPageInput): Promise<NotionResult<NotionPage>> {
    try {
      const body: Record<string, unknown> = {
        parent: {
          type: 'database_id',
          database_id: input.databaseId,
        },
        properties: input.properties,
      };

      if (input.content && input.content.length > 0) {
        body.children = input.content;
      }

      if (input.icon) {
        body.icon = input.icon;
      }

      if (input.cover) {
        body.cover = input.cover;
      }

      const response = await this.request<NotionPage>('/pages', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing page
   */
  async updatePage(
    pageId: string,
    input: NotionPageUpdateInput
  ): Promise<NotionResult<NotionPage>> {
    try {
      const body: Record<string, unknown> = {};

      if (input.properties) {
        body.properties = input.properties;
      }

      if (input.archived !== undefined) {
        body.archived = input.archived;
      }

      if (input.icon !== undefined) {
        body.icon = input.icon;
      }

      if (input.cover !== undefined) {
        body.cover = input.cover;
      }

      const response = await this.request<NotionPage>(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a page by ID
   */
  async getPage(pageId: string): Promise<NotionResult<NotionPage>> {
    try {
      const response = await this.request<NotionPage>(`/pages/${pageId}`);
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Archive (soft delete) a page
   */
  async archivePage(pageId: string): Promise<NotionResult<NotionPage>> {
    return this.updatePage(pageId, { archived: true });
  }

  /**
   * Restore an archived page
   */
  async restorePage(pageId: string): Promise<NotionResult<NotionPage>> {
    return this.updatePage(pageId, { archived: false });
  }

  // =====================
  // Database Management
  // =====================

  /**
   * Get a database by ID
   */
  async getDatabase(databaseId: string): Promise<NotionResult<NotionDatabase>> {
    try {
      const response = await this.request<NotionDatabase>(
        `/databases/${databaseId}`
      );
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Query a database with filters and sorts
   */
  async queryDatabase(
    databaseId: string,
    options?: {
      filter?: Record<string, unknown>;
      sorts?: Array<{
        property?: string;
        timestamp?: string;
        direction: 'ascending' | 'descending';
      }>;
      pagination?: NotionPagination;
    }
  ): Promise<NotionResult<NotionPaginatedResponse<NotionPage>>> {
    try {
      const body: Record<string, unknown> = {};

      if (options?.filter) {
        body.filter = options.filter;
      }

      if (options?.sorts) {
        body.sorts = options.sorts;
      }

      if (options?.pagination?.start_cursor) {
        body.start_cursor = options.pagination.start_cursor;
      }

      if (options?.pagination?.page_size) {
        body.page_size = options.pagination.page_size;
      }

      const response = await this.request<NotionPaginatedResponse<NotionPage>>(
        `/databases/${databaseId}/query`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Search for databases
   */
  async searchDatabases(
    query?: string
  ): Promise<NotionResult<NotionPaginatedResponse<NotionDatabase>>> {
    try {
      const body: Record<string, unknown> = {
        filter: { property: 'object', value: 'database' },
      };

      if (query) {
        body.query = query;
      }

      const response = await this.request<
        NotionPaginatedResponse<NotionDatabase>
      >('/search', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Block Management
  // =====================

  /**
   * Append blocks to a page
   */
  async appendBlocks(
    pageId: string,
    blocks: NotionBlockUnion[]
  ): Promise<NotionResult<NotionPaginatedResponse<NotionBlockUnion>>> {
    try {
      const response = await this.request<
        NotionPaginatedResponse<NotionBlockUnion>
      >(`/blocks/${pageId}/children`, {
        method: 'PATCH',
        body: JSON.stringify({ children: blocks }),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get blocks from a page
   */
  async getBlocks(
    blockId: string,
    pagination?: NotionPagination
  ): Promise<NotionResult<NotionPaginatedResponse<NotionBlockUnion>>> {
    try {
      const params = new URLSearchParams();

      if (pagination?.start_cursor) {
        params.set('start_cursor', pagination.start_cursor);
      }

      if (pagination?.page_size) {
        params.set('page_size', pagination.page_size.toString());
      }

      const query = params.toString();
      const url = `/blocks/${blockId}/children${query ? `?${query}` : ''}`;

      const response =
        await this.request<NotionPaginatedResponse<NotionBlockUnion>>(url);

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Property Mapping
  // =====================

  /**
   * Map CMSPost to Notion page properties
   */
  private mapPostToProperties(
    post: CMSPost
  ): Record<string, NotionPropertyValue> {
    const properties: Record<string, NotionPropertyValue> = {};

    // Title (required)
    properties[this.propertyMapping.titleProperty] = {
      type: 'title',
      title: this.textToRichText(post.title),
    };

    // Tags (multi_select)
    if (
      post.tags &&
      post.tags.length > 0 &&
      this.propertyMapping.tagsProperty
    ) {
      properties[this.propertyMapping.tagsProperty] = {
        type: 'multi_select',
        multi_select: post.tags.map((tag) => ({ name: tag })),
      };
    }

    // Status (select or status)
    if (post.publishStatus && this.propertyMapping.statusProperty) {
      const statusMap: Record<string, string> = {
        draft: 'Draft',
        public: 'Published',
        unlisted: 'Unlisted',
      };

      properties[this.propertyMapping.statusProperty] = {
        type: 'select',
        select: { name: statusMap[post.publishStatus] || 'Draft' },
      };
    }

    // Canonical URL
    if (post.canonicalUrl && this.propertyMapping.canonicalUrlProperty) {
      properties[this.propertyMapping.canonicalUrlProperty] = {
        type: 'url',
        url: post.canonicalUrl,
      };
    }

    // Published date
    if (this.propertyMapping.publishedDateProperty) {
      properties[this.propertyMapping.publishedDateProperty] = {
        type: 'date',
        date: { start: new Date().toISOString() },
      };
    }

    return properties;
  }

  // =====================
  // Rich Text Formatting
  // =====================

  /**
   * Convert plain text to rich text array
   */
  textToRichText(
    text: string,
    annotations?: NotionAnnotations
  ): NotionRichText[] {
    return [
      {
        type: 'text',
        text: { content: text },
        annotations: annotations || {},
      },
    ];
  }

  /**
   * Create a rich text item with link
   */
  createLink(
    text: string,
    url: string,
    annotations?: NotionAnnotations
  ): NotionRichText {
    return {
      type: 'text',
      text: {
        content: text,
        link: { url },
      },
      annotations: annotations || {},
    };
  }

  /**
   * Create bold text
   */
  createBoldText(text: string): NotionRichText[] {
    return this.textToRichText(text, { bold: true });
  }

  /**
   * Create italic text
   */
  createItalicText(text: string): NotionRichText[] {
    return this.textToRichText(text, { italic: true });
  }

  /**
   * Create code text (inline)
   */
  createCodeText(text: string): NotionRichText[] {
    return this.textToRichText(text, { code: true });
  }

  /**
   * Create strikethrough text
   */
  createStrikethroughText(text: string): NotionRichText[] {
    return this.textToRichText(text, { strikethrough: true });
  }

  /**
   * Create underlined text
   */
  createUnderlineText(text: string): NotionRichText[] {
    return this.textToRichText(text, { underline: true });
  }

  /**
   * Create colored text
   */
  createColoredText(text: string, color: NotionColor): NotionRichText[] {
    return this.textToRichText(text, { color });
  }

  /**
   * Convert rich text array to plain text
   */
  richTextToPlainText(richText: NotionRichText[]): string {
    return richText
      .map((rt) => rt.plain_text || rt.text?.content || '')
      .join('');
  }

  // =====================
  // Block Builders
  // =====================

  /**
   * Create a paragraph block
   */
  createParagraph(
    text: string | NotionRichText[],
    color?: NotionColor
  ): NotionParagraphBlock {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: typeof text === 'string' ? this.textToRichText(text) : text,
        color,
      },
    };
  }

  /**
   * Create a heading block
   */
  createHeading(
    level: 1 | 2 | 3,
    text: string | NotionRichText[],
    color?: NotionColor
  ): NotionHeadingBlock {
    const richText =
      typeof text === 'string' ? this.textToRichText(text) : text;
    const type = `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3';

    return {
      object: 'block',
      type,
      [`heading_${level}`]: {
        rich_text: richText,
        color,
      },
    } as NotionHeadingBlock;
  }

  /**
   * Create a bulleted list item
   */
  createBulletedListItem(
    text: string | NotionRichText[],
    color?: NotionColor
  ): NotionListItemBlock {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: typeof text === 'string' ? this.textToRichText(text) : text,
        color,
      },
    };
  }

  /**
   * Create a numbered list item
   */
  createNumberedListItem(
    text: string | NotionRichText[],
    color?: NotionColor
  ): NotionListItemBlock {
    return {
      object: 'block',
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: typeof text === 'string' ? this.textToRichText(text) : text,
        color,
      },
    };
  }

  /**
   * Create a code block
   */
  createCodeBlock(
    code: string,
    language: string = 'plain text'
  ): NotionCodeBlock {
    return {
      object: 'block',
      type: 'code',
      code: {
        rich_text: this.textToRichText(code),
        language,
      },
    };
  }

  /**
   * Create a quote block
   */
  createQuote(
    text: string | NotionRichText[],
    color?: NotionColor
  ): NotionQuoteBlock {
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: typeof text === 'string' ? this.textToRichText(text) : text,
        color,
      },
    };
  }

  /**
   * Create a divider block
   */
  createDivider(): NotionDividerBlock {
    return {
      object: 'block',
      type: 'divider',
      divider: {},
    };
  }

  // =====================
  // Markdown Conversion
  // =====================

  /**
   * Convert markdown content to Notion blocks
   */
  markdownToBlocks(markdown: string): NotionBlockUnion[] {
    const blocks: NotionBlockUnion[] = [];
    const lines = markdown.split('\n');

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Empty line - skip
      if (!trimmedLine) {
        i++;
        continue;
      }

      // Headings
      if (trimmedLine.startsWith('### ')) {
        blocks.push(this.createHeading(3, trimmedLine.slice(4)));
        i++;
        continue;
      }

      if (trimmedLine.startsWith('## ')) {
        blocks.push(this.createHeading(2, trimmedLine.slice(3)));
        i++;
        continue;
      }

      if (trimmedLine.startsWith('# ')) {
        blocks.push(this.createHeading(1, trimmedLine.slice(2)));
        i++;
        continue;
      }

      // Horizontal rule
      if (
        trimmedLine === '---' ||
        trimmedLine === '***' ||
        trimmedLine === '___'
      ) {
        blocks.push(this.createDivider());
        i++;
        continue;
      }

      // Bulleted list
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        blocks.push(
          this.createBulletedListItem(
            this.parseInlineMarkdown(trimmedLine.slice(2))
          )
        );
        i++;
        continue;
      }

      // Numbered list
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        blocks.push(
          this.createNumberedListItem(
            this.parseInlineMarkdown(numberedMatch[2])
          )
        );
        i++;
        continue;
      }

      // Block quote
      if (trimmedLine.startsWith('> ')) {
        blocks.push(
          this.createQuote(this.parseInlineMarkdown(trimmedLine.slice(2)))
        );
        i++;
        continue;
      }

      // Code block
      if (trimmedLine.startsWith('```')) {
        const language = trimmedLine.slice(3).trim() || 'plain text';
        const codeLines: string[] = [];
        i++;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        blocks.push(this.createCodeBlock(codeLines.join('\n'), language));
        i++; // Skip closing ```
        continue;
      }

      // Regular paragraph
      blocks.push(this.createParagraph(this.parseInlineMarkdown(trimmedLine)));
      i++;
    }

    return blocks;
  }

  /**
   * Parse inline markdown formatting (bold, italic, code, links)
   */
  private parseInlineMarkdown(text: string): NotionRichText[] {
    const richText: NotionRichText[] = [];
    let currentText = text;

    // Simple approach: process common patterns
    // For more complex parsing, consider using a markdown parser library

    // Process the text character by character, handling patterns
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, annotation: { bold: true } },
      { regex: /\*(.+?)\*/g, annotation: { italic: true } },
      { regex: /`(.+?)`/g, annotation: { code: true } },
      { regex: /~~(.+?)~~/g, annotation: { strikethrough: true } },
    ];

    // For now, use a simpler approach - just return as plain text
    // with basic formatting detection
    let hasFormatting = false;

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        hasFormatting = true;
        break;
      }
    }

    if (!hasFormatting) {
      // Handle links: [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(text)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
          richText.push({
            type: 'text',
            text: { content: text.slice(lastIndex, match.index) },
          });
        }

        // Add the link
        richText.push(this.createLink(match[1], match[2]));
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        richText.push({
          type: 'text',
          text: { content: text.slice(lastIndex) },
        });
      }

      if (richText.length === 0) {
        return this.textToRichText(text);
      }

      return richText;
    }

    // Handle formatted text with basic patterns
    let processed = text;

    // Bold: **text**
    processed = processed.replace(/\*\*(.+?)\*\*/g, (_, content) => {
      return `{{BOLD:${content}}}`;
    });

    // Italic: *text*
    processed = processed.replace(/\*(.+?)\*/g, (_, content) => {
      return `{{ITALIC:${content}}}`;
    });

    // Code: `text`
    processed = processed.replace(/`(.+?)`/g, (_, content) => {
      return `{{CODE:${content}}}`;
    });

    // Parse the processed text back into rich text
    const parts = processed.split(/(\{\{(?:BOLD|ITALIC|CODE):[^}]+\}\})/);

    for (const part of parts) {
      if (!part) continue;

      const boldMatch = part.match(/\{\{BOLD:(.+?)\}\}/);
      if (boldMatch) {
        richText.push(...this.createBoldText(boldMatch[1]));
        continue;
      }

      const italicMatch = part.match(/\{\{ITALIC:(.+?)\}\}/);
      if (italicMatch) {
        richText.push(...this.createItalicText(italicMatch[1]));
        continue;
      }

      const codeMatch = part.match(/\{\{CODE:(.+?)\}\}/);
      if (codeMatch) {
        richText.push(...this.createCodeText(codeMatch[1]));
        continue;
      }

      // Plain text
      if (part.trim()) {
        richText.push({
          type: 'text',
          text: { content: part },
        });
      }
    }

    return richText.length > 0 ? richText : this.textToRichText(text);
  }

  // =====================
  // Helper Methods
  // =====================

  /**
   * Handle errors and convert to NotionResult
   */
  private handleError(error: unknown): { success: false; error: NotionError } {
    if (error instanceof CMSError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          status: error.statusCode,
          details: error.details,
        },
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'UNKNOWN_ERROR',
        },
      };
    }

    return {
      success: false,
      error: {
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR',
      },
    };
  }
}

/**
 * Create a new Notion adapter instance
 */
export function createNotionAdapter(
  config: NotionConfig,
  propertyMapping?: Partial<NotionPropertyMapping>
): NotionAdapter {
  return new NotionAdapter(config, propertyMapping);
}

/**
 * Validate Notion configuration
 */
export function validateNotionConfig(
  config: Partial<NotionConfig>
): config is NotionConfig {
  if (!config.integrationToken || typeof config.integrationToken !== 'string') {
    return false;
  }

  // Integration token should start with 'secret_' or 'ntn_'
  if (
    !config.integrationToken.startsWith('secret_') &&
    !config.integrationToken.startsWith('ntn_')
  ) {
    return false;
  }

  return true;
}

/**
 * Format Notion page ID (remove dashes if present)
 */
export function formatNotionId(id: string): string {
  return id.replace(/-/g, '');
}

/**
 * Parse Notion page ID from URL
 */
export function parseNotionUrl(url: string): string | null {
  // Handle various Notion URL formats
  const patterns = [
    /notion\.so\/(?:[^/]+\/)?([a-f0-9]{32})/i,
    /notion\.so\/(?:[^/]+\/)?([a-f0-9-]{36})/i,
    /([a-f0-9]{32})$/i,
    /([a-f0-9-]{36})$/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return formatNotionId(match[1]);
    }
  }

  return null;
}
