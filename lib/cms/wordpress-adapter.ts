/**
 * WordPress CMS Adapter
 *
 * Implements the CMSAdapter interface for WordPress using the REST API.
 * Supports post publishing, category/tag mapping, image upload, draft/publish status,
 * OAuth 2.0 authentication, and Yoast SEO integration.
 *
 * WordPress REST API Documentation: https://developer.wordpress.org/rest-api/
 */

import type {
  WordPressConfig,
  WordPressPost,
  WordPressPostInput,
  WordPressPostStatus,
  WordPressCategory,
  WordPressCategoryInput,
  WordPressTag,
  WordPressTagInput,
  WordPressMedia,
  WordPressUser,
  WordPressPagination,
  WordPressPaginatedResponse,
  WordPressErrorResponse,
  WordPressResult,
  WordPressError,
  WordPressImageUploadOptions,
  WordPressOAuth2Config,
} from '@/types/wordpress';

import type { CMSAdapter, CMSPost, CMSUser, PublishResult } from './types';

import { CMSError } from './types';

/**
 * WordPress CMS Adapter for REST API
 *
 * @example
 * ```typescript
 * const wordpress = new WordPressAdapter({
 *   url: 'https://example.com',
 *   username: 'admin',
 *   password: 'application-password',
 * });
 *
 * // Publish a post
 * const result = await wordpress.publish({
 *   title: 'My Post',
 *   content: 'Post content in markdown...',
 *   tags: ['technology', 'news'],
 * });
 * ```
 */
export class WordPressAdapter implements CMSAdapter {
  readonly name = 'WordPress';

  private readonly config: WordPressConfig;
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly authToken?: string;

  constructor(config: WordPressConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || 'wp/v2';
    this.baseUrl = `${config.url.replace(/\/$/, '')}/wp-json`;

    // Pre-compute auth token for Basic Auth
    if (config.username && config.password) {
      this.authToken = Buffer.from(
        `${config.username}:${config.password}`
      ).toString('base64');
    }
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.url && (this.authToken || this.config.accessToken));
  }

  /**
   * Get the authorization header value
   */
  private getAuthHeader(): string | undefined {
    if (this.config.accessToken) {
      return `Bearer ${this.config.accessToken}`;
    }
    if (this.authToken) {
      return `Basic ${this.authToken}`;
    }
    return undefined;
  }

  /**
   * Make an authenticated request to WordPress REST API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/${this.apiVersion}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const authHeader = this.getAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as WordPressErrorResponse;
      throw new CMSError(
        errorData.message || `WordPress API error: ${response.statusText}`,
        errorData.code || 'API_ERROR',
        response.status,
        { details: errorData.data }
      );
    }

    return response.json();
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, String(v)));
      } else {
        queryParams.set(key, String(value));
      }
    }

    const query = queryParams.toString();
    return query ? `?${query}` : '';
  }

  // =====================
  // CMSAdapter Interface
  // =====================

  /**
   * Publish a post to WordPress (implements CMSAdapter interface)
   */
  async publish(post: CMSPost): Promise<PublishResult> {
    const wpPost: WordPressPostInput = {
      title: post.title,
      content: post.contentHtml || this.markdownToHtml(post.content),
      status: this.mapStatus(post.publishStatus),
    };

    // Handle tags/categories mapping
    if (post.tags && post.tags.length > 0) {
      const tagIds = await this.getOrCreateTagIds(post.tags);
      wpPost.tags = tagIds;
    }

    if (post.canonicalUrl) {
      wpPost.meta = { canonical_url: post.canonicalUrl };
    }

    const result = await this.createPost(wpPost);

    if (!result.success) {
      throw new CMSError(
        result.error.message,
        result.error.code || 'PUBLISH_ERROR',
        undefined,
        { details: result.error.details }
      );
    }

    return {
      success: true,
      postId: String(result.data.id),
      url: result.data.link,
      metadata: {
        slug: result.data.slug,
        status: result.data.status,
        date: result.data.date,
      },
    };
  }

  /**
   * Get authenticated user information (implements CMSAdapter interface)
   */
  async getUser(): Promise<CMSUser> {
    const response = await this.request<{
      id: number;
      name: string;
      url: string;
      avatar_urls: { '96': string };
    }>('/users/me');

    return {
      id: String(response.id),
      username: response.name,
      name: response.name,
      url: response.url,
      imageUrl: response.avatar_urls?.['96'],
    };
  }

  // =====================
  // Post Management
  // =====================

  /**
   * Create a new post
   */
  async createPost(
    post: WordPressPostInput
  ): Promise<WordPressResult<WordPressPost>> {
    try {
      const response = await this.request<WordPressPost>('/posts', {
        method: 'POST',
        body: JSON.stringify(post),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing post
   */
  async updatePost(
    id: number,
    post: Partial<WordPressPostInput>
  ): Promise<WordPressResult<WordPressPost>> {
    try {
      const response = await this.request<WordPressPost>(`/posts/${id}`, {
        method: 'POST',
        body: JSON.stringify(post),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a post
   */
  async deletePost(id: number, force = false): Promise<WordPressResult<void>> {
    try {
      await this.request(`/posts/${id}?force=${force}`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: number): Promise<WordPressResult<WordPressPost>> {
    try {
      const response = await this.request<WordPressPost>(
        `/posts/${id}?context=edit`
      );
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single post by slug
   */
  async getPostBySlug(slug: string): Promise<WordPressResult<WordPressPost>> {
    try {
      const response = await this.request<WordPressPost[]>(
        `/posts?slug=${encodeURIComponent(slug)}`
      );
      if (!response || response.length === 0) {
        return {
          success: false,
          error: { message: 'Post not found', code: 'NOT_FOUND' },
        };
      }
      return { success: true, data: response[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List posts with pagination and filtering
   */
  async listPosts(
    pagination?: WordPressPagination
  ): Promise<WordPressResult<WordPressPaginatedResponse<WordPressPost>>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<WordPressPost[]>(`/posts${query}`);

      // Extract pagination info from headers if available
      const totalPages = response.length > 0 ? 1 : 0;

      return {
        success: true,
        data: {
          items: response,
          meta: {
            total: response.length,
            total_pages: totalPages,
          },
        },
      };
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
    post: WordPressPostInput,
    publishAt: Date
  ): Promise<WordPressResult<WordPressPost>> {
    const scheduledPost: WordPressPostInput = {
      ...post,
      status: 'future',
      date: publishAt.toISOString(),
    };

    return this.createPost(scheduledPost);
  }

  /**
   * Update scheduled time for an existing post
   */
  async reschedulePost(
    id: number,
    publishAt: Date
  ): Promise<WordPressResult<WordPressPost>> {
    return this.updatePost(id, {
      status: 'future',
      date: publishAt.toISOString(),
    });
  }

  /**
   * Unschedule a post (set back to draft)
   */
  async unschedulePost(id: number): Promise<WordPressResult<WordPressPost>> {
    return this.updatePost(id, {
      status: 'draft',
    });
  }

  /**
   * Publish a scheduled or draft post immediately
   */
  async publishNow(id: number): Promise<WordPressResult<WordPressPost>> {
    return this.updatePost(id, {
      status: 'publish',
      date: new Date().toISOString(),
    });
  }

  // =====================
  // Category Management
  // =====================

  /**
   * Create a new category
   */
  async createCategory(
    category: WordPressCategoryInput
  ): Promise<WordPressResult<WordPressCategory>> {
    try {
      const response = await this.request<WordPressCategory>('/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    id: number,
    category: Partial<WordPressCategoryInput>
  ): Promise<WordPressResult<WordPressCategory>> {
    try {
      const response = await this.request<WordPressCategory>(
        `/categories/${id}`,
        {
          method: 'POST',
          body: JSON.stringify(category),
        }
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<WordPressResult<void>> {
    try {
      await this.request(`/categories/${id}?force=1`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: number): Promise<WordPressResult<WordPressCategory>> {
    try {
      const response = await this.request<WordPressCategory>(
        `/categories/${id}`
      );
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single category by slug
   */
  async getCategoryBySlug(
    slug: string
  ): Promise<WordPressResult<WordPressCategory>> {
    try {
      const response = await this.request<WordPressCategory[]>(
        `/categories?slug=${encodeURIComponent(slug)}`
      );
      if (!response || response.length === 0) {
        return {
          success: false,
          error: { message: 'Category not found', code: 'NOT_FOUND' },
        };
      }
      return { success: true, data: response[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List categories with pagination and filtering
   */
  async listCategories(
    pagination?: WordPressPagination
  ): Promise<WordPressResult<WordPressPaginatedResponse<WordPressCategory>>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<WordPressCategory[]>(
        `/categories${query}`
      );

      return {
        success: true,
        data: {
          items: response,
          meta: {
            total: response.length,
            total_pages: 1,
          },
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get or create a category by name
   */
  async getOrCreateCategory(
    name: string
  ): Promise<WordPressResult<WordPressCategory>> {
    const slug = this.slugify(name);
    const existing = await this.getCategoryBySlug(slug);

    if (existing.success) {
      return existing;
    }

    return this.createCategory({ name });
  }

  // =====================
  // Tag Management
  // =====================

  /**
   * Create a new tag
   */
  async createTag(
    tag: WordPressTagInput
  ): Promise<WordPressResult<WordPressTag>> {
    try {
      const response = await this.request<WordPressTag>('/tags', {
        method: 'POST',
        body: JSON.stringify(tag),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(
    id: number,
    tag: Partial<WordPressTagInput>
  ): Promise<WordPressResult<WordPressTag>> {
    try {
      const response = await this.request<WordPressTag>(`/tags/${id}`, {
        method: 'POST',
        body: JSON.stringify(tag),
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<WordPressResult<void>> {
    try {
      await this.request(`/tags/${id}?force=1`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: number): Promise<WordPressResult<WordPressTag>> {
    try {
      const response = await this.request<WordPressTag>(`/tags/${id}`);
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single tag by slug
   */
  async getTagBySlug(slug: string): Promise<WordPressResult<WordPressTag>> {
    try {
      const response = await this.request<WordPressTag[]>(
        `/tags?slug=${encodeURIComponent(slug)}`
      );
      if (!response || response.length === 0) {
        return {
          success: false,
          error: { message: 'Tag not found', code: 'NOT_FOUND' },
        };
      }
      return { success: true, data: response[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List tags with pagination and filtering
   */
  async listTags(
    pagination?: WordPressPagination
  ): Promise<WordPressResult<WordPressPaginatedResponse<WordPressTag>>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<WordPressTag[]>(`/tags${query}`);

      return {
        success: true,
        data: {
          items: response,
          meta: {
            total: response.length,
            total_pages: 1,
          },
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get or create a tag by name
   */
  async getOrCreateTag(name: string): Promise<WordPressResult<WordPressTag>> {
    const slug = this.slugify(name);
    const existing = await this.getTagBySlug(slug);

    if (existing.success) {
      return existing;
    }

    return this.createTag({ name });
  }

  /**
   * Get or create tag IDs for an array of tag names
   */
  async getOrCreateTagIds(names: string[]): Promise<number[]> {
    const tagIds: number[] = [];

    for (const name of names) {
      const result = await this.getOrCreateTag(name);
      if (result.success) {
        tagIds.push(result.data.id);
      }
    }

    return tagIds;
  }

  // =====================
  // Media Management
  // =====================

  /**
   * Upload an image to the WordPress media library
   */
  async uploadImage(
    options: WordPressImageUploadOptions
  ): Promise<WordPressResult<WordPressMedia>> {
    try {
      const formData = new FormData();

      let file: Blob | Buffer;
      if (typeof options.file === 'string') {
        // Convert base64 to Blob
        const [metadata, base64Data] = options.file.split(',');
        const mimeMatch = metadata.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const byteString = atob(base64Data);
        const array = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          array[i] = byteString.charCodeAt(i);
        }
        file = new Blob([array], { type: mimeType });
      } else {
        file = options.file as Blob;
      }

      formData.append('file', file, options.filename);
      if (options.alt_text) {
        formData.append('alt_text', options.alt_text);
      }
      if (options.caption) {
        formData.append('caption', options.caption);
      }
      if (options.description) {
        formData.append('description', options.description);
      }

      const headers: HeadersInit = {};
      const authHeader = this.getAuthHeader();
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${this.baseUrl}/${this.apiVersion}/media`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as WordPressErrorResponse;
        throw new CMSError(
          errorData.message || `WordPress API error: ${response.statusText}`,
          errorData.code || 'UPLOAD_ERROR',
          response.status,
          { details: errorData.data }
        );
      }

      const data: WordPressMedia = await response.json();
      return { success: true, data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get media item by ID
   */
  async getMedia(id: number): Promise<WordPressResult<WordPressMedia>> {
    try {
      const response = await this.request<WordPressMedia>(`/media/${id}`);
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete media item
   */
  async deleteMedia(id: number, force = false): Promise<WordPressResult<void>> {
    try {
      await this.request(`/media/${id}?force=${force}`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // User Management
  // =====================

  /**
   * Get a single user by ID
   */
  async getUserById(id: number): Promise<WordPressResult<WordPressUser>> {
    try {
      const response = await this.request<WordPressUser>(
        `/users/${id}?context=edit`
      );
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(
    pagination?: WordPressPagination
  ): Promise<WordPressResult<WordPressPaginatedResponse<WordPressUser>>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<WordPressUser[]>(
        `/users${query}&context=edit`
      );

      return {
        success: true,
        data: {
          items: response,
          meta: {
            total: response.length,
            total_pages: 1,
          },
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Yoast SEO Integration
  // =====================

  /**
   * Update Yoast SEO data for a post
   */
  async updateYoastSEO(
    postId: number,
    seoData: {
      title?: string;
      description?: string;
      focusKeyword?: string;
      canonical?: string;
      opengraphTitle?: string;
      opengraphDescription?: string;
      opengraphImage?: number;
      twitterTitle?: string;
      twitterDescription?: string;
      twitterImage?: number;
    }
  ): Promise<WordPressResult<WordPressPost>> {
    const metaUpdates: Record<string, unknown> = {};

    if (seoData.title) {
      metaUpdates.yoast_title = seoData.title;
    }
    if (seoData.description) {
      metaUpdates.yoast_meta_desc = seoData.description;
    }
    if (seoData.focusKeyword) {
      metaUpdates.yoast_focuskw = seoData.focusKeyword;
    }
    if (seoData.canonical) {
      metaUpdates.yoast_canonical = seoData.canonical;
    }
    if (seoData.opengraphTitle) {
      metaUpdates.yoast_opengraph_title = seoData.opengraphTitle;
    }
    if (seoData.opengraphDescription) {
      metaUpdates.yoast_opengraph_description = seoData.opengraphDescription;
    }
    if (seoData.opengraphImage !== undefined) {
      metaUpdates.yoast_opengraph_image = seoData.opengraphImage;
    }
    if (seoData.twitterTitle) {
      metaUpdates.yoast_twitter_title = seoData.twitterTitle;
    }
    if (seoData.twitterDescription) {
      metaUpdates.yoast_twitter_description = seoData.twitterDescription;
    }
    if (seoData.twitterImage !== undefined) {
      metaUpdates.yoast_twitter_image = seoData.twitterImage;
    }

    return this.updatePost(postId, { meta: metaUpdates });
  }

  // =====================
  // OAuth 2.0 Methods
  // =====================

  /**
   * Get OAuth 2.0 authorization URL
   */
  static getOAuth2AuthorizationUrl(
    oauthConfig: WordPressOAuth2Config,
    state?: string
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: oauthConfig.clientId,
      redirect_uri: oauthConfig.redirectUri,
      scope: oauthConfig.scope || 'global',
    });

    if (state) {
      params.append('state', state);
    }

    return `${oauthConfig.url}/wp-json/wordpress-rest-oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth 2.0 authorization code for access token
   */
  static async exchangeCodeForToken(
    oauthConfig: WordPressOAuth2Config,
    code: string
  ): Promise<string> {
    const response = await fetch(
      `${oauthConfig.url}/wp-json/wordpress-rest-oauth2/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          redirect_uri: oauthConfig.redirectUri,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  // =====================
  // Helper Methods
  // =====================

  /**
   * Convert markdown to basic HTML
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Map CMS publish status to WordPress status
   */
  private mapStatus(status?: string): WordPressPostStatus {
    switch (status) {
      case 'public':
        return 'publish';
      case 'unlisted':
        return 'private';
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
   * Handle errors and convert to WordPressResult
   */
  private handleError(error: unknown): {
    success: false;
    error: WordPressError;
  } {
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
 * Create a new WordPress adapter instance
 */
export function createWordPressAdapter(
  config: WordPressConfig
): WordPressAdapter {
  return new WordPressAdapter(config);
}

/**
 * Validate WordPress configuration
 */
export function validateWordPressConfig(
  config: Partial<WordPressConfig>
): config is WordPressConfig {
  if (!config.url || typeof config.url !== 'string') {
    return false;
  }

  // Check for at least one auth method
  const hasBasicAuth = !!(config.username && config.password);
  const hasOAuthToken = !!config.accessToken;

  if (!hasBasicAuth && !hasOAuthToken) {
    return false;
  }

  return true;
}
