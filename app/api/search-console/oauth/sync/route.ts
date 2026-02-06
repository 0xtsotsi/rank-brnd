/**
 * Google Search Console Sync API Route
 *
 * Syncs search analytics data from Google Search Console to the database.
 *
 * @endpoint POST /api/search-console/oauth/sync - Sync GSC data for a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleSearchConsoleClient } from '@/lib/google-search-console';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { decryptFromIntegration } from '@/lib/oauth/token-storage';
import { bulkUpsertSearchConsoleData } from '@/lib/supabase/google-search-console';
import type { OAuthTokens } from '@/lib/oauth';
import { z } from 'zod';

/**
 * Request schema for sync operation
 */
const syncRequestSchema = z.object({
  siteUrl: z.string().min(1),
  productId: z.string().uuid(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  daysBack: z.number().int().min(1).max(365).default(30),
  syncByQuery: z.boolean().default(true),
  syncByPage: z.boolean().default(false),
  syncByCountry: z.boolean().default(false),
  syncByDevice: z.boolean().default(false),
  queryRowLimit: z.number().int().min(1).max(10000).default(1000),
  minImpressions: z.number().int().min(0).default(10),
});

/**
 * POST /api/search-console/oauth/sync
 * Sync search analytics data from Google Search Console
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to sync Google Search Console data',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = syncRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      siteUrl,
      productId,
      startDate: customStartDate,
      endDate: customEndDate,
      daysBack,
      syncByQuery,
      syncByPage,
      syncByCountry,
      syncByDevice,
      queryRowLimit,
      minImpressions,
    } = validationResult.data;

    const client = getSupabaseServerClient();

    // Get user's organization
    const { data: orgMember } = await client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!orgMember) {
      return NextResponse.json(
        {
          error: 'No organization found',
          message: 'User is not a member of any organization',
        },
        { status: 404 }
      );
    }

    // Verify product belongs to the organization
    const { data: product } = await client
      .from('products')
      .select('organization_id')
      .eq('id', productId)
      .single();

    if (
      !product ||
      (product as any).organization_id !== (orgMember as any).organization_id
    ) {
      return NextResponse.json(
        {
          error: 'Product not found',
          message:
            'The specified product does not exist or you do not have access to it',
        },
        { status: 404 }
      );
    }

    // Get the Google Search Console integration
    const { data: integration } = await client
      .from('integrations')
      .select('*')
      .eq('organization_id', (orgMember as any).organization_id)
      .eq('platform', 'google-search-console')
      .eq('status', 'active')
      .single();

    if (!integration) {
      return NextResponse.json(
        {
          error: 'Integration not found',
          message: 'Google Search Console is not connected',
        },
        { status: 404 }
      );
    }

    // Decrypt access token
    const accessToken = await decryptFromIntegration(
      (integration as any).auth_token
    );
    const tokens: OAuthTokens = {
      accessToken,
      refreshToken: (integration as any).refresh_token
        ? await decryptFromIntegration((integration as any).refresh_token)
        : null,
      obtainedAt:
        ((integration as any).metadata as any)?.obtained_at ||
        new Date().toISOString(),
    };

    // Calculate date range
    let startDate = customStartDate;
    let endDate = customEndDate;

    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - daysBack + 1);

      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }

    // Create GSC client and sync data
    const gscClient = await GoogleSearchConsoleClient.fromTokens(tokens);

    const syncResults: {
      queries?: number;
      pages?: number;
      countries?: number;
      devices?: number;
      totalRecords: number;
      errors: string[];
    } = {
      totalRecords: 0,
      errors: [],
    };

    // Sync by query (keyword)
    if (syncByQuery) {
      try {
        const queryData = await gscClient.getAnalyticsByQuery(
          siteUrl,
          startDate,
          endDate,
          { rowLimit: queryRowLimit, minImpressions }
        );

        const formattedData = queryData.map((item) => ({
          keyword: item.query,
          impressions: item.impressions,
          clicks: item.clicks,
          ctr: item.ctr / 100, // GSC returns CTR as percentage, store as decimal
          avg_position: item.position,
          date: endDate,
          metadata: {
            dimension: 'query',
            site_url: siteUrl,
            synced_at: new Date().toISOString(),
          },
        }));

        const upsertResult = await bulkUpsertSearchConsoleData(
          client,
          (orgMember as any).organization_id,
          productId,
          formattedData
        );

        if (upsertResult.success) {
          syncResults.queries = formattedData.length;
          syncResults.totalRecords += formattedData.length;
        }
      } catch (error) {
        syncResults.errors.push(
          `Query sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Sync by page
    if (syncByPage) {
      try {
        const pageData = await gscClient.getAnalyticsByPage(
          siteUrl,
          startDate,
          endDate,
          500
        );

        const formattedData = pageData.map((item) => ({
          keyword: `page:${item.page}`, // Prefix with page: to distinguish from queries
          impressions: item.impressions,
          clicks: item.clicks,
          ctr: item.ctr / 100,
          avg_position: item.position,
          date: endDate,
          metadata: {
            dimension: 'page',
            page_url: item.page,
            site_url: siteUrl,
            synced_at: new Date().toISOString(),
          },
        }));

        const upsertResult = await bulkUpsertSearchConsoleData(
          client,
          (orgMember as any).organization_id,
          productId,
          formattedData
        );

        if (upsertResult.success) {
          syncResults.pages = formattedData.length;
          syncResults.totalRecords += formattedData.length;
        }
      } catch (error) {
        syncResults.errors.push(
          `Page sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Sync by country
    if (syncByCountry) {
      try {
        const countryData = await gscClient.getAnalyticsByCountry(
          siteUrl,
          startDate,
          endDate,
          500
        );

        const formattedData = countryData.map((item) => ({
          keyword: `country:${item.country}`,
          impressions: item.impressions,
          clicks: item.clicks,
          ctr: item.ctr / 100,
          avg_position: item.position,
          date: endDate,
          metadata: {
            dimension: 'country',
            country: item.country,
            site_url: siteUrl,
            synced_at: new Date().toISOString(),
          },
        }));

        const upsertResult = await bulkUpsertSearchConsoleData(
          client,
          (orgMember as any).organization_id,
          productId,
          formattedData
        );

        if (upsertResult.success) {
          syncResults.countries = formattedData.length;
          syncResults.totalRecords += formattedData.length;
        }
      } catch (error) {
        syncResults.errors.push(
          `Country sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Sync by device
    if (syncByDevice) {
      try {
        const deviceData = await gscClient.getAnalyticsByDevice(
          siteUrl,
          startDate,
          endDate
        );

        const formattedData = deviceData.map((item) => ({
          keyword: `device:${item.device}`,
          impressions: item.impressions,
          clicks: item.clicks,
          ctr: item.ctr / 100,
          avg_position: item.position,
          date: endDate,
          metadata: {
            dimension: 'device',
            device: item.device,
            site_url: siteUrl,
            synced_at: new Date().toISOString(),
          },
        }));

        const upsertResult = await bulkUpsertSearchConsoleData(
          client,
          (orgMember as any).organization_id,
          productId,
          formattedData
        );

        if (upsertResult.success) {
          syncResults.devices = formattedData.length;
          syncResults.totalRecords += formattedData.length;
        }
      } catch (error) {
        syncResults.errors.push(
          `Device sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update integration last_synced_at
    await (client as any)
      .from('integrations')
      .update({
        last_synced_at: new Date().toISOString(),
        status: syncResults.errors.length > 0 ? 'active' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', (orgMember as any).organization_id)
      .eq('platform', 'google-search-console');

    return NextResponse.json({
      success: syncResults.errors.length === 0,
      message:
        syncResults.errors.length === 0
          ? 'Data synced successfully'
          : 'Data synced with some errors',
      results: syncResults,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('Error syncing Google Search Console data:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
