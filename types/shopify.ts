/**
 * Shopify CMS Types
 *
 * Type definitions for Shopify Admin API entities and operations.
 * Based on Shopify Admin API REST 2024-01+ specification.
 *
 * Shopify Admin API Documentation: https://shopify.dev/docs/api/admin-rest
 */

/**
 * Shopify API configuration required for authentication
 */
export interface ShopifyConfig {
  /** Shopify shop domain (e.g., your-shop.myshopify.com) */
  shopDomain: string;
  /** Admin API access token (X-Shopify-Access-Token) */
  accessToken: string;
  /** API version (default: 2024-01) */
  apiVersion?: string;
}

/**
 * Shopify Blog entity (container for articles)
 */
export interface ShopifyBlog {
  id: number;
  title: string;
  handle: string;
  commentable: string;
  feedburner: string | null;
  feedburner_location: string | null;
  created_at: string;
  updated_at: string;
  tags: string;
  admin_graphql_api_id: string;
}

/**
 * Shopify Article status
 */
export type ShopifyArticleStatus = 'published' | 'draft' | 'scheduled';

/**
 * Shopify Author entity (article author)
 */
export interface ShopifyAuthor {
  id: number;
  name: string;
  email: string;
  bio: string | null;
  admin_graphql_api_id: string;
}

/**
 * Shopify Article entity (blog post)
 */
export interface ShopifyArticle {
  id: number;
  title: string;
  content_html: string;
  handle: string;
  blog_id: number;
  author: string;
  author_id: number | null;
  tags: string;
  summary_html: string | null;
  template_suffix: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: number | null;
  commentable: string;
  admin_graphql_api_id: string;
  image?: ShopifyArticleImage;
}

/**
 * Shopify Article image
 */
export interface ShopifyArticleImage {
  id: number;
  alt: string | null;
  position: number;
  src: string;
  attachment: string | null;
  variant_ids: number[];
  created_at: string;
  height: number;
  width: number;
  admin_graphql_api_id: string;
}

/**
 * Input for creating/updating an article
 */
export interface ShopifyArticleInput {
  /** Article title */
  title: string;
  /** HTML content of the article */
  content_html?: string;
  /** Author name */
  author?: string;
  /** Comma-separated tags */
  tags?: string;
  /** HTML summary/excerpt */
  summary_html?: string | null;
  /** Template suffix */
  template_suffix?: string | null;
  /** Whether the article is published */
  published?: boolean;
  /** Published at date (for scheduled posts) */
  published_at?: string | null;
  /** Article image URL */
  image?: {
    src: string;
    alt?: string;
  };
}

/**
 * Shopify Product entity
 */
export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'draft';
  published_at: string | null;
  template_suffix: string | null;
  vendor: string;
  tags: string;
  variants: ShopifyProductVariant[];
  images: ShopifyProductImage[];
  options: ShopifyProductOption[];
  admin_graphql_api_id: string;
  metafields?: ShopifyMetafield[];
}

/**
 * Shopify Product Variant
 */
export interface ShopifyProductVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string | null;
  position: number;
  inventory_policy: string;
  fulfillment_service: string;
  inventory_management: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  weight: number;
  weight_unit: string;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
  admin_graphql_api_id: string;
  image_id: number | null;
}

/**
 * Shopify Product Image
 */
export interface ShopifyProductImage {
  id: number;
  product_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  alt: string | null;
  width: number;
  height: number;
  src: string;
  variant_ids: number[];
  admin_graphql_api_id: string;
}

/**
 * Shopify Product Option
 */
export interface ShopifyProductOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

/**
 * Input for creating/updating a product
 */
export interface ShopifyProductInput {
  /** Product title */
  title: string;
  /** HTML description */
  body_html?: string;
  /** Product type/category */
  product_type?: string;
  /** Vendor/brand */
  vendor?: string;
  /** Comma-separated tags */
  tags?: string;
  /** Product status */
  status?: 'active' | 'archived' | 'draft';
  /** Product variants */
  variants?: Array<{
    option1?: string;
    option2?: string;
    option3?: string;
    price?: string;
    sku?: string;
    inventory_quantity?: number;
  }>;
  /** Product images */
  images?: Array<{
    src: string;
    alt?: string;
    position?: number;
  }>;
  /** Product options */
  options?: Array<{
    name: string;
    values: string[];
  }>;
  /** SEO metadata */
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
}

/**
 * Shopify Custom Collection
 */
export interface ShopifyCollection {
  id: number;
  handle: string;
  title: string;
  updated_at: string;
  body_html: string | null;
  published_at: string | null;
  sort_order: string;
  template_suffix: string | null;
  published_scope: string;
  admin_graphql_api_id: string;
  image?: ShopifyCollectionImage;
}

/**
 * Shopify Collection Image
 */
export interface ShopifyCollectionImage {
  id: number;
  created_at: string;
  position: number;
  updated_at: string;
  alt: string | null;
  width: number;
  height: number;
  src: string;
  admin_graphql_api_id: string;
}

/**
 * Input for creating/updating a collection
 */
export interface ShopifyCollectionInput {
  /** Collection title */
  title: string;
  /** HTML description */
  body_html?: string;
  /** Collection handle (URL) */
  handle?: string;
  /** Whether the collection is published */
  published?: boolean;
  /** Collection image */
  image?: {
    src: string;
    alt?: string;
  };
}

/**
 * Shopify Collect (product-collection association)
 */
export interface ShopifyCollect {
  id: number;
  collection_id: number;
  product_id: number;
  created_at: string;
  position: number;
  updated_at: string;
}

/**
 * Shopify Metafield
 */
export interface ShopifyMetafield {
  id: number;
  namespace: string;
  key: string;
  value: string;
  value_type: 'string' | 'integer' | 'json_string';
  description: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner_resource: 'product' | 'variant' | 'article' | 'blog';
  admin_graphql_api_id: string;
}

/**
 * Shopify Shop information
 */
export interface ShopifyShop {
  id: number;
  name: string;
  email: string;
  domain: string;
  province: string;
  country: string;
  address1: string;
  zip: string;
  city: string;
  source: string | null;
  phone: string;
  latitude: number;
  longitude: number;
  primary_locale: string;
  address2: string | null;
  created_at: string;
  updated_at: string;
  country_code: string;
  country_name: string;
  currency: string;
  customer_email: string;
  timezone: string;
  iana_timezone: string;
  shop_owner: string;
  money_format: string;
  weight_unit: string;
  province_code: string;
  taxes_included: boolean | null;
  tax_shipping: boolean | null;
  county_taxes: boolean | null;
  enabled_presentment_currencies: string[];
  google_apps_domain: string | null;
  google_apps_login_enabled: boolean | null;
  money_with_currency_format: string;
  eligible_for_payments: boolean;
  requires_extra_payments_agreement: boolean;
  password_enabled: boolean;
  has_storefront: boolean;
  eligible_for_card_reader_giveaway: boolean;
  finances: boolean;
  setup_required: boolean;
  pre_launch_enabled: boolean;
  enabled_features: string[];
  myshopify_domain: string;
  plan_name: string;
  plan_display_name: string;
  domain_ssl_enabled: boolean;
  ssl_enabled: boolean;
  ab_order_rate: number;
  money_in_emails_format: string;
  money_with_currency_in_emails_format: string;
  checkout_api_supported: boolean;
  multi_location_enabled: boolean;
  transactional_sms_enabled: boolean;
  marketing_sms_consent_enabled_at_checkout: boolean;
}

/**
 * Shopify API pagination parameters
 */
export interface ShopifyPagination {
  page?: number;
  limit?: number;
  since_id?: number;
}

/**
 * Shopify API error response
 */
export interface ShopifyErrorResponse {
  error?: string;
  errors?: string | string[] | Record<string, string[]>;
}

/**
 * Result type for Shopify operations
 */
export type ShopifyResult<T> =
  | { success: true; data: T }
  | { success: false; error: ShopifyError };

/**
 * Shopify error type
 */
export interface ShopifyError {
  message: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Image upload input (for uploading images to products/articles)
 */
export interface ShopifyImageUpload {
  src: string;
  alt?: string | null;
  position?: number;
}

/**
 * Image upload result
 */
export interface ShopifyImageUploadResult {
  src: string;
  alt: string | null;
  width: number;
  height: number;
}

/**
 * Product image upload result
 */
export interface ShopifyProductImageUploadResult {
  id: number;
  product_id: number;
  position: number;
  src: string;
  alt: string | null;
}
