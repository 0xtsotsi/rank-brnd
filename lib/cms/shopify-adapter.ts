/**
 * Shopify CMS Adapter
 *
 * Implements the CMSAdapter interface for Shopify using the Admin API.
 * Supports blog articles, products, collections, and image uploads.
 *
 * Shopify Admin API Documentation: https://shopify.dev/docs/api/admin-rest
 */

import type {
  ShopifyConfig,
  ShopifyBlog,
  ShopifyArticle,
  ShopifyArticleInput,
  ShopifyProduct,
  ShopifyProductInput,
  ShopifyCollection,
  ShopifyCollectionInput,
  ShopifyCollect,
  ShopifyShop,
  ShopifyProductImage,
  ShopifyImageUpload,
  ShopifyProductImageUploadResult,
  ShopifyPagination,
  ShopifyResult,
  ShopifyError,
  ShopifyErrorResponse,
} from '@/types/shopify';

import type { CMSAdapter, CMSPost, CMSUser, PublishResult } from './types';
import { CMSError } from './types';

/**
 * Shopify CMS Adapter for Admin API
 *
 * @example
 * ```typescript
 * const shopify = new ShopifyAdapter({
 *   shopDomain: 'your-shop.myshopify.com',
 *   accessToken: 'your-admin-api-access-token',
 * });
 *
 * // Publish an article
 * const result = await shopify.publish({
 *   title: 'My Article',
 *   content: 'Article content in markdown...',
 *   tags: ['news', 'announcement'],
 * });
 * ```
 */
export class ShopifyAdapter implements CMSAdapter {
  readonly name = 'Shopify';

  private readonly config: ShopifyConfig;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(config: ShopifyConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || '2024-01';
    this.baseUrl = `https://${config.shopDomain}/admin/api/${this.apiVersion}`;
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.shopDomain && this.config.accessToken);
  }

  /**
   * Make an authenticated request to Shopify Admin API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.config.accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as ShopifyErrorResponse;
      const errorMessage =
        errorData.error ||
        (typeof errorData.errors === 'string'
          ? errorData.errors
          : Array.isArray(errorData.errors)
            ? errorData.errors.join(', ')
            : JSON.stringify(errorData.errors)) ||
        `Shopify API error: ${response.statusText}`;

      throw new CMSError(errorMessage, 'SHOPIFY_API_ERROR', response.status, {
        context: errorData,
      });
    }

    return response.json();
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(
    params?: ShopifyPagination | Record<string, unknown>
  ): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
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
   * Publish an article to Shopify blog (implements CMSAdapter interface)
   */
  async publish(post: CMSPost): Promise<PublishResult> {
    // Get the first blog (or create one if none exists)
    const blogsResult = await this.listBlogs({ limit: 1 });
    let blogId: number;

    if (
      !blogsResult.success ||
      !blogsResult.data.blogs ||
      blogsResult.data.blogs.length === 0
    ) {
      // Create a default blog if none exists
      const defaultBlog = await this.createBlog({
        title: 'Blog',
        commentable: 'moderate',
      });
      if (!defaultBlog.success) {
        throw new CMSError(
          'No blog found and failed to create default blog',
          'BLOG_ERROR'
        );
      }
      blogId = defaultBlog.data.id;
    } else {
      blogId = blogsResult.data.blogs[0].id;
    }

    const articleInput: ShopifyArticleInput = {
      title: post.title,
      content_html: post.contentHtml || this.markdownToHtml(post.content),
      author: 'Shopify Admin', // Default author, can be overridden
      tags: post.tags?.join(', ') || '',
      published: post.publishStatus === 'public',
    };

    const result = await this.createArticle(blogId, articleInput);

    if (!result.success) {
      throw new CMSError(result.error.message, 'PUBLISH_ERROR', undefined, {
        details: result.error.details,
      });
    }

    return {
      success: true,
      postId: String(result.data.id),
      url: `https://${this.config.shopDomain}/blogs/news/${result.data.handle}`,
      metadata: {
        blogId,
        handle: result.data.handle,
        publishedAt: result.data.published_at,
      },
    };
  }

  /**
   * Get authenticated shop information (implements CMSAdapter interface)
   */
  async getUser(): Promise<CMSUser> {
    const shop = await this.getShop();

    return {
      id: String(shop.id),
      username: shop.myshopify_domain.replace('.myshopify.com', ''),
      name: shop.name,
      url: `https://${shop.domain}`,
      imageUrl: undefined,
    };
  }

  /**
   * List available blogs (implements CMSAdapter interface as publications)
   */
  async getPublications(): Promise<
    Array<{ id: string; name: string; description?: string; url?: string }>
  > {
    const result = await this.listBlogs();

    if (!result.success) {
      return [];
    }

    return result.data.blogs.map((blog) => ({
      id: String(blog.id),
      name: blog.title,
      url: `https://${this.config.shopDomain}/blogs/${blog.handle}`,
    }));
  }

  // =====================
  // Shop Information
  // =====================

  /**
   * Get shop information
   */
  async getShop(): Promise<ShopifyShop> {
    try {
      const response = await this.request<{ shop: ShopifyShop }>('/shop.json');
      return response.shop;
    } catch (error) {
      throw this.handleErrorToCMSError(error);
    }
  }

  // =====================
  // Blog Management
  // =====================

  /**
   * List all blogs
   */
  async listBlogs(
    pagination?: ShopifyPagination
  ): Promise<ShopifyResult<{ blogs: ShopifyBlog[] }>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<{ blogs: ShopifyBlog[] }>(
        `/blogs.json${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single blog by ID
   */
  async getBlog(id: number): Promise<ShopifyResult<ShopifyBlog>> {
    try {
      const response = await this.request<{ blog: ShopifyBlog }>(
        `/blogs/${id}.json`
      );

      return { success: true, data: response.blog };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new blog
   */
  async createBlog(
    blog: Partial<Pick<ShopifyBlog, 'title' | 'commentable'>>
  ): Promise<ShopifyResult<ShopifyBlog>> {
    try {
      const response = await this.request<{ blog: ShopifyBlog }>(
        '/blogs.json',
        {
          method: 'POST',
          body: JSON.stringify({ blog }),
        }
      );

      return { success: true, data: response.blog };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing blog
   */
  async updateBlog(
    id: number,
    updates: Partial<ShopifyBlog>
  ): Promise<ShopifyResult<ShopifyBlog>> {
    try {
      const response = await this.request<{ blog: ShopifyBlog }>(
        `/blogs/${id}.json`,
        {
          method: 'PUT',
          body: JSON.stringify({ blog: updates }),
        }
      );

      return { success: true, data: response.blog };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a blog
   */
  async deleteBlog(id: number): Promise<ShopifyResult<void>> {
    try {
      await this.request(`/blogs/${id}.json`, { method: 'DELETE' });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Article Management
  // =====================

  /**
   * List articles in a blog
   */
  async listArticles(
    blogId: number,
    pagination?: ShopifyPagination
  ): Promise<ShopifyResult<{ articles: ShopifyArticle[] }>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<{ articles: ShopifyArticle[] }>(
        `/blogs/${blogId}/articles.json${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single article by ID
   */
  async getArticle(
    blogId: number,
    articleId: number
  ): Promise<ShopifyResult<ShopifyArticle>> {
    try {
      const response = await this.request<{ article: ShopifyArticle }>(
        `/blogs/${blogId}/articles/${articleId}.json`
      );

      return { success: true, data: response.article };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get an article by handle
   */
  async getArticleByHandle(
    blogId: number,
    handle: string
  ): Promise<ShopifyResult<ShopifyArticle>> {
    try {
      const response = await this.request<{ article: ShopifyArticle }>(
        `/blogs/${blogId}/articles/handle?handle=${encodeURIComponent(handle)}`
      );

      return { success: true, data: response.article };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new article
   */
  async createArticle(
    blogId: number,
    article: ShopifyArticleInput
  ): Promise<ShopifyResult<ShopifyArticle>> {
    try {
      const response = await this.request<{ article: ShopifyArticle }>(
        `/blogs/${blogId}/articles.json`,
        {
          method: 'POST',
          body: JSON.stringify({ article }),
        }
      );

      return { success: true, data: response.article };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing article
   */
  async updateArticle(
    blogId: number,
    articleId: number,
    updates: Partial<ShopifyArticleInput>
  ): Promise<ShopifyResult<ShopifyArticle>> {
    try {
      const response = await this.request<{ article: ShopifyArticle }>(
        `/blogs/${blogId}/articles/${articleId}.json`,
        {
          method: 'PUT',
          body: JSON.stringify({ article: updates }),
        }
      );

      return { success: true, data: response.article };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete an article
   */
  async deleteArticle(
    blogId: number,
    articleId: number
  ): Promise<ShopifyResult<void>> {
    try {
      await this.request(`/blogs/${blogId}/articles/${articleId}.json`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List all articles across all blogs
   */
  async listAllArticles(
    pagination?: ShopifyPagination
  ): Promise<ShopifyResult<{ articles: ShopifyArticle[] }>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<{ articles: ShopifyArticle[] }>(
        `/articles.json${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Product Management
  // =====================

  /**
   * List products
   */
  async listProducts(
    pagination?: ShopifyPagination
  ): Promise<ShopifyResult<{ products: ShopifyProduct[] }>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<{ products: ShopifyProduct[] }>(
        `/products.json${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(id: number): Promise<ShopifyResult<ShopifyProduct>> {
    try {
      const response = await this.request<{ product: ShopifyProduct }>(
        `/products/${id}.json`
      );

      return { success: true, data: response.product };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new product
   */
  async createProduct(
    product: ShopifyProductInput
  ): Promise<ShopifyResult<ShopifyProduct>> {
    try {
      const response = await this.request<{ product: ShopifyProduct }>(
        '/products.json',
        {
          method: 'POST',
          body: JSON.stringify({ product }),
        }
      );

      return { success: true, data: response.product };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    id: number,
    updates: Partial<ShopifyProductInput>
  ): Promise<ShopifyResult<ShopifyProduct>> {
    try {
      const response = await this.request<{ product: ShopifyProduct }>(
        `/products/${id}.json`,
        {
          method: 'PUT',
          body: JSON.stringify({ product: updates }),
        }
      );

      return { success: true, data: response.product };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<ShopifyResult<void>> {
    try {
      await this.request(`/products/${id}.json`, { method: 'DELETE' });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Count products
   */
  async countProducts(filters?: {
    status?: string;
    vendor?: string;
    product_type?: string;
  }): Promise<ShopifyResult<{ count: number }>> {
    try {
      const query = this.buildQueryString(filters);
      const response = await this.request<{ count: number }>(
        `/products/count.json${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Product Image Management
  // =====================

  /**
   * Add an image to a product
   */
  async addProductImage(
    productId: number,
    image: ShopifyImageUpload
  ): Promise<ShopifyResult<ShopifyProductImageUploadResult>> {
    try {
      const response = await this.request<{
        image: ShopifyProductImageUploadResult;
      }>(`/products/${productId}/images.json`, {
        method: 'POST',
        body: JSON.stringify({ image }),
      });

      return { success: true, data: response.image };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update a product image
   */
  async updateProductImage(
    productId: number,
    imageId: number,
    updates: Partial<ShopifyImageUpload>
  ): Promise<ShopifyResult<ShopifyProductImageUploadResult>> {
    try {
      const response = await this.request<{
        image: ShopifyProductImageUploadResult;
      }>(`/products/${productId}/images/${imageId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ image: updates }),
      });

      return { success: true, data: response.image };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a product image
   */
  async deleteProductImage(
    productId: number,
    imageId: number
  ): Promise<ShopifyResult<void>> {
    try {
      await this.request(`/products/${productId}/images/${imageId}.json`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upload multiple images to a product
   */
  async uploadProductImages(
    productId: number,
    images: Array<{ src: string; alt?: string; position?: number }>
  ): Promise<ShopifyResult<ShopifyProductImageUploadResult[]>> {
    const results: ShopifyProductImageUploadResult[] = [];
    const errors: ShopifyError[] = [];

    for (const image of images) {
      const result = await this.addProductImage(productId, image);
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          message: `Failed to upload ${errors.length} of ${images.length} images`,
          details: errors,
        },
      };
    }

    return { success: true, data: results };
  }

  // =====================
  // Collection Management
  // =====================

  /**
   * List collections (custom collections)
   */
  async listCollections(
    pagination?: ShopifyPagination
  ): Promise<ShopifyResult<{ collections: ShopifyCollection[] }>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<{
        custom_collections: ShopifyCollection[];
      }>(`/custom_collections.json${query}`);

      return {
        success: true,
        data: { collections: response.custom_collections },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single collection by ID
   */
  async getCollection(id: number): Promise<ShopifyResult<ShopifyCollection>> {
    try {
      const response = await this.request<{
        custom_collection: ShopifyCollection;
      }>(`/custom_collections/${id}.json`);

      return { success: true, data: response.custom_collection };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(
    collection: ShopifyCollectionInput
  ): Promise<ShopifyResult<ShopifyCollection>> {
    try {
      const response = await this.request<{
        custom_collection: ShopifyCollection;
      }>('/custom_collections.json', {
        method: 'POST',
        body: JSON.stringify({ custom_collection: collection }),
      });

      return { success: true, data: response.custom_collection };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing collection
   */
  async updateCollection(
    id: number,
    updates: Partial<ShopifyCollectionInput>
  ): Promise<ShopifyResult<ShopifyCollection>> {
    try {
      const response = await this.request<{
        custom_collection: ShopifyCollection;
      }>(`/custom_collections/${id}.json`, {
        method: 'PUT',
        body: JSON.stringify({ custom_collection: updates }),
      });

      return { success: true, data: response.custom_collection };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(id: number): Promise<ShopifyResult<void>> {
    try {
      await this.request(`/custom_collections/${id}.json`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Count collections
   */
  async countCollections(): Promise<ShopifyResult<{ count: number }>> {
    try {
      const response = await this.request<{ count: number }>(
        '/custom_collections/count.json'
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // =====================
  // Collection Product Management
  // =====================

  /**
   * Add a product to a collection
   */
  async addProductToCollection(
    collectionId: number,
    productId: number
  ): Promise<ShopifyResult<ShopifyCollect>> {
    try {
      const response = await this.request<{ collect: ShopifyCollect }>(
        '/collects.json',
        {
          method: 'POST',
          body: JSON.stringify({
            collect: {
              collection_id: collectionId,
              product_id: productId,
            },
          }),
        }
      );

      return { success: true, data: response.collect };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Remove a product from a collection (by collect ID)
   */
  async removeProductFromCollection(
    collectId: number
  ): Promise<ShopifyResult<void>> {
    try {
      await this.request(`/collects/${collectId}.json`, {
        method: 'DELETE',
      });
      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List products in a collection
   */
  async getCollectionProducts(
    collectionId: number,
    pagination?: ShopifyPagination
  ): Promise<ShopifyResult<{ products: ShopifyProduct[] }>> {
    try {
      const query = this.buildQueryString(pagination);
      const response = await this.request<{ products: ShopifyProduct[] }>(
        `/custom_collections/${collectionId}/products.json${query}`
      );

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List collects for a collection
   */
  async listCollectionCollects(
    collectionId: number
  ): Promise<ShopifyResult<{ collects: ShopifyCollect[] }>> {
    try {
      const response = await this.request<{ collects: ShopifyCollect[] }>(
        `/collects.json?collection_id=${collectionId}`
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
   * Handle errors and convert to ShopifyResult
   */
  private handleError(error: unknown): { success: false; error: ShopifyError } {
    if (error instanceof CMSError) {
      return {
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
          details: error.details,
        },
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        message: 'An unknown error occurred',
      },
    };
  }

  /**
   * Handle errors and convert to CMSError
   */
  private handleErrorToCMSError(error: unknown): CMSError {
    if (error instanceof CMSError) {
      return error;
    }

    if (error instanceof Error) {
      return new CMSError(error.message, 'UNKNOWN_ERROR');
    }

    return new CMSError('An unknown error occurred', 'UNKNOWN_ERROR');
  }
}

/**
 * Create a new Shopify adapter instance
 */
export function createShopifyAdapter(config: ShopifyConfig): ShopifyAdapter {
  return new ShopifyAdapter(config);
}

/**
 * Validate Shopify configuration
 */
export function validateShopifyConfig(
  config: Partial<ShopifyConfig>
): config is ShopifyConfig {
  if (!config.shopDomain || typeof config.shopDomain !== 'string') {
    return false;
  }

  if (!config.accessToken || typeof config.accessToken !== 'string') {
    return false;
  }

  // Basic validation for shop domain format
  const domainRegex = /^[\w-]+(\.myshopify\.com|[\w.-]+)$/i;
  if (!domainRegex.test(config.shopDomain)) {
    return false;
  }

  return true;
}
