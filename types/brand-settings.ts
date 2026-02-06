/**
 * Brand Settings Types
 * Types for brand settings management
 */

import type { BrandTone } from './product';

// Re-export BrandTone for convenience
export type { BrandTone };

/**
 * Brand color configuration
 */
export interface BrandColors {
  primary: string;
  secondary?: string;
  accent?: string;
}

/**
 * Brand style guide configuration
 */
export interface BrandStyleGuide {
  typography?: string;
  imagery?: string;
  additional?: string;
}

/**
 * Brand logo configuration
 */
export interface BrandLogo {
  url: string;
  width?: number;
  height?: number;
}

/**
 * Complete brand settings configuration
 */
export interface BrandSettings {
  colors: BrandColors;
  tone: BrandTone;
  styleGuide?: BrandStyleGuide;
  logo?: BrandLogo;
}

/**
 * Form data for brand settings
 */
export interface BrandSettingsFormData {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  tone: BrandTone;
  typography?: string;
  imagery?: string;
  additional?: string;
  logoUrl?: string;
}

/**
 * Default brand settings
 */
export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#3b82f6',
  },
  tone: 'professional',
  styleGuide: {
    typography: '',
    imagery: '',
    additional: '',
  },
};

/**
 * Convert brand settings to form data
 */
export function brandSettingsToFormData(
  settings: BrandSettings
): BrandSettingsFormData {
  return {
    primaryColor: settings.colors.primary,
    secondaryColor: settings.colors.secondary,
    accentColor: settings.colors.accent,
    tone: settings.tone,
    typography: settings.styleGuide?.typography,
    imagery: settings.styleGuide?.imagery,
    additional: settings.styleGuide?.additional,
    logoUrl: settings.logo?.url,
  };
}

/**
 * Convert form data to brand settings
 */
export function formDataToBrandSettings(
  data: BrandSettingsFormData
): BrandSettings {
  return {
    colors: {
      primary: data.primaryColor,
      secondary: data.secondaryColor,
      accent: data.accentColor,
    },
    tone: data.tone,
    styleGuide: {
      typography: data.typography?.trim(),
      imagery: data.imagery?.trim(),
      additional: data.additional?.trim(),
    },
    logo: data.logoUrl
      ? {
          url: data.logoUrl,
        }
      : undefined,
  };
}
