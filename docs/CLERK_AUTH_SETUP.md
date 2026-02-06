# Clerk Authentication Setup Guide

This document describes the Clerk authentication implementation for Rank.brnd.

## Overview

Rank.brnd uses [Clerk](https://clerk.com) for complete authentication management with the following security features:

- ✅ **httpOnly cookies** for secure JWT token storage (no XSS vulnerability)
- ✅ **CSRF protection** via sameSite=strict cookie policy
- ✅ **Automatic token refresh** handled by Clerk
- ✅ **Multi-tenant organization support**
- ✅ **Role-based access control** via custom session claims
- ✅ **Webhook sync** for keeping local database in sync with Clerk

## Architecture

### Security Model

Unlike Outrank.so (which stores JWT tokens in localStorage - vulnerable to XSS), Rank.brnd uses Clerk's default **httpOnly cookie** approach:

```typescript
// ❌ OUTRANK.SO (VULNERABLE)
localStorage.setItem('token', jwt); // Accessible by JavaScript

// ✅ RANK.BRND (SECURE)
// Clerk automatically sets httpOnly cookie:
// __session (httpOnly, secure, sameSite=strict)
// JavaScript cannot access this cookie
```

### File Structure

```
├── middleware.ts                    # Route protection middleware
├── lib/
│   └── auth.ts                      # Auth utility functions
├── providers/
│   └── clerk-provider.tsx           # Custom ClerkProvider wrapper (optional)
├── app/
│   ├── layout.tsx                   # Root layout with ClerkProvider
│   ├── (auth)/
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/page.tsx
│   │   └── sign-up/
│   │       └── [[...sign-up]]/page.tsx
│   ├── (protected)/
│   │   ├── dashboard/
│   │   └── onboarding/
│   └── api/
│       ├── protected/
│       │   └── example/route.ts     # Example protected API route
│       └── webhooks/
│           └── clerk/route.ts       # Clerk webhook handler
└── tests/
    └── clerk-auth-verification.spec.ts
```

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Add your Clerk credentials from [dashboard.clerk.com](https://dashboard.clerk.com):

```env
# Required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***

# Optional (custom URLs)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Required for webhook verification
CLERK_WEBHOOK_SECRET=whsec_***

# Optional (for local JWT verification)
CLERK_JWT_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting Clerk Credentials

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or select existing
3. Navigate to **API Keys**
4. Copy **Publishable Key** and **Secret Key**

### Getting Webhook Secret

1. In Clerk Dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. Enter webhook URL: `https://your-domain.com/api/webhooks/clerk`
4. Select events to subscribe to:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`
5. Copy the webhook secret to `.env`

## Usage

### Protecting Routes

Routes are protected in `middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/api/protected(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});
```

### Server-Side Auth in API Routes

```typescript
import { requireUserId, requireOrganizationId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await requireUserId();
    const orgId = await requireOrganizationId();

    return Response.json({ userId, orgId });
  } catch (error) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Client-Side Auth

```typescript
import { useAuth, useUser, useOrganization } from '@clerk/nextjs'

function MyComponent() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { organization } = useOrganization()

  if (!isLoaded) return <div>Loading...</div>
  if (!isSignedIn) return <SignIn />

  return (
    <div>
      Welcome, {user?.firstName}!
      Organization: {organization?.name}
    </div>
  )
}
```

### Role-Based Access Control

```typescript
import { hasRole, requireRole } from '@/lib/auth';

// In API route
export async function DELETE() {
  await requireRole('admin'); // Throws if not admin

  // Perform admin-only operation
}

// Check role conditionally
if (await hasRole('admin')) {
  // Show admin UI
}
```

## Webhook Sync

The webhook handler at `/api/webhooks/clerk` syncs Clerk data to your local database:

1. When a user is created in Clerk → webhook creates user in your DB
2. When organization is created → webhook creates organization in your DB
3. When membership is updated → webhook updates role in your DB

**Note**: The webhook handler currently logs to console. When Drizzle ORM is set up, uncomment the database operations in `app/api/webhooks/clerk/route.ts`.

## Testing

### Run Verification Tests

```bash
# Start dev server
pnpm dev

# In another terminal, run tests
pnpm test tests/clerk-auth-verification.spec.ts
```

### Run Setup Verification Script

```bash
./scripts/verify-clerk-setup.sh
```

### Manual Testing

1. Start dev server: `pnpm dev`
2. Visit `http://localhost:3000/sign-in`
3. Create a test account
4. Verify redirect to `/dashboard`
5. Sign out and verify you can't access protected routes

## Customization

### Styling

Clerk components are styled in `app/layout.tsx`:

```typescript
<ClerkProvider
  appearance={{
    elements: {
      formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
      // ... more customizations
    }
  }}
>
```

### Custom Sign-In/Sign-Up Pages

Modify `app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        signUpUrl="/sign-up"
        redirectUrl="/dashboard"
        afterSignInUrl="/dashboard"
      />
    </div>
  )
}
```

## Troubleshooting

### "Missing svix package"

```bash
pnpm add svix
```

### Webhook signature verification fails

- Verify `CLERK_WEBHOOK_SECRET` matches exactly in Clerk Dashboard
- Check for trailing whitespace in `.env` file
- Ensure webhook URL is correct in Clerk Dashboard

### Protected routes not redirecting

- Check `middleware.ts` has correct route patterns
- Verify middleware matcher includes your routes
- Check browser console for errors

### Session not persisting

- Ensure cookies are enabled in browser
- Check if running on localhost (cookies work fine)
- For production, ensure HTTPS is enabled

## Security Checklist

- ✅ JWT stored in httpOnly cookies (not localStorage)
- ✅ CSRF protection via sameSite=strict
- ✅ Webhook signature verification enabled
- ✅ Route protection configured in middleware
- ✅ Environment variables not committed to git
- ✅ HTTPS required in production
- ✅ Session timeout configured in Clerk Dashboard

## Migration from Other Auth

If migrating from another auth system:

1. Keep both systems running temporarily
2. Create users in Clerk via API or CSV import
3. Update frontend to use Clerk components
4. Update API routes to use Clerk auth
5. Migrate existing sessions to Clerk
6. Remove old auth system

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Integration Guide](https://clerk.com/docs/quickstarts/start-with-nextjs)
- [Clerk React Components](https://clerk.com/docs/components/overview)
- [Webhooks Guide](https://clerk.com/docs/webhooks/sync-data)
- [Security Best Practices](https://clerk.com/docs/best-practices/security)

## Support

For issues or questions:

1. Check [Clerk Troubleshooting](https://clerk.com/docs/troubleshooting)
2. Search existing GitHub issues
3. Create a new issue with detailed error logs
