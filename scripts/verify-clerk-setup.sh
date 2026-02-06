#!/bin/bash

# Clerk Authentication Setup Verification Script
#
# This script verifies that the Clerk authentication setup is complete
# and helps identify any missing configuration.

set -e

echo "🔐 Verifying Clerk Authentication Setup"
echo "========================================"
echo ""

# Check if .env file exists
if [ ! -f .env ] && [ ! -f .env.local ]; then
  echo "⚠️  Warning: .env or .env.local file not found"
  echo "   Please create .env from .env.example:"
  echo "   cp .env.example .env"
  echo ""
  echo "   Then add your Clerk credentials from https://dashboard.clerk.com"
  exit 1
fi

# Source the env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
elif [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check required environment variables
echo "Checking environment variables..."
missing_vars=()

if [ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ] || [[ "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" == *"***"* ]]; then
  missing_vars+=("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
fi

if [ -z "$CLERK_SECRET_KEY" ] || [[ "$CLERK_SECRET_KEY" == *"***"* ]]; then
  missing_vars+=("CLERK_SECRET_KEY")
fi

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Missing environment variables: ${missing_vars[*]}"
  echo ""
  echo "Get these from your Clerk Dashboard:"
  echo "1. Go to https://dashboard.clerk.com"
  echo "2. Select your application"
  echo "3. Navigate to API Keys"
  echo "4. Copy the keys to your .env file"
  exit 1
fi

echo "✅ Environment variables are set"
echo ""

# Check if dependencies are installed
echo "Checking dependencies..."
if [ ! -d node_modules ]; then
  echo "❌ node_modules not found. Installing dependencies..."
  pnpm install
fi

if [ ! -d node_modules/@clerk ]; then
  echo "❌ @clerk/nextjs not found. Installing..."
  pnpm add @clerk/nextjs
fi

if [ ! -d node_modules/svix ]; then
  echo "❌ svix not found. Installing..."
  pnpm add svix
fi

echo "✅ Dependencies are installed"
echo ""

# Check file structure
echo "Checking file structure..."
required_files=(
  "middleware.ts"
  "lib/auth.ts"
  "app/(auth)/sign-in/[[...sign-in]]/page.tsx"
  "app/(auth)/sign-up/[[...sign-up]]/page.tsx"
  "app/api/webhooks/clerk/route.ts"
  "app/layout.tsx"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ Missing: $file"
  fi
done
echo ""

# Verify middleware configuration
echo "Checking middleware configuration..."
if grep -q "clerkMiddleware" middleware.ts; then
  echo "✅ Middleware is configured with Clerk"
else
  echo "❌ Middleware not configured correctly"
fi
echo ""

# Verify ClerkProvider in layout
echo "Checking ClerkProvider setup..."
if grep -q "ClerkProvider" app/layout.tsx; then
  echo "✅ ClerkProvider is configured in root layout"
else
  echo "❌ ClerkProvider not found in root layout"
fi
echo ""

# Summary
echo "========================================"
echo "✅ Clerk Authentication Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Configure webhooks in Clerk Dashboard:"
echo "   - URL: https://your-domain.com/api/webhooks/clerk"
echo "   - Events: user.*, organization.*, organizationMembership.*"
echo ""
echo "2. Start the development server:"
echo "   pnpm dev"
echo ""
echo "3. Run verification tests:"
echo "   pnpm test tests/clerk-auth-verification.spec.ts"
echo ""
echo "4. Open http://localhost:3000/sign-in to test authentication"
echo ""
