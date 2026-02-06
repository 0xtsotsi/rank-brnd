/**
 * Ghost CMS Adapter
 *
 * Implements the CMSAdapter interface for Ghost CMS using the Admin API.
 * Supports post publishing, tag management, author management, and scheduled publishing.
 *
 * Ghost Admin API Documentation: https://ghost.org/docs/admin-api/
 */

import type {
  GhostConfig,
  GhostPost,
  GhostPostInput,
  GhostTag,
  GhostTagInput,
  GhostAuthor,
  GhostPagination,
  GhostPostsResponse,
  GhostSinglePostResponse,
  GhostTagsResponse,
  GhostSingleTagResponse,
  GhostAuthorsResponse,
  GhostSingleAuthorResponse,
  GhostResult,
  GhostError,
  GhostErrorResponse,
} from '@/types/ghost';

import type { CMSAdapter, CMSPost, CMSUser, PublishResult } from './types';

import { CMSError } from './types';

/**
 * Ghost CMS Adapter for Admin API
 *
 * @example
 * ```typescript
 * const ghost = new GhostAdapter({
 *   url: 'https://your-site.ghost.io',
 *   adminApiKey: 'your-admin-api-key',
 * });
 *
 * // Publish a post
 * const result = await ghost.publish({
 *   title: 'My Post',
 *   content: 'Post content in markdown...',
 *   tags: ['technology', 'news'],
 * });
 * ```
 */
export class GhostAdapter implements CMSAdapter {
  readonly name = 'Ghost';

  private readonly config: GhostConfig;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(config: GhostConfig) {
    this.config = config;
    this.apiVersion = config.version || 'v5.0';
    this.baseUrl = `${config.url.replace(/\/$/, '')}/ghost/api/admin`;
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.url && this.config.adminApiKey);
  }

  /**
   * Generate JWT token for Ghost Admin API authentication
   * Ghost requires a JWT signed with the secret from the Admin API key
   */
  private generateToken(): string {
    const [id, secret] = this.config.adminApiKey.split(':');

    if (!id || !secret) {
      throw new CMSError(
        'Invalid Admin API key format. Expected format: {id}:{secret}',
        'INVALID_API_KEY'
      );
    }

    // Create JWT header and payload
    const header = {
      alg: 'HS256',
      typ: 'JWT',
      kid: id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now,
      exp: now + 300, // 5 minutes expiry
      aud: '/admin/',
    };

    // Base64URL encode
    const base64UrlEncode = (obj: object): string => {
      const json = JSON.stringify(obj);
      const base64 = Buffer.from(json).toString('base64');
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const headerEncoded = base64UrlEncode(header);
    const payloadEncoded = base64UrlEncode(payload);
    const message = `${headerEncoded}.${payloadEncoded}`;

    // Sign with HMAC-SHA256
    const crypto = require('crypto');
    const keyBuffer = Buffer.from(secret, 'hex');
    const signature = crypto
      .createHmac('sha256', keyBuffer)
      .update(message)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${message}.${signature}`;
  }

  /**
   * Make an authenticated request to Ghost Admin API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.generateToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Ghost ${token}`,
        'Content-Type': 'application/json',
        'Accept-Version': this.apiVersion,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as GhostErrorResponse;
      const error = errorData.errors?.[0];

      throw new CMSError(
        error?.message || `Ghost API error: ${response.statusText}`,
        error?.type || 'API_ERROR',
        response.status,
        { context: error?.context, details: error?.details }
      );
    }

    return response.json();
  }

  /**
   * Build query string from pagination parameters
   */
  private buildQueryString(params?: GhostPagination): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.order) queryParams.set('order', params.order);
    if (params.filter) queryParams.set('filter', params.filter);
    if (params.fields) queryParams.set('fields', params.fields);
    if (params.include) queryParams.set('include', params.include);

    const query = queryParams.toString();
    return query ? `?${query}` : '';
  }

  // =====================
  // CMSAdapter Interface
  // =====================

  /**
   * Publish a post to Ghost (implements CMSAdapter interface)
   */
  async publish(post: CMSPost): Promise<PublishResult> {
    const ghostPost: GhostPostInput = {
      title: post.title,
      html: post.contentHtml || this.markdownToHtml(post.content),
      status: this.mapStatus(post.publishStatus),
      tags: post.tags?.map((tag) => ({ name: tag })),
      canonical_url: post.canonicalUrl,
    };

    const result = await this.createPost(ghostPost);

    if (!result.success) {
      throw new CMSError(
        result.error.message,
        result.error.type || 'PUBLISH_ERROR',
        undefined,
        { details: result.error.details }
      );
    }

    return {
      success: true,
      postId: result.data.id,
      url: result.data.url || `${this.config.url}/${result.data.slug}/`,
      metadata: {
        slug: result.data.slug,
        status: result.data.status,
        publishedAt: result.data.published_at,
      },
    };
  }

  /**
   * Get authenticated user information (implements CMSAdapter interface)
   */
  async getUser(): Promise<CMSUser> {
    const response = await this.request<GhostAuthorsResponse>(
      '/users/me/?include=roles'
    );

    const user = response.users[0];

    return {
      id: user.id,
      username: user.slug,
      name: user.name,
      url: user.url,
      imageUrl: user.profile_image || undefined,
    };
  }

  // =====================
  // Post Management
  // =====================

  /**
   * Create a new post
   */
  async createPost(post: GhostPostInput): Promise<GhostResult<GhostPost>> {
    try {
      const response = await this.request<GhostSinglePostResponse>(
        '/posts/?source=html',
        {
          method: 'POST',
          body: JSON.stringify({ posts: [post] }),
        }
      );

      return { success: true, data: response.posts[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing post
   */
  async updatePost(
    id: string,
    post: Partial<GhostPostInput>,
    updatedAt: string
  ): Promise<GhostResult<GhostPost>> {
    try {
      const response = await this.request<GhostSinglePostResponse>(
        `/posts/${id}/?source=html`,
        {
          method: 'PUT',
          body: JSON.stringify({
            posts: [{ ...post, updated_at: updatedAt }],
          }),
        }
      );

      return { success: true, data: response.posts[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a post
   */
  async deletePost(id: string): Promise<GhostResult<void>> {
    try {
      await this.request(`/posts/${id}/`, { method: 'DELETE' });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single post by ID
   */
  async getPost(
    id: string,
    options?: { include?: string }
  ): Promise<GhostResult<GhostPost>> {
    try {
      const include = options?.include || 'tags,authors';
      const response = await this.request<GhostSinglePostResponse>(
        `/posts/${id}/?include=${include}`
      );

      return { success: true, data: response.posts[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single post by slug
   */
  async getPostBySlug(
    slug: string,
    options?: { include?: string }
  ): Promise<GhostResult<GhostPost>> {
    try {
      const include = options?.include || 'tags,authors';
      const response = await this.request<GhostSinglePostResponse>(
        `/posts/slug/${slug}/?include=${include}`
      );

      return { success: true, data: response.posts[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List posts with pagination and filtering
   */
  async listPosts(
    pagination?: GhostPagination
  ): Promise<GhostResult<GhostPostsResponse>> {
    try {
      const query = this.buildQueryString({
        include: 'tags,authors',
        ...pagination,
      });

      const response = await this.request<GhostPostsResponse>(
        `/posts/${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Scheduled Publishing
  // =====================

  /**
   * Schedule a post for future publishing
   */
  async schedulePost(
    post: GhostPostInput,
    publishAt: Date
  ): Promise<GhostResult<GhostPost>> {
    const scheduledPost: GhostPostInput = {
      ...post,
      status: 'scheduled',
      published_at: publishAt.toISOString(),
    };

    return this.createPost(scheduledPost);
  }

  /**
   * Update scheduled time for an existing post
   */
  async reschedulePost(
    id: string,
    publishAt: Date,
    updatedAt: string
  ): Promise<GhostResult<GhostPost>> {
    return this.updatePost(
      id,
      {
        status: 'scheduled',
        published_at: publishAt.toISOString(),
      },
      updatedAt
    );
  }

  /**
   * Unschedule a post (set back to draft)
   */
  async unschedulePost(
    id: string,
    updatedAt: string
  ): Promise<GhostResult<GhostPost>> {
    return this.updatePost(
      id,
      {
        status: 'draft',
        published_at: null,
      },
      updatedAt
    );
  }

  /**
   * Publish a scheduled or draft post immediately
   */
  async publishNow(
    id: string,
    updatedAt: string
  ): Promise<GhostResult<GhostPost>> {
    return this.updatePost(
      id,
      {
        status: 'published',
        published_at: new Date().toISOString(),
      },
      updatedAt
    );
  }

  // =====================
  // Tag Management
  // =====================

  /**
   * Create a new tag
   */
  async createTag(tag: GhostTagInput): Promise<GhostResult<GhostTag>> {
    try {
      const response = await this.request<GhostSingleTagResponse>('/tags/', {
        method: 'POST',
        body: JSON.stringify({ tags: [tag] }),
      });

      return { success: true, data: response.tags[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(
    id: string,
    tag: Partial<GhostTagInput>,
    updatedAt: string
  ): Promise<GhostResult<GhostTag>> {
    try {
      const response = await this.request<GhostSingleTagResponse>(
        `/tags/${id}/`,
        {
          method: 'PUT',
          body: JSON.stringify({
            tags: [{ ...tag, updated_at: updatedAt }],
          }),
        }
      );

      return { success: true, data: response.tags[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<GhostResult<void>> {
    try {
      await this.request(`/tags/${id}/`, { method: 'DELETE' });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: string): Promise<GhostResult<GhostTag>> {
    try {
      const response = await this.request<GhostSingleTagResponse>(
        `/tags/${id}/`
      );

      return { success: true, data: response.tags[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single tag by slug
   */
  async getTagBySlug(slug: string): Promise<GhostResult<GhostTag>> {
    try {
      const response = await this.request<GhostSingleTagResponse>(
        `/tags/slug/${slug}/`
      );

      return { success: true, data: response.tags[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List tags with pagination and filtering
   */
  async listTags(
    pagination?: GhostPagination
  ): Promise<GhostResult<GhostTagsResponse>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<GhostTagsResponse>(`/tags/${query}`);

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get or create a tag by name
   * Useful for ensuring tags exist before assigning to posts
   */
  async getOrCreateTag(name: string): Promise<GhostResult<GhostTag>> {
    // First try to find by slug (derived from name)
    const slug = this.slugify(name);
    const existing = await this.getTagBySlug(slug);

    if (existing.success) {
      return existing;
    }

    // If not found, create new tag
    return this.createTag({ name });
  }

  // =====================
  // Author Management
  // =====================

  /**
   * Get a single author by ID
   */
  async getAuthor(
    id: string,
    options?: { include?: string }
  ): Promise<GhostResult<GhostAuthor>> {
    try {
      const include = options?.include || 'roles';
      const response = await this.request<GhostSingleAuthorResponse>(
        `/users/${id}/?include=${include}`
      );

      return { success: true, data: response.users[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single author by slug
   */
  async getAuthorBySlug(
    slug: string,
    options?: { include?: string }
  ): Promise<GhostResult<GhostAuthor>> {
    try {
      const include = options?.include || 'roles';
      const response = await this.request<GhostSingleAuthorResponse>(
        `/users/slug/${slug}/?include=${include}`
      );

      return { success: true, data: response.users[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single author by email
   */
  async getAuthorByEmail(
    email: string,
    options?: { include?: string }
  ): Promise<GhostResult<GhostAuthor>> {
    try {
      const include = options?.include || 'roles';
      const response = await this.request<GhostSingleAuthorResponse>(
        `/users/email/${email}/?include=${include}`
      );

      return { success: true, data: response.users[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List authors with pagination and filtering
   */
  async listAuthors(
    pagination?: GhostPagination
  ): Promise<GhostResult<GhostAuthorsResponse>> {
    try {
      const query = this.buildQueryString({
        include: 'roles',
        ...pagination,
      });

      const response = await this.request<GhostAuthorsResponse>(
        `/users/${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Helper Methods
  // =====================

  /**
   * Convert markdown to basic HTML
   * Note: For production, consider using a proper markdown parser like marked
   */
  private markdownToHtml(markdown: string): string {
    // Basic conversion - in production use a proper markdown parser
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Map CMS publish status to Ghost status
   */
  private mapStatus(status?: string): GhostPostInput['status'] {
    switch (status) {
      case 'public':
        return 'published';
      case 'unlisted':
        return 'published'; // Ghost doesn't have unlisted, use visibility
      case 'draft':
      default:
        return 'draft';
    }
  }

  /**
   * Convert string to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Handle errors and convert to GhostResult
   */
  private handleError(error: unknown): { success: false; error: GhostError } {
    if (error instanceof CMSError) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.code,
          details: error.details,
        },
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: 'UNKNOWN_ERROR',
        },
      };
    }

    return {
      success: false,
      error: {
        message: 'An unknown error occurred',
        type: 'UNKNOWN_ERROR',
      },
    };
  }
}

/**
 * Create a new Ghost adapter instance
 */
export function createGhostAdapter(config: GhostConfig): GhostAdapter {
  return new GhostAdapter(config);
}

/**
 * Validate Ghost configuration
 */
export function validateGhostConfig(
  config: Partial<GhostConfig>
): config is GhostConfig {
  if (!config.url || typeof config.url !== 'string') {
    return false;
  }

  if (!config.adminApiKey || typeof config.adminApiKey !== 'string') {
    return false;
  }

  // Validate API key format (id:secret)
  const parts = config.adminApiKey.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }

  return true;
}
