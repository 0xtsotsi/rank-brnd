/**
 * CMS Adapters Module
 *
 * This module provides adapters for publishing content to various CMS platforms.
 * All adapters implement the CMSAdapter interface for consistent usage.
 *
 * @example
 * ```typescript
 * import { createGhostAdapter, CMSAdapter } from '@/lib/cms';
 *
 * const ghost = createGhostAdapter({
 *   url: 'https://your-site.ghost.io',
 *   adminApiKey: 'your-admin-api-key',
 * });
 *
 * await ghost.publish({
 *   title: 'My Post',
 *   content: '# Hello World',
 *   tags: ['technology'],
 * });
 * ```
 */

// Types
export type {
  CMSAdapter,
  CMSConfig,
  CMSPost,
  CMSPublication,
  CMSUser,
  PublishResult,
} from './types';

export { CMSError } from './types';
import type { CMSAdapter } from './types';

// Import adapters for factory function use
import {
  GhostAdapter,
  createGhostAdapter,
  validateGhostConfig,
} from './ghost-adapter';

import { MediumAdapter, createMediumAdapter } from './medium-adapter';
import type { MediumConfig } from './medium-adapter';

import {
  NotionAdapter,
  createNotionAdapter,
  validateNotionConfig,
  formatNotionId,
  parseNotionUrl,
} from './notion-adapter';

// Re-export for external use
export { GhostAdapter, createGhostAdapter, validateGhostConfig };

// Medium Adapter
export { MediumAdapter, createMediumAdapter };
export type { MediumConfig };

// Notion Adapter
export {
  NotionAdapter,
  createNotionAdapter,
  validateNotionConfig,
  formatNotionId,
  parseNotionUrl,
};

// Utilities
export {
  generateSlug,
  htmlToPlainText,
  isValidUrl,
  markdownToHtml,
  sanitizeTags,
  truncateText,
} from './utils';

// Re-export Ghost types for convenience
export type {
  GhostConfig,
  GhostPost,
  GhostPostInput,
  GhostTag,
  GhostTagInput,
  GhostAuthor,
  GhostPagination,
  GhostResult,
  GhostError,
} from '@/types/ghost';

// Re-export Notion types for convenience
export type {
  NotionConfig,
  NotionPage,
  NotionDatabase,
  NotionBlock,
  NotionRichText,
  NotionPropertyValue,
  NotionPropertyMapping,
  NotionResult,
  NotionError,
} from '@/types/notion';

// WordPress Adapter
import {
  WordPressAdapter,
  createWordPressAdapter,
  validateWordPressConfig,
} from './wordpress-adapter';

export { WordPressAdapter, createWordPressAdapter, validateWordPressConfig };

// Re-export WordPress types for convenience
export type {
  WordPressConfig,
  WordPressPost,
  WordPressPostInput,
  WordPressCategory,
  WordPressCategoryInput,
  WordPressTag,
  WordPressTagInput,
  WordPressMedia,
  WordPressUser,
  WordPressPagination,
  WordPressResult,
  WordPressError,
  WordPressImageUploadOptions,
  WordPressOAuth2Config,
} from '@/types/wordpress';

// Webflow Adapter
import {
  WebflowAdapter,
  createWebflowAdapter,
  validateWebflowConfig,
  formatCollectionUrl,
} from './webflow-adapter';

export {
  WebflowAdapter,
  createWebflowAdapter,
  validateWebflowConfig,
  formatCollectionUrl,
};

// Re-export Webflow types for convenience
export type {
  WebflowConfig,
  WebflowCollection,
  WebflowCollectionItem,
  WebflowCollectionItemInput,
  WebflowField,
  WebflowFieldType,
  WebflowResult,
  WebflowError,
  WebflowPublishResponse,
} from '@/types/webflow';

// Shopify Adapter
import {
  ShopifyAdapter,
  createShopifyAdapter,
  validateShopifyConfig,
} from './shopify-adapter';

export { ShopifyAdapter, createShopifyAdapter, validateShopifyConfig };

// Re-export Shopify types for convenience
export type {
  ShopifyConfig,
  ShopifyBlog,
  ShopifyArticle,
  ShopifyArticleInput,
  ShopifyProduct,
  ShopifyProductInput,
  ShopifyCollection,
  ShopifyCollectionInput,
  ShopifyShop,
  ShopifyProductImage,
  ShopifyImageUpload,
  ShopifyPagination,
  ShopifyResult,
  ShopifyError,
} from '@/types/shopify';

/**
 * Supported CMS platforms
 */
export const SUPPORTED_CMS_PLATFORMS = [
  'ghost',
  'medium',
  'notion',
  'wordpress',
  'webflow',
  'shopify',
] as const;

export type SupportedCMSPlatform = (typeof SUPPORTED_CMS_PLATFORMS)[number];

/**
 * CMS Platform configuration type map
 */
export interface CMSPlatformConfigs {
  ghost: import('@/types/ghost').GhostConfig;
  medium: import('./medium-adapter').MediumConfig;
  notion: import('@/types/notion').NotionConfig;
  wordpress: import('@/types/wordpress').WordPressConfig;
  webflow: import('@/types/webflow').WebflowConfig;
  shopify: import('@/types/shopify').ShopifyConfig;
}

/**
 * Factory function to create CMS adapters
 */
export function createCMSAdapter<T extends SupportedCMSPlatform>(
  platform: T,
  config: CMSPlatformConfigs[T]
): CMSAdapter {
  switch (platform) {
    case 'ghost':
      return createGhostAdapter(config as CMSPlatformConfigs['ghost']);
    case 'medium':
      return new MediumAdapter(config as CMSPlatformConfigs['medium']);
    case 'notion':
      return new NotionAdapter(config as CMSPlatformConfigs['notion']);
    case 'wordpress':
      return createWordPressAdapter(config as CMSPlatformConfigs['wordpress']);
    case 'webflow':
      return createWebflowAdapter(config as CMSPlatformConfigs['webflow']);
    case 'shopify':
      return createShopifyAdapter(config as CMSPlatformConfigs['shopify']);
    default:
      throw new Error(`Unsupported CMS platform: ${platform}`);
  }
}
