'use client';

/**
 * Image Generation Dialog Component
 *
 * A dialog for generating AI images using DALL-E 3 with:
 * - 5 style options (realistic, watercolor, illustration, sketch, brand_text_overlay)
 * - Brand color preview
 * - Generated images gallery
 * - Selection and insertion functionality
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Check,
  X,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import type {
  ImageGenerationResponse,
  ImageGenerationStyle,
  IMAGE_GENERATION_STYLES,
} from '@/types/image-generation';
import type { BrandSettings } from '@/types/brand-settings';

interface ImageGenerationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
  /** Called when an image is selected */
  onSelectImage: (
    imageUrl: string,
    imageData?: ImageGenerationResponse
  ) => void;
  /** Organization ID for brand settings */
  organizationId: string;
  /** User ID for ownership tracking */
  userId: string;
  /** Brand settings for color preview */
  brandSettings?: BrandSettings | null;
}

const STYLE_OPTIONS: Array<{
  value: ImageGenerationStyle;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}> = [
  {
    value: 'realistic',
    label: 'Photorealistic',
    description: 'High-quality, realistic photography',
    icon: ImageIcon,
    gradient: 'from-gray-700 to-gray-900',
  },
  {
    value: 'watercolor',
    label: 'Watercolor',
    description: 'Soft, artistic watercolor painting',
    icon: Sparkles,
    gradient: 'from-blue-300 to-purple-300',
  },
  {
    value: 'illustration',
    label: 'Illustration',
    description: 'Clean, modern vector illustration',
    icon: ImageIcon,
    gradient: 'from-indigo-400 to-purple-500',
  },
  {
    value: 'sketch',
    label: 'Sketch',
    description: 'Hand-drawn, concept art style',
    icon: RefreshCw,
    gradient: 'from-amber-200 to-amber-400',
  },
  {
    value: 'brand_text_overlay',
    label: 'Brand Design',
    description: 'Professional marketing material',
    icon: Palette,
    gradient: 'from-pink-400 to-red-500',
  },
];

interface GeneratedImage {
  url: string;
  data?: ImageGenerationResponse;
  loading?: boolean;
  error?: string;
}

const GENERATION_COUNT = 4; // Number of images to generate at once

export function ImageGenerationDialog({
  isOpen,
  onClose,
  onSelectImage,
  organizationId,
  userId,
  brandSettings,
}: ImageGenerationDialogProps) {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] =
    useState<ImageGenerationStyle>('realistic');
  const [applyBrandColors, setApplyBrandColors] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setGeneratedImages([]);
      setSelectedImage(null);
      setError(null);
    }
  }, [isOpen]);

  // Generate images
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    // Initialize empty image slots
    const newImages: GeneratedImage[] = Array.from(
      { length: GENERATION_COUNT },
      () => ({
        url: '',
        loading: true,
      })
    );
    setGeneratedImages(newImages);

    try {
      // Generate multiple images in parallel
      const promises = Array.from(
        { length: GENERATION_COUNT },
        async (_, index) => {
          try {
            const response = await fetch('/api/images/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: prompt.trim(),
                style: selectedStyle,
                size: '1024x1024',
                quality: 'standard',
                applyBrandColors: applyBrandColors && !!brandSettings?.colors,
                organizationId,
                userId,
              }),
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Failed to generate image');
            }

            const result = await response.json();
            return {
              url: result.data.imageUrl,
              data: result.data,
              loading: false,
            };
          } catch (err) {
            return {
              url: '',
              loading: false,
              error: err instanceof Error ? err.message : 'Generation failed',
            };
          }
        }
      );

      const results = await Promise.all(promises);
      setGeneratedImages(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate images'
      );
      setGeneratedImages([]);
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    selectedStyle,
    applyBrandColors,
    brandSettings,
    organizationId,
    userId,
    isGenerating,
  ]);

  // Select an image
  const handleSelectImage = useCallback(
    (imageUrl: string, imageData?: ImageGenerationResponse) => {
      setSelectedImage(imageUrl);
      onSelectImage(imageUrl, imageData);
      onClose();
    },
    [onSelectImage, onClose]
  );

  // Get brand colors for preview
  const brandPrimaryColor = brandSettings?.colors?.primary || '#2563eb';
  const brandSecondaryColor =
    brandSettings?.colors?.secondary ||
    brandSettings?.colors?.accent ||
    '#1e40af';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Image with AI"
      size="xl"
      contentClassName="p-0"
    >
      <div className="flex flex-col h-[80vh]">
        {/* Prompt Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Describe your image
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A serene mountain landscape at sunset with a lake reflecting the golden sky..."
            rows={3}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Brand Color Toggle */}
          {brandSettings?.colors && (
            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                    style={{ backgroundColor: brandPrimaryColor }}
                  />
                  {brandSecondaryColor &&
                    brandSecondaryColor !== brandPrimaryColor && (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm -ml-2"
                        style={{ backgroundColor: brandSecondaryColor }}
                      />
                    )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Apply brand colors
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Incorporate your brand palette into the image
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApplyBrandColors(!applyBrandColors)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  applyBrandColors
                    ? 'bg-indigo-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    applyBrandColors ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {/* Style Selection */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Choose a style
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {STYLE_OPTIONS.map((style) => {
              const Icon = style.icon;
              const isActive = selectedStyle === style.value;

              return (
                <button
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value)}
                  disabled={isGenerating}
                  className={cn(
                    'relative p-3 rounded-lg border-2 transition-all text-left',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  {isActive && (
                    <div className="absolute -top-2 -right-2 p-0.5 bg-indigo-500 rounded-full">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg bg-gradient-to-br mb-2 flex items-center justify-center',
                      style.gradient
                    )}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {style.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generated Images Gallery */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {isGenerating ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: GENERATION_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                >
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ))}
            </div>
          ) : generatedImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {generatedImages.map((image, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative group aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    selectedImage === image.url
                      ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  {image.error ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4 text-center">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {image.error}
                      </p>
                    </div>
                  ) : image.url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            handleSelectImage(image.url, image.data)
                          }
                          className="p-3 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Use this image"
                        >
                          <Check className="w-5 h-5 text-green-600" />
                        </button>
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Download"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        </a>
                      </div>
                      {/* Selected indicator */}
                      {selectedImage === image.url && (
                        <div className="absolute top-2 right-2 p-1.5 bg-indigo-500 rounded-full">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <X className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Wand2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Ready to create
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  Enter a description above and choose a style to generate
                  unique AI images
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              isGenerating || !prompt.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Images
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Image Generation Button Component
 * Trigger button for opening the image generation dialog
 */
export function ImageGenerationButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
        'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
        'hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <Wand2 className="w-4 h-4" />
      Generate with AI
    </button>
  );
}
