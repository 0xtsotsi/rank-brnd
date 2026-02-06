# Rank.brnd - Clerk Authentication Integration

This project implements secure authentication using Clerk with httpOnly cookies for JWT token storage.

## Features

- ✅ Secure authentication with Clerk
- ✅ JWT tokens stored in httpOnly cookies (XSS protection)
- ✅ Protected routes with automatic redirects
- ✅ User management and organization support
- ✅ Webhook integration for user synchronization
- ✅ Role-based access control utilities

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or use existing one
3. Get your API keys from API Keys section
4. Configure webhook in Webhooks section

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update with your Clerk credentials:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***
CLERK_WEBHOOK_SECRET=whsec_***
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
├── app/
│   ├── (auth)/                    # Authentication routes
│   │   ├── sign-in/[[...sign-in]]/
│   │   └── sign-up/[[...sign-up]]/
│   ├── (protected)/               # Protected routes
│   │   ├── dashboard/
│   │   └── onboarding/
│   ├── api/
│   │   ├── webhooks/clerk/        # Webhook handler
│   │   └── protected/             # Protected API examples
│   ├── layout.tsx                 # Root layout with ClerkProvider
│   └── page.tsx                   # Public homepage
├── lib/
│   └── auth.ts                    # Auth utility functions
├── middleware.ts                  # Route protection middleware
├── tests/
│   └── verify-clerk-auth.spec.ts  # Playwright verification tests
└── playwright.config.ts           # Playwright configuration
```

## Security Features

### httpOnly Cookies

Clerk uses httpOnly cookies by default, which means:

- ✅ **XSS Protection**: JavaScript cannot access the cookies
- ✅ **Automatic Token Refresh**: Clerk handles rotation transparently
- ✅ **CSRF Protection**: Built-in sameSite cookie attribute

### Route Protection

- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`
- Protected routes: `/dashboard`, `/onboarding`, `/api/protected/*`

### Webhook Security

- Signature verification with Svix
- Handles user and organization events
- Safe data synchronization

## Usage Examples

### Protecting a Server Component

```typescript
import { auth } from '@clerk/nextjs/server';

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <div>Welcome {userId}</div>;
}
```

### Protecting an API Route

```typescript
import { requireUserId } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await requireUserId();

  return NextResponse.json({ userId });
}
```

### Using Auth Utilities

```typescript
import { requireUserId, hasRole } from '@/lib/auth';

// Get current user
const userId = await requireUserId();

// Check user role
const isAdmin = await hasRole('admin');
```

## Webhook Configuration

Add this webhook URL in your Clerk Dashboard:

```
https://your-domain.com/api/webhooks/clerk
```

Select these events:

- `user.created`
- `user.updated`
- `user.deleted`
- `organization.created`
- `organization.updated`
- `organization.deleted`
- `organizationMembership.created`
- `organizationMembership.updated`
- `organizationMembership.deleted`

## Testing

Run Playwright tests to verify authentication:

```bash
npm run test
```

Run tests in headed mode:

```bash
npm run test:headed
```

## Next Steps

1. Set up PostgreSQL database with Drizzle ORM
2. Implement user synchronization in webhook handlers
3. Add organization creation flow
4. Implement RBAC with custom claims
5. Add MFA (Multi-Factor Authentication)

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Clerk + Next.js Quickstart](https://clerk.com/docs/quickstarts/get-started-with-nextjs)

## Troubleshooting

### Middleware Not Working

Make sure `middleware.ts` is in the root directory (not in `app/`).

### Webhook Verification Failing

Ensure `CLERK_WEBHOOK_SECRET` is set correctly. Get it from Clerk Dashboard > Webhooks.

### Routes Not Protected

Check that routes are correctly defined in the `isProtectedRoute` matcher in `middleware.ts`.

### Session Not Persisting

Clerk cookies require HTTPS in production. For local development, http works fine.
