'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useEffect, useRef } from 'react';

/**
 * OptimizedImage Component
 *
 * A wrapper around Next.js Image component with Core Web Vitals optimizations:
 * - Lazy loading with Intersection Observer (improves FID by reducing initial JS)
 * - Blur placeholder support (reduces CLS during image load)
 * - Priority loading for LCP images
 * - Automatic aspect ratio preservation (prevents CLS)
 * - Error handling with fallback
 *
 * @example
 * // For hero/LCP images - use priority
 * <OptimizedImage src="/hero.jpg" alt="Hero" priority width={1200} height={600} />
 *
 * // For below-fold images - use lazy loading
 * <OptimizedImage src="/product.jpg" alt="Product" width={400} height={300} />
 */

interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  /** Fallback image to show on error */
  fallbackSrc?: string;
  /** Custom aspect ratio (width/height) for skeleton placeholder */
  aspectRatio?: number;
  /** Show skeleton loader while image loads */
  showSkeleton?: boolean;
  /** Whether this is a critical LCP image */
  isLCP?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fallbackSrc = '/images/placeholder.svg',
  aspectRatio,
  showSkeleton = true,
  isLCP = false,
  priority,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(isLCP || priority);
  const imageRef = useRef<HTMLDivElement>(null);

  // Calculate aspect ratio from dimensions
  const calculatedAspectRatio =
    aspectRatio ||
    (typeof width === 'number' && typeof height === 'number'
      ? width / height
      : 16 / 9);

  // Intersection Observer for lazy loading
  useEffect(() => {
    // Skip if already in view (LCP or priority images)
    if (isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [isInView]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const imageSrc = hasError ? fallbackSrc : src;

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        // Prevent CLS by reserving space with aspect ratio
        aspectRatio: calculatedAspectRatio,
      }}
    >
      {/* Skeleton placeholder for CLS prevention */}
      {showSkeleton && isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Only render image when in view (lazy loading) */}
      {isInView && (
        <Image
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          priority={isLCP || priority}
          loading={isLCP || priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            transition-opacity duration-300
            ${isLoading ? 'opacity-0' : 'opacity-100'}
            object-cover
          `}
          // Use blur placeholder for supported image types
          placeholder={
            typeof src === 'string' &&
            (src.endsWith('.jpg') || src.endsWith('.png'))
              ? 'blur'
              : 'empty'
          }
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+"
          sizes={
            props.sizes ||
            `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`
          }
          {...props}
        />
      )}
    </div>
  );
}

/**
 * LCPImage - Optimized for Largest Contentful Paint
 * Use this for hero images, main content images that appear above the fold
 */
export function LCPImage(
  props: Omit<OptimizedImageProps, 'isLCP' | 'priority'>
) {
  return <OptimizedImage {...props} isLCP priority fetchPriority="high" />;
}

/**
 * Avatar component optimized for small images
 * Uses eager loading but smaller sizes
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className = '',
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      showSkeleton={false}
      sizes={`${size}px`}
      {...props}
    />
  );
}

export default OptimizedImage;
