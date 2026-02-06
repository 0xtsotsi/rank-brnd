// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Image Generation Service
 *
 * Service for generating images via DALL-E 3 with brand color integration
 * and persistent storage in Supabase.
 */

import { getSupabaseServerClient } from '../supabase/client';
import type { Database } from '@/types/database';
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageGenerationErrorType,
  BrandColorOptions,
  ImageMetadata,
} from '@/types/image-generation';
import {
  ImageGenerationError,
  STYLE_PROMPTS,
  IMAGE_GENERATION_STYLES,
  IMAGE_SIZES,
  IMAGE_QUALITIES,
  IMAGE_MODELS,
} from '@/types/image-generation';
import type { BrandSettings } from '@/types/brand-settings';

type GeneratedImage =
  Database['public']['Tables']['generated_images']['Insert'];

/**
 * Default configuration for image generation
 */
const DEFAULT_CONFIG = {
  model: IMAGE_MODELS.DALL_E_3,
  size: '1024x1024' as const,
  quality: 'standard' as const,
  maxPromptLength: 4000,
} as const;

/**
 * Validates an image generation request
 */
function validateRequest(request: ImageGenerationRequest): void {
  if (!request.prompt || request.prompt.trim().length === 0) {
    throw new ImageGenerationError('INVALID_PROMPT', 'Prompt is required');
  }

  if (request.prompt.length > DEFAULT_CONFIG.maxPromptLength) {
    throw new ImageGenerationError(
      'INVALID_PROMPT',
      `Prompt must be less than ${DEFAULT_CONFIG.maxPromptLength} characters`
    );
  }

  if (
    request.style &&
    !Object.values(IMAGE_GENERATION_STYLES).includes(request.style)
  ) {
    throw new ImageGenerationError(
      'INVALID_STYLE',
      `Invalid style. Must be one of: ${Object.values(IMAGE_GENERATION_STYLES).join(', ')}`
    );
  }

  if (request.size && !IMAGE_SIZES.includes(request.size)) {
    throw new ImageGenerationError(
      'INVALID_SIZE',
      `Invalid size. Must be one of: ${IMAGE_SIZES.join(', ')}`
    );
  }

  if (request.quality && !IMAGE_QUALITIES.includes(request.quality)) {
    throw new ImageGenerationError(
      'API_ERROR',
      `Invalid quality. Must be one of: ${IMAGE_QUALITIES.join(', ')}`
    );
  }
}

/**
 * Parses an OpenAI API error response
 */
function parseApiError(error: unknown): {
  type: ImageGenerationErrorType;
  message: string;
} {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes('api key') ||
      message.includes('authentication') ||
      message.includes('unauthorized')
    ) {
      return {
        type: 'API_KEY_MISSING',
        message:
          'Invalid or missing OpenAI API key. Please check your environment variables.',
      };
    }

    if (
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('429')
    ) {
      return {
        type: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
      };
    }

    if (
      message.includes('content policy') ||
      message.includes('safety') ||
      message.includes('violates')
    ) {
      return {
        type: 'CONTENT_POLICY_VIOLATION',
        message:
          'The prompt violates OpenAI content policy. Please modify your prompt.',
      };
    }

    return {
      type: 'API_ERROR',
      message: `API error: ${error.message}`,
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred during image generation.',
  };
}

/**
 * Applies brand colors to a prompt by injecting color guidance
 */
function applyBrandColorsToPrompt(
  prompt: string,
  brandColors: BrandColorOptions
): string {
  const { primary, secondary, intensity = 'moderate' } = brandColors;

  // Convert hex to color description
  const getColorDescription = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Simple color naming
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max - min < 30) {
      if (r + g + b > 600) return 'white';
      if (r + g + b > 300) return 'light gray';
      return 'dark gray';
    }

    if (r >= g && r >= b) {
      if (g > b * 1.5) return 'warm orange';
      if (b > g * 1.5) return 'magenta';
      return 'red';
    }
    if (g >= r && g >= b) {
      if (r > b) return 'yellow-green';
      if (b > r) return 'cyan-green';
      return 'green';
    }
    // b is max
    if (r > g) return 'purple';
    if (g > r) return 'cyan';
    return 'blue';
  };

  const primaryDesc = getColorDescription(primary);
  const secondaryDesc = secondary
    ? getColorDescription(secondary)
    : primaryDesc;

  const intensityModifiers = {
    subtle: 'with subtle accents of',
    moderate: 'incorporating elements of',
    strong: 'dominated by',
  };

  const modifier = intensityModifiers[intensity];

  let colorPrompt = '';

  if (secondary && primary !== secondary) {
    colorPrompt = `, ${modifier} ${primaryDesc} and ${secondaryDesc} color palette`;
  } else {
    colorPrompt = `, ${modifier} ${primaryDesc} color tones`;
  }

  // Check if prompt already has color descriptions to avoid duplication
  const lowerPrompt = prompt.toLowerCase();
  if (
    lowerPrompt.includes('color palette') ||
    lowerPrompt.includes('color scheme')
  ) {
    return prompt;
  }

  return prompt + colorPrompt;
}

/**
 * Fetches brand settings for an organization
 */
async function fetchBrandSettings(
  organizationId: string
): Promise<BrandSettings | null> {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await (supabase as any)
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    if (error || !data?.settings) {
      return null;
    }

    const settings = data.settings as { brandSettings?: BrandSettings };
    return settings.brandSettings || null;
  } catch {
    return null;
  }
}

/**
 * Downloads an image from a URL and returns it as a Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates an image using DALL-E 3
 *
 * @param request - The image generation request
 * @returns The generated image metadata
 * @throws {ImageGenerationError} If the request fails
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const startTime = Date.now();

  // Validate the request
  validateRequest(request);

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ImageGenerationError(
      'API_KEY_MISSING',
      'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.'
    );
  }

  let finalPrompt = request.prompt;
  let brandColorsApplied = false;
  let brandPrimaryColor: string | undefined;
  let brandSecondaryColor: string | undefined;

  // Apply brand colors if requested and organization ID is provided
  if (request.applyBrandColors && request.organizationId) {
    const brandSettings = await fetchBrandSettings(request.organizationId);
    if (brandSettings?.colors) {
      finalPrompt = applyBrandColorsToPrompt(request.prompt, {
        primary: brandSettings.colors.primary,
        secondary: brandSettings.colors.secondary,
        intensity: 'moderate',
      });
      brandColorsApplied = true;
      brandPrimaryColor = brandSettings.colors.primary;
      brandSecondaryColor = brandSettings.colors.secondary;
    }
  }

  // Apply style-specific prompt enhancement
  const style = request.style || 'realistic';
  const stylePrompt = STYLE_PROMPTS[style];

  // Check if style is already in prompt
  if (
    !finalPrompt
      .toLowerCase()
      .includes(stylePrompt.toLowerCase().substring(0, 20))
  ) {
    finalPrompt = finalPrompt + stylePrompt;
  }

  // Prepare the API request body
  const body = {
    model: request.model || DEFAULT_CONFIG.model,
    prompt: finalPrompt,
    n: 1,
    size: request.size || DEFAULT_CONFIG.size,
    quality: request.quality || DEFAULT_CONFIG.quality,
  };

  try {
    // Make the API request
    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || response.statusText);
      const parsed = parseApiError(error);
      throw new ImageGenerationError(parsed.type, parsed.message, errorData);
    }

    // Parse the response
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new ImageGenerationError(
        'API_ERROR',
        'No image data returned from API'
      );
    }

    const firstImage = data.data[0];

    if (!firstImage?.url) {
      throw new ImageGenerationError(
        'API_ERROR',
        'No image URL returned from API'
      );
    }

    const generationTime = Date.now() - startTime;

    // Store the image record in the database
    const imageId = crypto.randomUUID();
    let storagePath: string | undefined;
    let finalImageUrl = firstImage.url;

    // Download and store in Supabase Storage if we have user/org context
    if (request.organizationId && request.userId) {
      try {
        const { uploadImageServer } = await import('../supabase/storage');
        const imageBuffer = await downloadImage(firstImage.url);
        const filename = `${imageId}.png`;

        const uploadResult = await uploadImageServer(imageBuffer, filename, {
          bucket: 'generated-images',
          metadata: {
            organizationId: request.organizationId,
            userId: request.userId,
            prompt: request.prompt,
            style: style,
          },
        });

        storagePath = uploadResult.path;
        finalImageUrl = uploadResult.publicUrl;

        // Store metadata in database
        const supabase = getSupabaseServerClient();
        const imageData: GeneratedImage = {
          id: imageId,
          organization_id: request.organizationId,
          user_id: request.userId,
          prompt: request.prompt,
          style: style,
          size: request.size || DEFAULT_CONFIG.size,
          quality: request.quality || DEFAULT_CONFIG.quality,
          model: request.model || DEFAULT_CONFIG.model,
          image_url: finalImageUrl,
          storage_path: storagePath,
          revised_prompt: firstImage.revised_prompt || null,
          brand_colors_applied: brandColorsApplied,
          brand_primary_color: brandPrimaryColor || null,
          brand_secondary_color: brandSecondaryColor || null,
          metadata: {
            requestId: crypto.randomUUID(),
            generationTime,
            originalUrl: firstImage.url,
          } as ImageMetadata as any, // Cast to any for Supabase Json type
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await (supabase as any).from('generated_images').insert(imageData);
      } catch (storageError) {
        // Log storage error but don't fail the request - we still have the OpenAI URL
        console.error('Failed to store image:', storageError);
      }
    }

    // Return the generated image metadata
    return {
      id: imageId,
      imageUrl: finalImageUrl,
      storagePath,
      prompt: request.prompt,
      revisedPrompt: firstImage.revised_prompt,
      style,
      size: request.size || DEFAULT_CONFIG.size,
      quality: request.quality || DEFAULT_CONFIG.quality,
      model: request.model || DEFAULT_CONFIG.model,
      brandColorsApplied,
      brandPrimaryColor,
      brandSecondaryColor,
      createdAt: Date.now(),
    };
  } catch (error) {
    // Re-throw ImageGenerationErrors as-is
    if (error instanceof ImageGenerationError) {
      throw error;
    }

    // Parse other errors
    const parsed = parseApiError(error);
    throw new ImageGenerationError(parsed.type, parsed.message, error);
  }
}

/**
 * Lists generated images for an organization
 */
export async function listOrganizationImages(
  organizationId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Database['public']['Tables']['generated_images']['Row'][]> {
  const { limit = 50, offset = 0 } = options;

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ImageGenerationError(
      'DATABASE_ERROR',
      `Failed to list images: ${error.message}`,
      error
    );
  }

  return data || [];
}

/**
 * Gets a single generated image by ID
 */
export async function getImage(
  imageId: string,
  organizationId: string
): Promise<Database['public']['Tables']['generated_images']['Row'] | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('id', imageId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new ImageGenerationError(
      'DATABASE_ERROR',
      `Failed to get image: ${error.message}`,
      error
    );
  }

  return data;
}

/**
 * Deletes a generated image
 */
export async function deleteImage(
  imageId: string,
  organizationId: string
): Promise<void> {
  const supabase = getSupabaseServerClient();

  // First get the image to find the storage path
  const { data: imageData } = await (supabase as any)
    .from('generated_images')
    .select('storage_path')
    .eq('id', imageId)
    .eq('organization_id', organizationId)
    .single();

  // Delete from storage if it exists
  if ((imageData as any)?.storage_path) {
    try {
      const { deleteImage: deleteFromStorage } =
        await import('../supabase/storage');
      await deleteFromStorage(
        (imageData as any).storage_path,
        'generated-images'
      );
    } catch (error) {
      console.error('Failed to delete from storage:', error);
    }
  }

  // Delete from database
  const { error } = await (supabase as any)
    .from('generated_images')
    .delete()
    .eq('id', imageId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new ImageGenerationError(
      'DATABASE_ERROR',
      `Failed to delete image: ${error.message}`,
      error
    );
  }
}

/**
 * Validates the OpenAI API key
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
