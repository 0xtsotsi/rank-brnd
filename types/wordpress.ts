/**
 * WordPress CMS Types
 *
 * Type definitions for WordPress REST API entities and operations.
 * Based on WordPress REST API v2 specification.
 * @see https://developer.wordpress.org/rest-api/
 */

/**
 * WordPress REST API configuration
 */
export interface WordPressConfig {
  /** WordPress site URL (e.g., https://example.com) */
  url: string;
  /** WordPress username for Basic Auth or OAuth 1.0a */
  username?: string;
  /** WordPress password (application password) for Basic Auth */
  password?: string;
  /** OAuth 2.0 access token */
  accessToken?: string;
  /** API version (default: wp/v2) */
  apiVersion?: string;
  /** Authentication method */
  authMethod?: 'basic' | 'oauth2' | 'jwt';
}

/**
 * WordPress Post status
 */
export type WordPressPostStatus =
  | 'publish'
  | 'future'
  | 'draft'
  | 'pending'
  | 'private'
  | 'trash'
  | 'auto-draft';

/**
 * WordPress Post format
 */
export type WordPressPostFormat =
  | 'standard'
  | 'aside'
  | 'chat'
  | 'gallery'
  | 'link'
  | 'image'
  | 'quote'
  | 'status'
  | 'video'
  | 'audio';

/**
 * WordPress Post entity
 */
export interface WordPressPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string; raw?: string };
  modified: string;
  modified_gmt: string;
  password: string;
  slug: string;
  status: WordPressPostStatus;
  type: string;
  link: string;
  title: { rendered: string; raw?: string };
  content: { rendered: string; raw?: string; protected?: boolean };
  excerpt: { rendered: string; raw?: string; protected?: boolean };
  author: number;
  featured_media: number;
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;
  template: string;
  format: WordPressPostFormat;
  meta: Record<string, unknown>;
  categories: number[];
  tags: number[];
  yoast_head?: string;
  yoast_title?: string;
  yoast_meta?: Record<string, unknown>;
}

/**
 * Input for creating/updating a post
 */
export interface WordPressPostInput {
  title: string;
  content?: string;
  excerpt?: string;
  status?: WordPressPostStatus;
  slug?: string;
  author?: number;
  featured_media?: number;
  comment_status?: 'open' | 'closed';
  ping_status?: 'open' | 'closed';
  sticky?: boolean;
  format?: WordPressPostFormat;
  categories?: number[];
  tags?: number[];
  meta?: Record<string, unknown>;
  /** Yoast SEO data */
  yoast_title?: string;
  yoast_meta_desc?: string;
  yoast_focuskw?: string;
  yoast_canonical?: string;
  yoast_opengraph_title?: string;
  yoast_opengraph_description?: string;
  yoast_opengraph_image?: number;
  yoast_twitter_title?: string;
  yoast_twitter_description?: string;
  yoast_twitter_image?: number;
  /** Publish date for scheduled posts */
  date?: string;
}

/**
 * WordPress Category entity
 */
export interface WordPressCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: Record<string, unknown>;
}

/**
 * WordPress Category input
 */
export interface WordPressCategoryInput {
  name: string;
  description?: string;
  slug?: string;
  parent?: number;
}

/**
 * WordPress Tag entity
 */
export interface WordPressTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  meta: Record<string, unknown>;
}

/**
 * WordPress Tag input
 */
export interface WordPressTagInput {
  name: string;
  description?: string;
  slug?: string;
}

/**
 * WordPress Media entity
 */
export interface WordPressMedia {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string; raw?: string };
  modified: string;
  modified_gmt: string;
  password: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string; raw?: string };
  author: number;
  comment_status: string;
  ping_status: string;
  alt_text: string;
  caption: { rendered: string };
  media_type: 'image' | 'file' | 'video' | 'audio';
  mime_type: string;
  media_details: {
    width?: number;
    height?: number;
    file?: string;
    sizes?: {
      thumbnail?: {
        file: string;
        width: number;
        height: number;
        mime_type: string;
        source_url: string;
      };
      medium?: {
        file: string;
        width: number;
        height: number;
        mime_type: string;
        source_url: string;
      };
      medium_large?: {
        file: string;
        width: number;
        height: number;
        mime_type: string;
        source_url: string;
      };
      large?: {
        file: string;
        width: number;
        height: number;
        mime_type: string;
        source_url: string;
      };
      full?: {
        file: string;
        width: number;
        height: number;
        mime_type: string;
        source_url: string;
      };
    };
    image_meta?: {
      aperture: string;
      credit: string;
      camera: string;
      caption: string;
      created_timestamp: string;
      copyright: string;
      focal_length: string;
      iso: string;
      shutter_speed: string;
      title: string;
      orientation: string;
      keywords: string[];
    };
  };
  post: number | null;
  source_url: string;
}

/**
 * WordPress User entity
 */
export interface WordPressUser {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  url: string;
  description: string;
  link: string;
  locale: string;
  nickname: string;
  slug: string;
  registered_date: string;
  roles: string[];
  capabilities: Record<string, boolean>;
  extra_capabilities: Record<string, boolean>;
  avatar_urls: {
    '24': string;
    '48': string;
    '96': string;
  };
  meta: Record<string, unknown>;
}

/**
 * WordPress API pagination parameters
 */
export interface WordPressPagination {
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: string;
  slug?: string[];
  status?: WordPressPostStatus | WordPressPostStatus[];
  [key: string]: unknown;
}

/**
 * WordPress API response metadata
 */
export interface WordPressResponseMeta {
  total: number;
  total_pages: number;
}

/**
 * WordPress API paginated response
 */
export interface WordPressPaginatedResponse<T> {
  items: T[];
  meta?: WordPressResponseMeta;
}

/**
 * WordPress API error response
 */
export interface WordPressErrorResponse {
  code: string;
  message: string;
  data: { status?: number };
}

/**
 * Result type for WordPress operations
 */
export type WordPressResult<T> =
  | { success: true; data: T }
  | { success: false; error: WordPressError };

/**
 * WordPress error type
 */
export interface WordPressError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

/**
 * OAuth 2.0 token response
 */
export interface WordPressOAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

/**
 * OAuth 2.0 configuration for WordPress
 */
export interface WordPressOAuth2Config {
  /** WordPress site URL */
  url: string;
  /** OAuth 2.0 client ID */
  clientId: string;
  /** OAuth 2.0 client secret */
  clientSecret: string;
  /** OAuth 2.0 redirect URI */
  redirectUri: string;
  /** OAuth 2.0 scope */
  scope?: string;
}

/**
 * JWT token payload
 */
export interface WordPressJWTPayload {
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
  data: {
    user: {
      id: number;
    };
  };
}

/**
 * Image upload options
 */
export interface WordPressImageUploadOptions {
  /** File data (base64 or buffer) */
  file: string | Buffer | Blob;
  /** Filename */
  filename: string;
  /** Alt text for the image */
  alt_text?: string;
  /** Caption for the image */
  caption?: string;
  /** Description for the image */
  description?: string;
}
