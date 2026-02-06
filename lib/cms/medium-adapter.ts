/**
 * Medium CMS Adapter
 *
 * This adapter implements the CMSAdapter interface for Medium.
 * It uses Medium's official API to publish posts, manage publications, and handle formatting.
 *
 * @see https://github.com/Medium/medium-api-docs
 */

import {
  CMSAdapter,
  CMSConfig,
  CMSError,
  CMSPost,
  CMSPublication,
  CMSUser,
  PublishResult,
} from './types';
import { markdownToHtml, sanitizeTags } from './utils';

/**
 * Medium-specific configuration options
 */
export interface MediumConfig extends CMSConfig {
  /** Publication ID to publish to (optional - if not provided, publishes to user's profile) */
  publicationId?: string;
}

/**
 * Medium API response types
 */
interface MediumAPIUser {
  id: string;
  username: string;
  name: string;
  url: string;
  imageUrl: string;
}

interface MediumAPIPublication {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string;
}

interface MediumAPIPost {
  id: string;
  title: string;
  authorId: string;
  url: string;
  canonicalUrl: string;
  publishStatus: string;
  publishedAt: number;
  license: string;
  licenseUrl: string;
  tags: string[];
}

interface MediumAPIResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    code: number;
  }>;
}

/**
 * Medium CMS Adapter implementation
 *
 * @example
 * ```typescript
 * const adapter = new MediumAdapter({
 *   accessToken: process.env.MEDIUM_ACCESS_TOKEN,
 *   publicationId: 'my-publication-id', // optional
 * });
 *
 * // Get user info
 * const user = await adapter.getUser();
 *
 * // Publish a post
 * const result = await adapter.publish({
 *   title: 'My Article',
 *   content: '# Hello World\n\nThis is my article.',
 *   tags: ['programming', 'tutorial'],
 *   publishStatus: 'draft',
 * });
 * ```
 */
export class MediumAdapter implements CMSAdapter {
  readonly name = 'Medium';
  private readonly baseUrl = 'https://api.medium.com/v1';
  private readonly config: MediumConfig;
  private cachedUser: CMSUser | null = null;

  constructor(config: MediumConfig) {
    this.config = config;
  }

  /**
   * Check if the adapter has a valid access token
   */
  isConfigured(): boolean {
    return Boolean(
      this.config.accessToken && this.config.accessToken.length > 0
    );
  }

  /**
   * Get the authenticated user's information
   */
  async getUser(): Promise<CMSUser> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    const response =
      await this.makeRequest<MediumAPIResponse<MediumAPIUser>>('/me');

    if (response.errors && response.errors.length > 0) {
      throw new CMSError(
        response.errors[0].message,
        'MEDIUM_API_ERROR',
        response.errors[0].code
      );
    }

    this.cachedUser = {
      id: response.data.id,
      username: response.data.username,
      name: response.data.name,
      url: response.data.url,
      imageUrl: response.data.imageUrl,
    };

    return this.cachedUser;
  }

  /**
   * Get publications the user can publish to
   */
  async getPublications(): Promise<CMSPublication[]> {
    const user = await this.getUser();
    const response = await this.makeRequest<
      MediumAPIResponse<MediumAPIPublication[]>
    >(`/users/${user.id}/publications`);

    if (response.errors && response.errors.length > 0) {
      throw new CMSError(
        response.errors[0].message,
        'MEDIUM_API_ERROR',
        response.errors[0].code
      );
    }

    return response.data.map((pub) => ({
      id: pub.id,
      name: pub.name,
      description: pub.description,
      url: pub.url,
      imageUrl: pub.imageUrl,
    }));
  }

  /**
   * Publish a post to Medium
   *
   * @param post - The post to publish
   * @returns The publish result with post ID and URL
   */
  async publish(post: CMSPost): Promise<PublishResult> {
    // Validate required fields
    if (!post.title || post.title.trim().length === 0) {
      throw new CMSError('Post title is required', 'VALIDATION_ERROR');
    }

    if (!post.content || post.content.trim().length === 0) {
      throw new CMSError('Post content is required', 'VALIDATION_ERROR');
    }

    // Get user ID for endpoint
    const user = await this.getUser();

    // Convert markdown to HTML if needed
    const contentHtml = post.contentHtml || markdownToHtml(post.content);

    // Prepare tags (Medium allows max 5 tags)
    const tags = sanitizeTags(post.tags || [], 5);

    // Build request body
    const body = {
      title: post.title.trim(),
      contentFormat: 'html',
      content: contentHtml,
      tags,
      canonicalUrl: post.canonicalUrl,
      publishStatus: this.mapPublishStatus(post.publishStatus),
      notifyFollowers: post.notifyFollowers ?? true,
    };

    // Determine endpoint based on publication or user profile
    const endpoint = this.config.publicationId
      ? `/publications/${this.config.publicationId}/posts`
      : `/users/${user.id}/posts`;

    const response = await this.makeRequest<MediumAPIResponse<MediumAPIPost>>(
      endpoint,
      'POST',
      body
    );

    if (response.errors && response.errors.length > 0) {
      throw new CMSError(
        response.errors[0].message,
        'MEDIUM_PUBLISH_ERROR',
        response.errors[0].code,
        { title: post.title }
      );
    }

    return {
      success: true,
      postId: response.data.id,
      url: response.data.url,
      metadata: {
        publishedAt: response.data.publishedAt,
        publishStatus: response.data.publishStatus,
        authorId: response.data.authorId,
        tags: response.data.tags,
      },
    };
  }

  /**
   * Map internal publish status to Medium's format
   */
  private mapPublishStatus(status?: string): 'public' | 'draft' | 'unlisted' {
    switch (status) {
      case 'public':
        return 'public';
      case 'unlisted':
        return 'unlisted';
      case 'draft':
      default:
        return 'draft';
    }
  }

  /**
   * Make a request to the Medium API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new CMSError(
        'Medium adapter is not configured. Please provide an access token.',
        'NOT_CONFIGURED'
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Charset': 'utf-8',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new CMSError(
          errorData.errors?.[0]?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          'MEDIUM_HTTP_ERROR',
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CMSError) {
        throw error;
      }

      throw new CMSError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'NETWORK_ERROR',
        undefined,
        { originalError: error }
      );
    }
  }
}

/**
 * Create a Medium adapter instance with environment configuration
 */
export function createMediumAdapter(
  accessToken?: string,
  publicationId?: string
): MediumAdapter {
  const token = accessToken || process.env.MEDIUM_ACCESS_TOKEN;

  if (!token) {
    throw new CMSError(
      'Medium access token is required. Set MEDIUM_ACCESS_TOKEN environment variable or pass it directly.',
      'MISSING_TOKEN'
    );
  }

  return new MediumAdapter({
    accessToken: token,
    publicationId: publicationId || process.env.MEDIUM_PUBLICATION_ID,
  });
}
