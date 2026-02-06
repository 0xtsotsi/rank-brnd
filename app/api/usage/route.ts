/**
 * Usage API Route
 *
 * Provides endpoints to check usage limits and retrieve usage statistics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOrganizationId } from '@/lib/auth';
import {
  checkUsageLimit,
  getAllUsageQuotas,
  getUsageQuotaInfo,
  getUsageStats,
} from '@/lib/usage';

/**
 * GET /api/usage
 * Get all usage quotas for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const organizationId = await requireOrganizationId();

    // Get plan ID from organization (TODO: fetch from database)
    // For now, default to free plan
    const planId = request.nextUrl.searchParams.get('planId') || 'free';

    const stats = await getUsageStats(organizationId, planId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch usage stats',
      },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

/**
 * POST /api/usage/check
 * Check if a specific usage is allowed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metric, quantity = 1, planId = 'free', organizationId } = body;

    if (!metric) {
      return NextResponse.json(
        { success: false, error: 'Metric is required' },
        { status: 400 }
      );
    }

    // Use provided organizationId or try to get from auth
    let orgId = organizationId;
    if (!orgId) {
      try {
        orgId = await requireOrganizationId();
      } catch {
        // For testing purposes, allow without auth if organizationId is provided
        if (!organizationId) {
          return NextResponse.json(
            { success: false, error: 'Organization ID is required' },
            { status: 400 }
          );
        }
      }
    }

    const check = await checkUsageLimit(orgId, planId, metric, quantity);

    return NextResponse.json({
      success: true,
      data: check,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check usage limit',
      },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
