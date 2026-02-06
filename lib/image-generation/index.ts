/**
 * Image Generation Module
 *
 * Exports all image generation functionality
 */

export {
  generateImage,
  listOrganizationImages,
  getImage,
  deleteImage,
  validateApiKey,
} from './service';

export type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  BrandColorOptions,
  ImageMetadata,
  ImageGenerationStyle,
  ImageSize,
  ImageQuality,
  ImageModel,
} from '@/types/image-generation';

export {
  ImageGenerationError,
  IMAGE_GENERATION_STYLES,
  IMAGE_SIZES,
  IMAGE_QUALITIES,
  IMAGE_MODELS,
  STYLE_PROMPTS,
} from '@/types/image-generation';
