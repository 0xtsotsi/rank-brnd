/**
 * CMS Adapter Types
 *
 * This file defines the common interfaces and types for CMS adapters.
 * All CMS adapters (Medium, WordPress, Webflow, etc.) should implement
 * the CMSAdapter interface for consistency.
 */

/**
 * Represents a post/article that can be published to any CMS
 */
export interface CMSPost {
  /** Title of the post */
  title: string;
  /** Content of the post (Markdown format) */
  content: string;
  /** Optional HTML content (for platforms that prefer HTML) */
  contentHtml?: string;
  /** Tags/categories for the post */
  tags?: string[];
  /** Whether the post should be published immediately or saved as draft */
  publishStatus?: 'draft' | 'public' | 'unlisted';
  /** Canonical URL if republishing from another source */
  canonicalUrl?: string;
  /** Notify followers about this post */
  notifyFollowers?: boolean;
}

/**
 * Result of a successful publish operation
 */
export interface PublishResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Unique identifier of the post on the CMS platform */
  postId: string;
  /** URL where the post can be viewed */
  url: string;
  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for CMS adapters
 */
export interface CMSConfig {
  /** API access token */
  accessToken: string;
  /** Optional API base URL (for self-hosted solutions) */
  baseUrl?: string;
  /** Additional platform-specific options */
  options?: Record<string, unknown>;
}

/**
 * Interface that all CMS adapters must implement
 */
export interface CMSAdapter {
  /** Name of the CMS platform */
  readonly name: string;

  /** Publish a post to the CMS */
  publish(post: CMSPost): Promise<PublishResult>;

  /** Get information about the authenticated user */
  getUser(): Promise<CMSUser>;

  /** List available publications/sites (if applicable) */
  getPublications?(): Promise<CMSPublication[]>;

  /** Check if the adapter is properly configured */
  isConfigured(): boolean;
}

/**
 * User information from the CMS platform
 */
export interface CMSUser {
  id: string;
  username: string;
  name: string;
  url?: string;
  imageUrl?: string;
}

/**
 * Publication/site information (for platforms like Medium that support publications)
 */
export interface CMSPublication {
  id: string;
  name: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}

/**
 * Error class for CMS-related errors
 */
export class CMSError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CMSError';
  }
}
