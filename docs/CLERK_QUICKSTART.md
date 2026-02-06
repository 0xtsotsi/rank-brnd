# Clerk Authentication Quick Start

This guide will help you set up Clerk authentication for Rank.brnd in 5 minutes.

## Step 1: Create Clerk Account

1. Go to [clerk.com](https://clerk.com)
2. Click "Sign up" (free tier available)
3. Verify your email address

## Step 2: Create Application

1. In Clerk Dashboard, click "Add Application"
2. Choose a name (e.g., "Rank.brnd Development")
3. Select "Next.js" as the framework
4. Click "Create"

## Step 3: Get API Keys

1. In your application, go to **API Keys** (left sidebar)
2. You'll see two keys:

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. Copy these keys (keep the secret key secure!)

## Step 4: Configure Environment Variables

1. In your project root, create `.env` file:

   ```bash
   cp .env.example .env
   ```

2. Add your Clerk keys to `.env`:

   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
   CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE

   # Other settings...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
   ```

## Step 5: Install Dependencies

```bash
pnpm install
```

This will install:

- `@clerk/nextjs` - Clerk's Next.js SDK
- `svix` - Webhook signature verification

## Step 6: Start Development Server

```bash
pnpm dev
```

## Step 7: Test Authentication

1. Open browser to `http://localhost:3000`
2. You'll be redirected to `/sign-in`
3. Click "Sign up" to create a test account
4. After signing up, you'll be redirected to `/dashboard`

## Step 8: Configure Webhooks (Optional but Recommended)

Webhooks keep your local database in sync with Clerk users.

### 8.1 Create Webhook Endpoint

1. In Clerk Dashboard, go to **Webhooks** (left sidebar)
2. Click **Add Endpoint**
3. Enter details:
   - **Endpoint URL**: `https://your-domain.com/api/webhooks/clerk`
   - For local testing, use a tunnel like ngrok or localtunnel
4. Click **Create**

### 8.2 Subscribe to Events

Select these events:

- `user.created`
- `user.updated`
- `user.deleted`
- `organization.created` (if using orgs)
- `organization.updated`
- `organization.deleted`
- `organizationMembership.created`
- `organizationMembership.updated`
- `organizationMembership.deleted`

### 8.3 Copy Webhook Secret

1. In the webhook endpoint details, find **Signing Secret**
2. Copy the secret (starts with `whsec_`)
3. Add to `.env`:

   ```env
   CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
   ```

## Verification

### Run Health Check

```bash
curl http://localhost:3000/api/health?auth=true
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-02T...",
  "version": "0.1.0",
  "environment": "development",
  "auth": {
    "configured": true,
    "authenticated": false
  }
}
```

### Run Setup Verification Script

```bash
bash scripts/verify-clerk-setup.sh
```

### Run Playwright Tests

```bash
# In one terminal
pnpm dev

# In another terminal
pnpm test tests/clerk-auth-verification.spec.ts
```

## Customization

### Enable Social Logins (Google, GitHub, etc.)

1. In Clerk Dashboard, go to **SSO Connections**
2. Add desired social providers
3. Configure OAuth apps (Google Cloud Console, GitHub Developer Settings, etc.)
4. The sign-in page will automatically show these options

### Customize Appearance

The Clerk components are styled in `app/layout.tsx`. You can modify the colors, fonts, and layout:

```typescript
<ClerkProvider
  appearance={{
    elements: {
      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700', // Change button color
      // ... more customizations
    }
  }}
>
```

### Add Organization Support

Clerk has built-in organization support. Enable it in:

1. Clerk Dashboard → your application → **Organizations**
2. Enable "Organizations" feature
3. Configure organization settings (creation by users, etc.)

## Troubleshooting

### "Clerk: ClerkInstance not found"

**Cause**: Clerk keys not set or app not restarted

**Solution**:

1. Check `.env` file has the keys
2. Restart dev server: `pnpm dev`

### "Invalid token" errors

**Cause**: Using old keys or mismatched environments

**Solution**:

1. Ensure you're using test keys for development
2. Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` matches Dashboard

### Webhook signature verification failing

**Cause**: Webhook secret doesn't match

**Solution**:

1. Re-copy webhook secret from Clerk Dashboard
2. Ensure no extra spaces in `.env` file
3. Check webhook URL is correct

### Middleware not protecting routes

**Cause**: Middleware configuration issue

**Solution**:

1. Check `middleware.ts` has correct route patterns
2. Ensure file is in project root (not in `app/` directory)
3. Restart dev server

## Next Steps

1. **Add more authentication features**:
   - Multi-factor authentication (MFA)
   - Social login providers
   - Organization management

2. **Implement user profile management**:
   - Avatar upload
   - Profile editing
   - Email verification

3. **Set up database sync**:
   - When Drizzle ORM is configured, uncomment webhook handlers
   - Create user/organization tables
   - Test sync flow

4. **Add role-based access control**:
   - Define custom roles in Clerk metadata
   - Use `requireRole()` in API routes
   - Show/hide UI based on roles

## Resources

- 📖 [Full Clerk Documentation](https://clerk.com/docs)
- 🎨 [Component Customization](https://clerk.com/docs/components/customization)
- 🔐 [Security Best Practices](https://clerk.com/docs/best-practices/security)
- 🪝 [Webhooks Guide](https://clerk.com/docs/webhooks/sync-data)
- 💬 [Clerk Discord Community](https://clerk.com/discord)

## Support

If you run into issues:

1. Check console for error messages
2. Run `bash scripts/verify-clerk-setup.sh`
3. Check [Clerk Troubleshooting](https://clerk.com/docs/troubleshooting)
4. Review `docs/CLERK_AUTH_SETUP.md` for detailed setup

---

**✅ Authentication setup complete!** Your app now has secure, production-ready authentication.
