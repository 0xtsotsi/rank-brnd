/**
 * Brand Settings API Route
 * Handles GET and POST operations for brand settings
 * Stores settings in the organization's settings JSON field
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateRequest, brandSettingsFormSchema } from '@/lib/schemas';
import type {
  BrandSettings,
  BrandSettingsFormData,
} from '@/types/brand-settings';
import {
  DEFAULT_BRAND_SETTINGS,
  formDataToBrandSettings,
  brandSettingsToFormData,
} from '@/types/brand-settings';

// export const runtime = 'edge';

// In-memory storage for demo purposes
// In production, this would be stored in the database
let mockBrandSettings: Record<string, BrandSettings> = {};

/**
 * GET /api/settings/brand
 * Fetch current brand settings for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get organization ID from query params or use user ID as fallback
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || userId;

    // Return existing settings or defaults
    const settings =
      mockBrandSettings[orgId] ||
      (mockBrandSettings[orgId] = { ...DEFAULT_BRAND_SETTINGS });

    return NextResponse.json({
      success: true,
      settings: brandSettingsToFormData(settings),
    });
  } catch (error) {
    console.error('Error fetching brand settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch brand settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/brand
 * Update brand settings for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = validateRequest(body, brandSettingsFormSchema);
    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    const data = validationResult.data as BrandSettingsFormData;

    // Get organization ID from body or use user ID as fallback
    const orgId = body.orgId || userId;

    // Convert form data to brand settings
    const settings = formDataToBrandSettings(data);

    // Store settings (in-memory for demo, would be database in production)
    mockBrandSettings[orgId] = settings;

    return NextResponse.json({
      success: true,
      settings: brandSettingsToFormData(settings),
    });
  } catch (error) {
    console.error('Error updating brand settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update brand settings',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/brand
 * Reset brand settings to defaults
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || userId;

    // Reset to defaults
    mockBrandSettings[orgId] = { ...DEFAULT_BRAND_SETTINGS };

    return NextResponse.json({
      success: true,
      settings: brandSettingsToFormData(DEFAULT_BRAND_SETTINGS),
    });
  } catch (error) {
    console.error('Error resetting brand settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset brand settings',
      },
      { status: 500 }
    );
  }
}
