import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createRequestLogger,
  getCorrelationId,
  withLoggingHeaders,
} from '@/lib/logger';

/**
 * Health Check Endpoint
 *
 * This endpoint provides a simple way to verify:
 * 1. The API is running
 * 2. Clerk authentication is configured
 * 3. Optional: User authentication status
 *
 * Usage:
 * - GET /api/health - Public health check
 * - GET /api/health?auth=true - Include auth status
 */
export async function GET(request: Request) {
  const log = await createRequestLogger('HealthCheck');
  const correlationId = await getCorrelationId();
  const { searchParams } = new URL(request.url);
  const includeAuth = searchParams.get('auth') === 'true';

  log.info('Health check requested', { includeAuth });

  const healthData: Record<string, any> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Include auth status if requested
  if (includeAuth) {
    try {
      const { userId, orgId } = await auth();
      healthData['auth'] = {
        configured: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        authenticated: !!userId,
        userId: userId || null,
        organizationId: orgId || null,
      };
      log.debug('Auth status retrieved', { authenticated: !!userId });
    } catch (error) {
      healthData['auth'] = {
        configured: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        error: error instanceof Error ? error.message : 'Auth check failed',
      };
      log.warn('Auth check failed', { error: healthData['auth'].error });
    }
  }

  // Check Clerk configuration
  const clerkConfigured = !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  );

  if (!clerkConfigured) {
    log.warn('Clerk environment variables not configured');
    return withLoggingHeaders(
      NextResponse.json(
        {
          ...healthData,
          status: 'unhealthy',
          errors: ['Clerk environment variables not configured'],
        },
        { status: 503 }
      ),
      correlationId
    );
  }

  log.info('Health check passed');

  return withLoggingHeaders(NextResponse.json(healthData), correlationId);
}
