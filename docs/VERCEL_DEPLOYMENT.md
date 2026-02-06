# Vercel Deployment Guide

This guide covers deploying the Rank.brnd application to Vercel with automatic deployments, preview environments, and proper environment variable configuration.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Environment Variables](#environment-variables)
3. [Preview Deployments](#preview-deployments)
4. [Production Deployment](#production-deployment)
5. [Automatic Deployments](#automatic-deployments)
6. [Troubleshooting](#troubleshooting)

## Initial Setup

### 1. Install Vercel CLI (Optional)

```bash
pnpm add -g vercel
```

### 2. Connect Your Project to Vercel

**Option A: Via Vercel Dashboard**

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will automatically detect the Next.js framework

**Option B: Via CLI**

```bash
vercel login
vercel link
```

### 3. Configure Build Settings

The project includes a `vercel.json` configuration file with:

- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`
- **Framework**: Next.js 14

These settings are automatically detected, but you can verify them in Project Settings > Build & Development.

## Environment Variables

### Required Environment Variables

Navigate to **Project Settings > Environment Variables** and add the following:

#### Clerk Authentication

| Name                                | Value                      | Environment                      |
| ----------------------------------- | -------------------------- | -------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key | Production, Preview, Development |
| `CLERK_SECRET_KEY`                  | Your Clerk secret key      | Production, Preview, Development |
| `CLERK_JWT_KEY`                     | Your Clerk JWT public key  | Production, Preview, Development |
| `CLERK_WEBHOOK_SECRET`              | Your Clerk webhook secret  | Production, Preview              |

#### Supabase Storage

| Name                            | Value                          | Environment                      |
| ------------------------------- | ------------------------------ | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL      | All                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key         | All                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Your Supabase service role key | Production, Preview, Development |

#### Stripe Payments

| Name                                 | Value                         | Environment                      |
| ------------------------------------ | ----------------------------- | -------------------------------- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key   | All                              |
| `STRIPE_SECRET_KEY`                  | Your Stripe secret key        | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET`              | Your Stripe webhook secret    | Production, Preview              |
| `STRIPE_PRICE_ID_MONTHLY`            | Monthly subscription price ID | All                              |
| `STRIPE_PRICE_ID_YEARLY`             | Yearly subscription price ID  | All                              |

#### Application

| Name                                  | Value             | Environment                                |
| ------------------------------------- | ----------------- | ------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`                 | Your deployed URL | All (use different values per environment) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | `/sign-in`        | All                                        |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | `/sign-up`        | All                                        |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard`      | All                                        |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/onboarding`     | All                                        |

### Environment-Specific Values

For **Preview deployments**, use:

```
NEXT_PUBLIC_APP_URL=https://your-project-git-branch.vercel.app
```

For **Production**, use:

```
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

## Preview Deployments

Preview deployments are automatically created for:

- Every pull request
- Every commit to a non-production branch

### Preview Deployment Features

- **Unique URLs**: Each preview gets a unique URL
- **Isolated Environment**: Each preview uses preview-specific environment variables
- **Auto-Comment**: Preview URLs are automatically posted as comments on pull requests

### Configuring Preview Behavior

In `.vercelignore` (optional):

```
# Don't deploy these files in previews
.env.local
.env.development
coverage/
```

## Production Deployment

### Manual Production Deployment

```bash
# Deploy to production
vercel --prod

# Or via CLI with a specific branch
git push origin main
```

### Automatic Production Deployment

Production deployments are automatically triggered when:

- A commit is pushed to the `main` branch
- A tag is pushed that matches the production pattern

### Production Branch Configuration

Go to **Project Settings > Git** and set:

- **Production Branch**: `main`
- **Preview Branches**: All other branches

## Automatic Deployments

### Deployment Triggers

| Event                         | Deployment Type |
| ----------------------------- | --------------- |
| Push to `main`                | Production      |
| Push to other branches        | Preview         |
| Pull Request created/updated  | Preview         |
| Pull Request merged to `main` | Production      |

### Deployment Hooks

Configure deployment hooks in **Project Settings > Git > Deploy Hooks**:

```bash
# Example: Notify your team on deployment
curl -X POST https://your-webhook-url \
  -d "status=deployed&branch=${VERCEL_GIT_COMMIT_REF}"
```

### Deployment Protection

Enable **Deploy Previews** in **Project Settings > Git**:

- Require approval for deploy previews
- Restrict deploy previews to specific teams

## Troubleshooting

### Build Failures

**Issue**: Build fails with missing dependencies

```bash
# Clear build cache and redeploy
vercel --force
```

**Issue**: Environment variables not available

- Ensure variables are added to the correct environment (Production/Preview/Development)
- Redeploy after adding new variables
- Variable names are case-sensitive

### Webhook Issues

**Issue**: Stripe/Clerk webhooks failing

1. Verify the webhook secret matches in both Vercel and Stripe/Clerk dashboards
2. Ensure the webhook endpoint URL is correct
3. Check that the webhook endpoint is publicly accessible

### Preview Environment Variables

**Issue**: Preview deployments using production variables

- Use separate variable values for Preview environment
- For `NEXT_PUBLIC_APP_URL`, Vercel automatically provides `VERCEL_URL` you can use:
  ```bash
  NEXT_PUBLIC_APP_URL=https://$VERCEL_URL
  ```

### Performance Issues

**Issue**: Slow page loads

- Check Vercel Analytics for insights
- Ensure images are optimized (configured in `next.config.js`)
- Verify CDN caching headers are applied

### Deployment Status Checks

View deployment logs in:

1. Vercel Dashboard > Deployments > [deployment] > Logs
2. Via CLI: `vercel logs [deployment-url]`

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Git Integration](https://vercel.com/docs/deployments/git)
