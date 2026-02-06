/**
 * Image Generation Types
 *
 * Types for the image generation service that integrates DALL-E 3
 * with brand colors and persistent storage.
 */

import type { BrandColors } from './brand-settings';

/**
 * Image generation style options
 */
export const IMAGE_GENERATION_STYLES = {
  REALISTIC: 'realistic',
  WATERCOLOR: 'watercolor',
  ILLUSTRATION: 'illustration',
  SKETCH: 'sketch',
  BRAND_TEXT_OVERLAY: 'brand_text_overlay',
} as const;

export type ImageGenerationStyle =
  (typeof IMAGE_GENERATION_STYLES)[keyof typeof IMAGE_GENERATION_STYLES];

/**
 * Image size options for DALL-E 3
 */
export const IMAGE_SIZES = ['1024x1024', '1792x1024', '1024x1792'] as const;

export type ImageSize = (typeof IMAGE_SIZES)[number];

/**
 * Quality options for DALL-E 3
 */
export const IMAGE_QUALITIES = ['standard', 'hd'] as const;

export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

/**
 * Model options
 */
export const IMAGE_MODELS = {
  DALL_E_3: 'dall-e-3',
} as const;

export type ImageModel = (typeof IMAGE_MODELS)[keyof typeof IMAGE_MODELS];

/**
 * Style prompts that get appended to base prompts
 */
export const STYLE_PROMPTS: Record<ImageGenerationStyle, string> = {
  realistic:
    ', photorealistic, highly detailed, professional photography, 8k resolution',
  watercolor:
    ', watercolor painting, soft blended colors, artistic, traditional media',
  illustration:
    ', digital illustration, bold colors, clean lines, vector art style',
  sketch: ', hand-drawn sketch, pencil strokes, rough lines, concept art',
  brand_text_overlay:
    ', professional design, marketing material, minimal text overlay, modern brand style',
};

/**
 * Request options for image generation
 */
export interface ImageGenerationRequest {
  /** The prompt describing the image to generate */
  prompt: string;
  /** The style to apply to the generated image */
  style?: ImageGenerationStyle;
  /** The size of the generated image (default: 1024x1024) */
  size?: ImageSize;
  /** The quality of the generated image (default: standard) */
  quality?: ImageQuality;
  /** The model to use (default: dall-e-3) */
  model?: ImageModel;
  /** Whether to apply brand colors from the organization settings */
  applyBrandColors?: boolean;
  /** Organization ID for fetching brand settings */
  organizationId?: string;
  /** User ID for ownership tracking */
  userId?: string;
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
  /** Unique ID for the generated image */
  id: string;
  /** URL to access the generated image */
  imageUrl: string;
  /** Storage path for persistent storage */
  storagePath?: string;
  /** The prompt that was used */
  prompt: string;
  /** The prompt that DALL-E revised (if applicable) */
  revisedPrompt?: string;
  /** The style that was applied */
  style: ImageGenerationStyle;
  /** The size of the image */
  size: ImageSize;
  /** The quality setting */
  quality: ImageQuality;
  /** The model used */
  model: ImageModel;
  /** Whether brand colors were applied */
  brandColorsApplied: boolean;
  /** The primary brand color used (if applicable) */
  brandPrimaryColor?: string;
  /** The secondary brand color used (if applicable) */
  brandSecondaryColor?: string;
  /** Timestamp of generation */
  createdAt: number;
}

/**
 * Stored image record from the database
 */
export interface StoredImage {
  id: string;
  organization_id: string;
  user_id: string;
  prompt: string;
  style: string | null;
  size: string;
  quality: string;
  model: string;
  image_url: string;
  storage_path: string | null;
  revised_prompt: string | null;
  brand_colors_applied: boolean;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Error types for image generation
 */
export type ImageGenerationErrorType =
  | 'INVALID_PROMPT'
  | 'INVALID_STYLE'
  | 'INVALID_SIZE'
  | 'API_KEY_MISSING'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTENT_POLICY_VIOLATION'
  | 'STORAGE_ERROR'
  | 'DATABASE_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for image generation operations
 */
export class ImageGenerationError extends Error {
  constructor(
    public readonly type: ImageGenerationErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

/**
 * Brand color application options
 */
export interface BrandColorOptions {
  /** Primary brand color (hex) */
  primary: string;
  /** Secondary brand color (hex) */
  secondary?: string;
  /** How strongly to apply the brand colors */
  intensity?: 'subtle' | 'moderate' | 'strong';
}

/**
 * Image metadata stored with the record
 */
export interface ImageMetadata {
  /** OpenAI API request ID */
  requestId?: string;
  /** Generation time in milliseconds */
  generationTime?: number;
  /** Tokens used (if available) */
  tokensUsed?: number;
  /** Additional metadata */
  [key: string]: unknown;
}
