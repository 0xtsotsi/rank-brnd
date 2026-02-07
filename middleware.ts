import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Middleware Configuration
 *
 * This middleware handles authentication flow via Clerk
 * Rate limiting temporarily disabled for Vercel deployment
 *
 * Route Protection:
 * - Public routes: accessible without authentication
 * - Protected routes: require authentication
 */

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/settings(.*)',
  '/api/protected(.*)',
  '/api/articles(.*)',
  '/api/keywords(.*)',
  '/api/backlinks(.*)',
  '/api/products(.*)',
  '/api/organizations(.*)',
]);

// Define public routes that should never redirect to sign-in
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Check if route is public (no auth required)
  if (isPublicRoute(request)) {
    return;
  }

  // Check if route is protected (auth required)
  if (isProtectedRoute(request)) {
    // Get auth state - this redirects unauthenticated users
    const { userId } = await auth();
    if (!userId) {
      // Redirect to sign-in page if not authenticated
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', request.url);
      return Response.redirect(signInUrl);
    }
  }
});

export const config = {
  // The matcher regex defines which paths the middleware should run on
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
