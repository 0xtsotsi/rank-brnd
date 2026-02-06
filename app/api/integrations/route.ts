/**
 * Integrations API Route
 * Handles CRUD operations for CMS integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type {
  Integration,
  IntegrationFormData,
  Platform,
  Status,
} from '@/types/integration';
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  DEFAULT_SYNC_INTERVAL,
  formDataToIntegration,
  integrationToFormData,
} from '@/types/integration';

// Mock integration data - replace with actual database queries
let mockIntegrations: Integration[] = [
  {
    id: '1',
    organization_id: 'org-1',
    product_id: null,
    platform: 'wordpress',
    name: 'My WordPress Blog',
    description: 'Primary blog for content publishing',
    auth_token: 'wp_token_123',
    refresh_token: null,
    auth_type: 'api_key',
    config: {
      siteUrl: 'https://myblog.com',
      apiVersion: 'v2',
      syncSettings: {
        enabled: true,
        syncContent: true,
        syncMedia: true,
      },
    },
    status: 'active',
    last_synced_at: new Date('2024-02-01T10:30:00Z'),
    last_error: null,
    last_error_at: null,
    sync_interval_seconds: 3600,
    metadata: {
      totalSyncs: 45,
      lastVerifiedAt: new Date('2024-02-01T10:30:00Z').toISOString(),
    },
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-02-01'),
    deleted_at: null,
  },
  {
    id: '2',
    organization_id: 'org-1',
    product_id: null,
    platform: 'webflow',
    name: 'Company Site',
    description: 'Corporate website on Webflow',
    auth_token: 'wf_token_456',
    refresh_token: null,
    auth_type: 'bearer_token',
    config: {
      siteId: 'site-abc123',
      collectionId: 'coll-def456',
      syncSettings: {
        enabled: true,
        syncContent: true,
      },
    },
    status: 'active',
    last_synced_at: new Date('2024-02-02T14:20:00Z'),
    last_error: null,
    last_error_at: null,
    sync_interval_seconds: 7200,
    metadata: {
      totalSyncs: 22,
      lastVerifiedAt: new Date('2024-02-02T14:20:00Z').toISOString(),
    },
    created_at: new Date('2024-01-10'),
    updated_at: new Date('2024-02-02'),
    deleted_at: null,
  },
  {
    id: '3',
    organization_id: 'org-1',
    product_id: null,
    platform: 'ghost',
    name: 'Ghost Publication',
    description: 'Newsletter publication',
    auth_token: 'ghost_token_789',
    refresh_token: null,
    auth_type: 'api_key',
    config: {
      adminUrl: 'https://ghost.example.com',
      apiVersion: 'v3',
      syncSettings: {
        enabled: false,
      },
    },
    status: 'inactive',
    last_synced_at: new Date('2024-01-28T09:15:00Z'),
    last_error: null,
    last_error_at: null,
    sync_interval_seconds: 3600,
    metadata: {
      totalSyncs: 12,
    },
    created_at: new Date('2024-01-05'),
    updated_at: new Date('2024-01-28'),
    deleted_at: null,
  },
];

/**
 * GET /api/integrations
 * Fetch all integrations with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const platform = searchParams.get('platform') || 'all';
    const status = searchParams.get('status') || 'all';

    // Filter integrations
    let filtered = [...mockIntegrations];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(searchLower) ||
          i.description?.toLowerCase().includes(searchLower) ||
          PLATFORM_LABELS[i.platform as keyof typeof PLATFORM_LABELS]
            .toLowerCase()
            .includes(searchLower)
      );
    }

    if (platform !== 'all') {
      filtered = filtered.filter((i) => i.platform === platform);
    }

    if (status !== 'all') {
      filtered = filtered.filter((i) => i.status === status);
    }

    return NextResponse.json({
      integrations: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Create a new integration
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.name ||
      typeof body.name !== 'string' ||
      body.name.trim() === ''
    ) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!body.platform || typeof body.platform !== 'string') {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms: Platform[] = [
      'wordpress',
      'webflow',
      'shopify',
      'ghost',
      'notion',
      'squarespace',
      'wix',
      'contentful',
      'strapi',
      'custom',
    ];
    if (!validPlatforms.includes(body.platform as Platform)) {
      return NextResponse.json(
        {
          error:
            'Invalid platform. Must be one of: ' + validPlatforms.join(', '),
        },
        { status: 400 }
      );
    }

    // Validate auth type if provided
    if (body.auth_type) {
      const validAuthTypes = ['api_key', 'oauth', 'bearer_token', 'basic_auth'];
      if (!validAuthTypes.includes(body.auth_type)) {
        return NextResponse.json(
          {
            error:
              'Invalid auth type. Must be one of: ' + validAuthTypes.join(', '),
          },
          { status: 400 }
        );
      }
    }

    // Validate sync interval if provided
    if (body.sync_interval_seconds !== undefined) {
      const seconds = body.sync_interval_seconds;
      if (typeof seconds !== 'number' || seconds < 60 || seconds > 2592000) {
        return NextResponse.json(
          { error: 'Sync interval must be between 60 seconds and 30 days' },
          { status: 400 }
        );
      }
    }

    const formData: IntegrationFormData = {
      name: body.name.trim(),
      description: body.description?.trim(),
      platform: body.platform as Platform,
      product_id: body.product_id,
      auth_token: body.auth_token,
      refresh_token: body.refresh_token,
      auth_type: body.auth_type,
      config: body.config,
      sync_interval_seconds: body.sync_interval_seconds,
    };

    const newIntegration = formDataToIntegration(
      formData,
      'org-1',
      `${Date.now()}`
    );
    newIntegration.id = `${Date.now()}`;
    newIntegration.created_at = new Date();

    mockIntegrations.push(newIntegration as any);

    return NextResponse.json(newIntegration, { status: 201 });
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations
 * Update an existing integration
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    const index = mockIntegrations.findIndex((i) => i.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Validate platform if provided
    if (updateData.platform) {
      const validPlatforms: Platform[] = [
        'wordpress',
        'webflow',
        'shopify',
        'ghost',
        'notion',
        'squarespace',
        'wix',
        'contentful',
        'strapi',
        'custom',
      ];
      if (!validPlatforms.includes(updateData.platform as Platform)) {
        return NextResponse.json(
          { error: 'Invalid platform' },
          { status: 400 }
        );
      }
    }

    // Update integration
    const updatedIntegration: Integration = {
      ...mockIntegrations[index],
      ...updateData,
      updated_at: new Date(),
    };

    // Handle nested updates
    if (updateData.config) {
      updatedIntegration.config = {
        ...mockIntegrations[index].config,
        ...updateData.config,
      };
    }

    mockIntegrations[index] = updatedIntegration;

    return NextResponse.json(updatedIntegration);
  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations
 * Delete (soft delete) an integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    const index = mockIntegrations.findIndex((i) => i.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Soft delete
    mockIntegrations[index].deleted_at = new Date();
    mockIntegrations[index].updated_at = new Date();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
