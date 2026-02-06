/**
 * Webflow CMS Adapter
 *
 * Implements the CMSAdapter interface for Webflow CMS using the REST API v2.
 * Supports collection management, item creation/update/publish, and field handling.
 *
 * Webflow CMS API Documentation: https://developers.webflow.com/docs
 */

import type {
  WebflowConfig,
  WebflowCollection,
  WebflowCollectionItem,
  WebflowCollectionItemInput,
  WebflowCollectionItemsResponse,
  WebflowCollectionResponse,
  WebflowCollectionsResponse,
  WebflowCollectionItemResponse,
  WebflowErrorResponse,
  WebflowField,
  WebflowFieldValidation,
  WebflowImageUpload,
  WebflowItemState,
  WebflowPagination,
  WebflowPublishResponse,
  WebflowResult,
  WebflowSite,
  WebflowSitesResponse,
} from '@/types/webflow';

import type { CMSAdapter, CMSPost, CMSUser, PublishResult } from './types';

import { CMSError } from './types';

/**
 * Webflow CMS Adapter for CMS API v2
 *
 * @example
 * ```typescript
 * const webflow = new WebflowAdapter({
 *   siteId: 'your-site-id',
 *   accessToken: 'your-api-token',
 * });
 *
 * // Create a collection item
 * const result = await webflow.createItem('collection-id', {
 *   fieldData: {
 *     name: 'My Post',
 *     slug: 'my-post',
 *     'post-body': '<p>Post content...</p>',
 *   },
 * });
 * ```
 */
export class WebflowAdapter implements CMSAdapter {
  readonly name = 'Webflow';

  private readonly config: WebflowConfig;
  private readonly baseUrl: string;
  private siteCache?: WebflowSite;
  private collectionsCache?: Map<string, WebflowCollection>;

  constructor(config: WebflowConfig) {
    this.config = config;
    this.baseUrl = config.version
      ? `https://api.webflow.com/${config.version}`
      : 'https://api.webflow.com/v2';
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.siteId && this.config.accessToken);
  }

  /**
   * Make an authenticated request to Webflow API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as WebflowErrorResponse;

      throw new CMSError(
        errorData.message || `Webflow API error: ${response.statusText}`,
        errorData.name || 'API_ERROR',
        response.status,
        {
          code: errorData.code,
          problems: errorData.problems,
          details: errorData.err,
        }
      );
    }

    return response.json();
  }

  /**
   * Build query string from pagination parameters
   */
  private buildQueryString(params?: WebflowPagination): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return query ? `?${query}` : '';
  }

  // =====================
  // CMSAdapter Interface
  // =====================

  /**
   * Publish a post to Webflow CMS (implements CMSAdapter interface)
   * Note: Webflow doesn't have a direct "publish" concept for posts.
   * This method creates or updates a collection item and publishes it.
   */
  async publish(post: CMSPost): Promise<PublishResult> {
    // First, find or create a suitable collection for blog posts
    const collections = await this.listCollections();
    const blogCollection =
      collections.find(
        (c) =>
          c.slug.includes('blog') ||
          c.slug.includes('post') ||
          c.name.toLowerCase().includes('blog')
      ) || collections[0];

    if (!blogCollection) {
      throw new CMSError(
        'No suitable collection found for publishing posts',
        'NO_COLLECTION'
      );
    }

    // Convert CMSPost to Webflow item data
    const fieldData = this.postToItemData(post, blogCollection);

    // Create the item
    const result = await this.createItem(blogCollection._id, {
      fieldData,
      isDraft: post.publishStatus === 'draft',
    });

    if (!result.success) {
      throw new CMSError(
        result.error.message || 'Failed to create item',
        result.error.name || 'CREATE_ERROR',
        undefined,
        { details: result.error.details }
      );
    }

    // If not draft, publish the item
    if (post.publishStatus !== 'draft') {
      await this.publishItems(blogCollection._id, [result.data._id]);
    }

    // Get the site to build the URL
    const site = await this.getSite();
    const itemSlug = fieldData.slug || this.slugify(post.title);
    const url = `https://${site.defaultDomain}/${blogCollection.slug}/${itemSlug}`;

    return {
      success: true,
      postId: result.data._id,
      url,
      metadata: {
        collectionId: blogCollection._id,
        collectionName: blogCollection.name,
        slug: itemSlug,
        isDraft: post.publishStatus === 'draft',
      },
    };
  }

  /**
   * Get authenticated user information (implements CMSAdapter interface)
   * Note: Webflow API v2 doesn't provide user info directly,
   * so we return site information instead.
   */
  async getUser(): Promise<CMSUser> {
    const site = await this.getSite();

    return {
      id: site._id,
      username: site.shortName,
      name: site.name,
      url: `https://${site.defaultDomain}`,
    };
  }

  // =====================
  // Site Management
  // =====================

  /**
   * Get the current site information
   */
  async getSite(): Promise<WebflowSite> {
    if (this.siteCache) {
      return this.siteCache;
    }

    const response = await this.request<WebflowSite>(
      `/sites/${this.config.siteId}`
    );

    this.siteCache = response;
    return response;
  }

  /**
   * List all sites for the authenticated user
   */
  async listSites(): Promise<WebflowResult<WebflowSitesResponse>> {
    try {
      const response = await this.request<WebflowSitesResponse>('/sites');
      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Collection Management
  // =====================

  /**
   * List all collections for the site
   */
  async listCollections(): Promise<WebflowCollection[]> {
    if (this.collectionsCache) {
      return Array.from(this.collectionsCache.values());
    }

    try {
      const response = await this.request<WebflowCollectionsResponse>(
        `/sites/${this.config.siteId}/collections`
      );

      this.collectionsCache = new Map(
        response.collections.map((c) => [c._id, c])
      );

      return response.collections;
    } catch (error) {
      if (error instanceof CMSError) {
        throw error;
      }
      throw new CMSError(
        error instanceof Error ? error.message : 'Failed to list collections',
        'LIST_COLLECTIONS_ERROR'
      );
    }
  }

  /**
   * Get a single collection by ID
   */
  async getCollection(id: string): Promise<WebflowResult<WebflowCollection>> {
    try {
      const response = await this.request<WebflowCollectionResponse>(
        `/collections/${id}`
      );

      return { success: true, data: response.collection };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a field by its slug from a collection
   */
  async getField(
    collectionId: string,
    fieldSlug: string
  ): Promise<WebflowResult<WebflowField>> {
    const collectionResult = await this.getCollection(collectionId);

    if (!collectionResult.success) {
      return collectionResult as unknown as WebflowResult<WebflowField>;
    }

    const field = collectionResult.data.fields.find(
      (f) => f.slug === fieldSlug
    );

    if (!field) {
      return {
        success: false,
        error: {
          message: `Field '${fieldSlug}' not found in collection`,
          code: 404,
        },
      };
    }

    return { success: true, data: field };
  }

  // =====================
  // Item Management
  // =====================

  /**
   * Create a new collection item
   */
  async createItem(
    collectionId: string,
    item: WebflowCollectionItemInput
  ): Promise<WebflowResult<WebflowCollectionItem>> {
    try {
      const response = await this.request<WebflowCollectionItemResponse>(
        `/collections/${collectionId}/items`,
        {
          method: 'POST',
          body: JSON.stringify(item),
        }
      );

      // Clear cache for this collection
      this.collectionsCache?.delete(collectionId);

      return { success: true, data: response.item };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing collection item
   */
  async updateItem(
    collectionId: string,
    itemId: string,
    item: WebflowCollectionItemInput
  ): Promise<WebflowResult<WebflowCollectionItem>> {
    try {
      const response = await this.request<WebflowCollectionItemResponse>(
        `/collections/${collectionId}/items/${itemId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(item),
        }
      );

      // Clear cache for this collection
      this.collectionsCache?.delete(collectionId);

      return { success: true, data: response.item };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a collection item
   */
  async deleteItem(
    collectionId: string,
    itemId: string
  ): Promise<WebflowResult<void>> {
    try {
      await this.request(`/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE',
      });

      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single item by ID
   */
  async getItem(
    collectionId: string,
    itemId: string
  ): Promise<WebflowResult<WebflowCollectionItem>> {
    try {
      const response = await this.request<WebflowCollectionItemResponse>(
        `/collections/${collectionId}/items/${itemId}`
      );

      return { success: true, data: response.item };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List items in a collection with pagination
   */
  async listItems(
    collectionId: string,
    pagination?: WebflowPagination
  ): Promise<WebflowResult<WebflowCollectionItemsResponse>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<WebflowCollectionItemsResponse>(
        `/collections/${collectionId}/items${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Publish collection items to make them live on the site
   */
  async publishItems(
    collectionId: string,
    itemIds: string[]
  ): Promise<WebflowResult<WebflowPublishResponse>> {
    try {
      const response = await this.request<WebflowPublishResponse>(
        `/collections/${collectionId}/items/publish`,
        {
          method: 'POST',
          body: JSON.stringify({ itemIds }),
        }
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Unpublish collection items (set back to draft)
   */
  async unpublishItems(
    collectionId: string,
    itemIds: string[]
  ): Promise<WebflowResult<void>> {
    try {
      // First, get the current items to update them as drafts
      const updatePromises = itemIds.map((itemId) =>
        this.updateItem(collectionId, itemId, { isDraft: true, fieldData: {} })
      );

      await Promise.all(updatePromises);

      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Field Type Handling
  // =====================

  /**
   * Validate field data against collection schema
   */
  async validateFieldData(
    collectionId: string,
    fieldData: Record<string, unknown>
  ): Promise<WebflowResult<Record<string, string | null>>> {
    const collectionResult = await this.getCollection(collectionId);

    if (!collectionResult.success) {
      return {
        success: false,
        error: collectionResult.error,
      };
    }

    const errors: Record<string, string> = {};
    const collection = collectionResult.data;

    for (const field of collection.fields) {
      const value = fieldData[field.slug];

      // Check required fields
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors[field.slug] = `Field '${field.name}' is required`;
        continue;
      }

      // Skip validation if value is empty and not required
      if (!value && !field.required) {
        continue;
      }

      // Type-specific validation
      const fieldError = this.validateFieldValue(field, value);
      if (fieldError) {
        errors[field.slug] = fieldError;
      }
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        error: {
          message: 'Field validation failed',
          details: errors,
        },
      };
    }

    return { success: true, data: {} };
  }

  /**
   * Validate a single field value
   */
  private validateFieldValue(
    field: WebflowField,
    value: unknown
  ): string | null {
    const validations = field.validations || [];

    for (const validation of validations) {
      // String length validation
      if (validation.minLength !== undefined) {
        if (typeof value === 'string' && value.length < validation.minLength) {
          return `Minimum length is ${validation.minLength}`;
        }
      }

      if (validation.maxLength !== undefined) {
        if (typeof value === 'string' && value.length > validation.maxLength) {
          return `Maximum length is ${validation.maxLength}`;
        }
      }

      // Option validation
      if (validation.options && Array.isArray(validation.options)) {
        const validValues = validation.options.map((o) => o.id);
        if (Array.isArray(value)) {
          for (const v of value) {
            if (!validValues.includes(v as string)) {
              return `Invalid option selected`;
            }
          }
        } else if (value && !validValues.includes(value as string)) {
          return `Invalid option selected`;
        }
      }
    }

    return null;
  }

  // =====================
  // Asset Management
  // =====================

  /**
   * Upload an image to Webflow assets
   */
  async uploadImage(
    file: File | Blob,
    fileName?: string
  ): Promise<WebflowResult<WebflowImageUpload>> {
    try {
      // First, get an upload URL
      const uploadName =
        fileName || (file instanceof File ? file.name : 'upload');

      // For Webflow v2, we need to upload to the assets endpoint
      const formData = new FormData();
      formData.append('file', file, uploadName);

      const response = await fetch(
        `https://api.webflow.com/v2/sites/${this.config.siteId}/assets`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            // Don't set Content-Type for FormData - browser will set it with boundary
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as WebflowErrorResponse;

        throw new CMSError(
          errorData.message || 'Image upload failed',
          errorData.name || 'UPLOAD_ERROR',
          response.status
        );
      }

      const data = (await response.json()) as { asset?: WebflowImageUpload };

      if (!data.asset) {
        throw new CMSError('Invalid upload response', 'UPLOAD_ERROR');
      }

      return { success: true, data: data.asset };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Helper Methods
  // =====================

  /**
   * Convert CMSPost to Webflow item field data
   */
  private postToItemData(
    post: CMSPost,
    collection: WebflowCollection
  ): Record<string, unknown> {
    const fieldData: Record<string, unknown> = {};

    // Common field mappings for blog collections
    const fields = collection.fields;

    // Try to find a title/name field
    const titleField = fields.find(
      (f) =>
        f.slug === 'name' ||
        f.slug === 'title' ||
        f.type === 'PlainTextField' ||
        f.type === 'RichText'
    );

    if (titleField) {
      fieldData[titleField.slug] = post.title;
    }

    // Try to find a slug field
    const slugField = fields.find((f) => f.slug === 'slug');
    if (slugField) {
      fieldData.slug = this.slugify(post.title);
    }

    // Try to find a body/content field
    const bodyField = fields.find(
      (f) =>
        f.slug.includes('body') ||
        f.slug.includes('content') ||
        f.name.toLowerCase().includes('body') ||
        f.name.toLowerCase().includes('content')
    );

    if (bodyField && (post.contentHtml || post.content)) {
      fieldData[bodyField.slug] =
        post.contentHtml || this.markdownToHtml(post.content);
    }

    // Try to find a summary/excerpt field
    const excerptField = fields.find(
      (f) =>
        f.slug.includes('excerpt') ||
        f.slug.includes('summary') ||
        f.name.toLowerCase().includes('excerpt')
    );

    if (excerptField && post.content) {
      fieldData[excerptField.slug] = this.truncateText(post.content, 200);
    }

    // Handle tags if a tag field exists
    const tagField = fields.find(
      (f) => f.slug === 'tags' || f.name.toLowerCase().includes('tag')
    );

    if (tagField && post.tags && post.tags.length > 0) {
      // Webflow Set fields expect an array of option IDs
      if (tagField.type === 'Set') {
        fieldData[tagField.slug] = post.tags;
      } else {
        fieldData[tagField.slug] = post.tags.join(', ');
      }
    }

    // Handle canonical URL if field exists
    const canonicalField = fields.find((f) => f.slug === 'canonical-url');
    if (canonicalField && post.canonicalUrl) {
      fieldData[canonicalField.slug] = post.canonicalUrl;
    }

    return fieldData;
  }

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
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/g, '<p>$1</p>')
      .replace(/<p><h([1-6])>/g, '<h$1>')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/<p><\/p>/g, '');
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
   * Truncate text to a maximum length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Handle errors and convert to WebflowResult
   */
  private handleError(error: unknown): {
    success: false;
    error: { message: string; code?: number; name?: string; details?: unknown };
  } {
    if (error instanceof CMSError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.statusCode,
          name: error.code,
          details: error.details,
        },
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: 'UNKNOWN_ERROR',
        },
      };
    }

    return {
      success: false,
      error: {
        message: 'An unknown error occurred',
        name: 'UNKNOWN_ERROR',
      },
    };
  }
}

/**
 * Create a new Webflow adapter instance
 */
export function createWebflowAdapter(config: WebflowConfig): WebflowAdapter {
  return new WebflowAdapter(config);
}

/**
 * Validate Webflow configuration
 */
export function validateWebflowConfig(
  config: Partial<WebflowConfig>
): config is WebflowConfig {
  if (!config.siteId || typeof config.siteId !== 'string') {
    return false;
  }

  if (!config.accessToken || typeof config.accessToken !== 'string') {
    return false;
  }

  return true;
}

/**
 * Format a Webflow collection URL
 */
export function formatCollectionUrl(
  siteDomain: string,
  collectionSlug: string,
  itemSlug: string
): string {
  return `https://${siteDomain}/${collectionSlug}/${itemSlug}`;
}
