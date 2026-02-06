/**
 * Notion CMS Types
 *
 * Type definitions for Notion API entities and operations.
 * Based on Notion API specification.
 *
 * Note: When @notionhq/client is installed, these types complement the SDK types.
 */

/**
 * Notion API configuration required for authentication
 */
export interface NotionConfig {
  /** Notion Integration Token (Internal Integration Secret) */
  integrationToken: string;
  /** Default database ID for content storage */
  defaultDatabaseId?: string;
  /** API version (optional, defaults to SDK version) */
  version?: string;
}

/**
 * Notion color options for text and backgrounds
 */
export type NotionColor =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'gray_background'
  | 'brown_background'
  | 'orange_background'
  | 'yellow_background'
  | 'green_background'
  | 'blue_background'
  | 'purple_background'
  | 'pink_background'
  | 'red_background';

/**
 * Notion Rich Text annotation options
 */
export interface NotionAnnotations {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: NotionColor;
}

/**
 * Notion Rich Text item
 */
export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  mention?: {
    type: 'user' | 'page' | 'database' | 'date' | 'link_preview';
    user?: { id: string };
    page?: { id: string };
    database?: { id: string };
    date?: { start: string; end?: string };
    link_preview?: { url: string };
  };
  equation?: {
    expression: string;
  };
  annotations?: NotionAnnotations;
  plain_text?: string;
  href?: string | null;
}

/**
 * Notion Property types for database pages
 */
export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

/**
 * Notion Select/Multi-select option
 */
export interface NotionSelectOption {
  id?: string;
  name: string;
  color?: NotionColor;
}

/**
 * Notion Property value variants
 */
export interface NotionPropertyValue {
  type: NotionPropertyType;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  number?: number | null;
  select?: NotionSelectOption | null;
  multi_select?: NotionSelectOption[];
  status?: NotionSelectOption | null;
  date?: {
    start: string;
    end?: string | null;
    time_zone?: string | null;
  } | null;
  people?: Array<{ id: string }>;
  files?: Array<{
    type: 'file' | 'external';
    name: string;
    file?: { url: string; expiry_time: string };
    external?: { url: string };
  }>;
  checkbox?: boolean;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  formula?: {
    type: 'string' | 'number' | 'boolean' | 'date';
    string?: string | null;
    number?: number | null;
    boolean?: boolean | null;
    date?: { start: string; end?: string | null } | null;
  };
  relation?: Array<{ id: string }>;
  rollup?: {
    type: 'number' | 'date' | 'array';
    number?: number | null;
    date?: { start: string; end?: string | null } | null;
    array?: NotionPropertyValue[];
  };
  created_time?: string;
  created_by?: { id: string };
  last_edited_time?: string;
  last_edited_by?: { id: string };
}

/**
 * Notion Block types
 */
export type NotionBlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'to_do'
  | 'toggle'
  | 'code'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'image'
  | 'video'
  | 'file'
  | 'pdf'
  | 'bookmark'
  | 'embed'
  | 'table_of_contents'
  | 'breadcrumb'
  | 'column_list'
  | 'column'
  | 'table'
  | 'table_row';

/**
 * Notion Block base interface
 */
export interface NotionBlock {
  object: 'block';
  id?: string;
  type: NotionBlockType;
  created_time?: string;
  created_by?: { id: string };
  last_edited_time?: string;
  last_edited_by?: { id: string };
  has_children?: boolean;
  archived?: boolean;
  [key: string]: unknown;
}

/**
 * Notion Paragraph block
 */
export interface NotionParagraphBlock extends NotionBlock {
  type: 'paragraph';
  paragraph: {
    rich_text: NotionRichText[];
    color?: NotionColor;
  };
}

/**
 * Notion Heading blocks
 */
export interface NotionHeadingBlock extends NotionBlock {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  heading_1?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
  heading_2?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
  heading_3?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
}

/**
 * Notion List item blocks
 */
export interface NotionListItemBlock extends NotionBlock {
  type: 'bulleted_list_item' | 'numbered_list_item';
  bulleted_list_item?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
  };
  numbered_list_item?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
  };
}

/**
 * Notion Code block
 */
export interface NotionCodeBlock extends NotionBlock {
  type: 'code';
  code: {
    rich_text: NotionRichText[];
    language: string;
    caption?: NotionRichText[];
  };
}

/**
 * Notion Quote block
 */
export interface NotionQuoteBlock extends NotionBlock {
  type: 'quote';
  quote: {
    rich_text: NotionRichText[];
    color?: NotionColor;
  };
}

/**
 * Notion Callout block
 */
export interface NotionCalloutBlock extends NotionBlock {
  type: 'callout';
  callout: {
    rich_text: NotionRichText[];
    icon?: {
      type: 'emoji' | 'external' | 'file';
      emoji?: string;
      external?: { url: string };
      file?: { url: string };
    };
    color?: NotionColor;
  };
}

/**
 * Notion Image block
 */
export interface NotionImageBlock extends NotionBlock {
  type: 'image';
  image: {
    type: 'file' | 'external';
    file?: { url: string; expiry_time: string };
    external?: { url: string };
    caption?: NotionRichText[];
  };
}

/**
 * Notion Divider block
 */
export interface NotionDividerBlock extends NotionBlock {
  type: 'divider';
  divider: Record<string, never>;
}

/**
 * Notion To-do block
 */
export interface NotionToDoBlock extends NotionBlock {
  type: 'to_do';
  to_do: {
    rich_text: NotionRichText[];
    checked: boolean;
    color?: NotionColor;
  };
}

/**
 * Notion Toggle block
 */
export interface NotionToggleBlock extends NotionBlock {
  type: 'toggle';
  toggle: {
    rich_text: NotionRichText[];
    color?: NotionColor;
  };
}

/**
 * Notion Bookmark block
 */
export interface NotionBookmarkBlock extends NotionBlock {
  type: 'bookmark';
  bookmark: {
    url: string;
    caption?: NotionRichText[];
  };
}

/**
 * Union type for all block types
 */
export type NotionBlockUnion =
  | NotionParagraphBlock
  | NotionHeadingBlock
  | NotionListItemBlock
  | NotionCodeBlock
  | NotionQuoteBlock
  | NotionCalloutBlock
  | NotionImageBlock
  | NotionDividerBlock
  | NotionToDoBlock
  | NotionToggleBlock
  | NotionBookmarkBlock;

/**
 * Notion Page object
 */
export interface NotionPage {
  object: 'page';
  id: string;
  created_time: string;
  created_by: { id: string };
  last_edited_time: string;
  last_edited_by: { id: string };
  archived: boolean;
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  } | null;
  cover?: {
    type: 'external' | 'file';
    external?: { url: string };
    file?: { url: string };
  } | null;
  properties: Record<string, NotionPropertyValue>;
  parent: {
    type: 'database_id' | 'page_id' | 'workspace';
    database_id?: string;
    page_id?: string;
    workspace?: boolean;
  };
  url: string;
  public_url?: string | null;
}

/**
 * Notion Database object
 */
export interface NotionDatabase {
  object: 'database';
  id: string;
  created_time: string;
  created_by: { id: string };
  last_edited_time: string;
  last_edited_by: { id: string };
  title: NotionRichText[];
  description: NotionRichText[];
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  } | null;
  cover?: {
    type: 'external' | 'file';
    external?: { url: string };
    file?: { url: string };
  } | null;
  properties: Record<string, NotionDatabaseProperty>;
  parent: {
    type: 'page_id' | 'workspace';
    page_id?: string;
    workspace?: boolean;
  };
  url: string;
  archived: boolean;
  is_inline: boolean;
  public_url?: string | null;
}

/**
 * Notion Database property schema
 */
export interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: NotionPropertyType;
  title?: Record<string, never>;
  rich_text?: Record<string, never>;
  number?: { format: string };
  select?: { options: NotionSelectOption[] };
  multi_select?: { options: NotionSelectOption[] };
  status?: {
    options: NotionSelectOption[];
    groups: Array<{
      id: string;
      name: string;
      color: string;
      option_ids: string[];
    }>;
  };
  date?: Record<string, never>;
  people?: Record<string, never>;
  files?: Record<string, never>;
  checkbox?: Record<string, never>;
  url?: Record<string, never>;
  email?: Record<string, never>;
  phone_number?: Record<string, never>;
  formula?: { expression: string };
  relation?: { database_id: string; type: 'single_property' | 'dual_property' };
  rollup?: {
    function: string;
    relation_property_id: string;
    rollup_property_id: string;
  };
  created_time?: Record<string, never>;
  created_by?: Record<string, never>;
  last_edited_time?: Record<string, never>;
  last_edited_by?: Record<string, never>;
}

/**
 * Notion User object
 */
export interface NotionUser {
  object: 'user';
  id: string;
  type?: 'person' | 'bot';
  name?: string | null;
  avatar_url?: string | null;
  person?: {
    email?: string;
  };
  bot?: {
    owner?: {
      type: 'workspace' | 'user';
      workspace?: boolean;
      user?: NotionUser;
    };
    workspace_name?: string | null;
  };
}

/**
 * Notion pagination cursor
 */
export interface NotionPagination {
  start_cursor?: string;
  page_size?: number;
}

/**
 * Notion paginated response
 */
export interface NotionPaginatedResponse<T> {
  object: 'list';
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
  type?: string;
}

/**
 * Notion Search parameters
 */
export interface NotionSearchParams {
  query?: string;
  filter?: {
    property: 'object';
    value: 'page' | 'database';
  };
  sort?: {
    direction: 'ascending' | 'descending';
    timestamp: 'last_edited_time';
  };
  start_cursor?: string;
  page_size?: number;
}

/**
 * Input for creating a page in a database
 */
export interface NotionPageInput {
  /** Parent database ID */
  databaseId: string;
  /** Page properties mapped to database schema */
  properties: Record<string, NotionPropertyValue>;
  /** Page content blocks */
  content?: NotionBlockUnion[];
  /** Page icon */
  icon?: {
    type: 'emoji' | 'external';
    emoji?: string;
    external?: { url: string };
  };
  /** Page cover image */
  cover?: {
    type: 'external';
    external: { url: string };
  };
}

/**
 * Input for updating a page
 */
export interface NotionPageUpdateInput {
  /** Properties to update */
  properties?: Record<string, NotionPropertyValue>;
  /** Archive the page */
  archived?: boolean;
  /** Update icon */
  icon?: {
    type: 'emoji' | 'external';
    emoji?: string;
    external?: { url: string };
  } | null;
  /** Update cover */
  cover?: {
    type: 'external';
    external: { url: string };
  } | null;
}

/**
 * Notion API error response
 */
export interface NotionErrorResponse {
  object: 'error';
  status: number;
  code: string;
  message: string;
}

/**
 * Result type for Notion operations
 */
export type NotionResult<T> =
  | { success: true; data: T }
  | { success: false; error: NotionError };

/**
 * Notion error type
 */
export interface NotionError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

/**
 * Property mapping configuration for converting CMSPost to Notion properties
 */
export interface NotionPropertyMapping {
  /** Property name in Notion database for title */
  titleProperty: string;
  /** Property name for content/body (rich_text type) */
  contentProperty?: string;
  /** Property name for tags (multi_select type) */
  tagsProperty?: string;
  /** Property name for status (select or status type) */
  statusProperty?: string;
  /** Property name for canonical URL (url type) */
  canonicalUrlProperty?: string;
  /** Property name for published date (date type) */
  publishedDateProperty?: string;
  /** Custom property mappings */
  customMappings?: Record<string, string>;
}

/**
 * Default property mapping for standard blog database
 */
export const DEFAULT_PROPERTY_MAPPING: NotionPropertyMapping = {
  titleProperty: 'Name',
  contentProperty: 'Content',
  tagsProperty: 'Tags',
  statusProperty: 'Status',
  canonicalUrlProperty: 'Canonical URL',
  publishedDateProperty: 'Published',
};
