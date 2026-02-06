/**
 * Webflow CMS Types
 *
 * Type definitions for Webflow CMS API entities and operations.
 * Based on Webflow CMS API v2 specification.
 * @see https://developers.webflow.com/docs
 */

/**
 * Webflow API configuration required for authentication
 */
export interface WebflowConfig {
  /** Webflow site ID */
  siteId: string;
  /** Webflow API access token */
  accessToken: string;
  /** API version (default: v2) */
  version?: string;
}

/**
 * Webflow Collection entity
 */
export interface WebflowCollection {
  _id: string;
  lastUpdated: string;
  createdOn: string;
  name: string;
  slug: string;
  singularName: string;
  fields: WebflowField[];
  template?: string | null;
}

/**
 * Webflow Field types in a collection
 */
export type WebflowFieldType =
  | 'Bool'
  | 'Color'
  | 'Date'
  | 'Email'
  | 'File'
  | 'HTML'
  | 'Image'
  | 'ImageRef'
  | 'Link'
  | 'Number'
  | 'Option'
  | 'PlainTextField'
  | 'RichText'
  | 'Set'
  | 'Video'
  | 'ItemRef';

/**
 * Webflow Field definition
 */
export interface WebflowField {
  id: string;
  type: WebflowFieldType;
  slug: string;
  name: string;
  required: boolean;
  editable?: boolean;
  validations?: WebflowFieldValidation[];
  isSystemField: boolean;
  defaultVal?: unknown;
}

/**
 * Webflow Field validation rules
 */
export interface WebflowFieldValidation {
  type?: string;
  maxLength?: number;
  minLength?: number;
  singleLine?: boolean;
  options?: WebflowFieldOption[];
  collectionId?: string;
}

/**
 * Webflow Field option (for Set/Option fields)
 */
export interface WebflowFieldOption {
  id: string;
  name: string;
  slug?: string;
}

/**
 * Webflow Collection Item (CMS Item)
 */
export interface WebflowCollectionItem {
  _id: string;
  _cid: string;
  lastUpdated: string;
  createdOn: string;
  publishedOn?: string | null;
  isDraft: boolean;
  archive: boolean;
  fieldData: Record<string, unknown>;
  _static?: boolean | null;
}

/**
 * Input for creating/updating a collection item
 */
export interface WebflowCollectionItemInput {
  /** Field data (key-value pairs matching collection fields) */
  fieldData: Record<string, unknown>;
  /** Is this item a draft? */
  isDraft?: boolean;
  /** Archive this item? */
  archive?: boolean;
}

/**
 * Webflow CMS Item state
 */
export type WebflowItemState = 'published' | 'draft' | 'archived';

/**
 * Webflow API pagination parameters
 */
export interface WebflowPagination {
  limit?: number;
  offset?: number;
}

/**
 * Webflow API paginated response metadata
 */
export interface WebflowMeta {
  count: number;
  limit: number;
  offset: number;
  total: number;
}

/**
 * Webflow API response for collections
 */
export interface WebflowCollectionsResponse {
  collections: WebflowCollection[];
}

/**
 * Webflow API response for a single collection
 */
export interface WebflowCollectionResponse {
  collection: WebflowCollection;
}

/**
 * Webflow API response for collection items
 */
export interface WebflowCollectionItemsResponse {
  items: WebflowCollectionItem[];
  meta: WebflowMeta;
}

/**
 * Webflow API response for a single collection item
 */
export interface WebflowCollectionItemResponse {
  item: WebflowCollectionItem;
}

/**
 * Webflow API response for publishing items
 */
export interface WebflowPublishResponse {
  published: number;
  updated: number;
  queued: number;
}

/**
 * Webflow API error response
 */
export interface WebflowErrorResponse {
  code: number;
  name: string;
  err: string;
  message: string;
  problems?: Array<{
    property: string;
    description: string;
  }>;
}

/**
 * Result type for Webflow operations
 */
export type WebflowResult<T> =
  | { success: true; data: T }
  | { success: false; error: WebflowError };

/**
 * Webflow error type
 */
export interface WebflowError {
  message: string;
  code?: number;
  name?: string;
  details?: unknown;
}

/**
 * Webflow Image upload response
 */
export interface WebflowImageUpload {
  name: string;
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  hashes: {
    sha256: string;
    md5: string;
    __v?: string;
  };
  uploadedAt: string;
  fileUrl: string;
  thumbnailUrl: string;
  variants: Array<{
    name: string;
    publicUrl: string;
    width: number;
    height: number;
    size: number;
    mimeType: string;
  }>;
  _id: string;
  lastModified: string;
  createdOn: string;
}

/**
 * Webflow Asset (image/file) upload request
 */
export interface WebflowAssetUpload {
  name: string;
  hash: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

/**
 * Validate result for Webflow config
 */
export interface WebflowConfigValidation {
  isValid: boolean;
  errors?: string[];
}

/**
 * Webflow Site information
 */
export interface WebflowSite {
  _id: string;
  createdOn: string;
  name: string;
  shortName: string;
  previewUrl: string;
  defaultDomain: string;
  timezone?: string;
  locale?: string;
  database?: string;
  lastPublished: string | null;
}

/**
 * Webflow Sites response
 */
export interface WebflowSitesResponse {
  sites: WebflowSite[];
}
