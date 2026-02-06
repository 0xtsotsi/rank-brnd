#!/bin/bash
set -e

echo "🚀 Aggressive Deploy Mode Activated"
echo "======================================"

# Build without typechecking for speed
echo "Building without TypeScript checks..."
cd /home/oxtsotsi/Webrnds/DevFlow/Rank.brnd

# 1. Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile=false

# 2. Build
echo "🏗 Building..."
pnpm run build

# 3. Deploy via Vercel CLI (if token available)
if [ ! -z "$VERCEL_TOKEN" ]; then
    echo "✅ Build complete!"
    echo "🚀 Deploying to Vercel..."
    npx vercel --prod --yes
else
    echo "✅ Build complete!"
    echo "⚠️  No Vercel token found"
    echo "To deploy manually, run: npx vercel --prod --yes"
fi

echo "======================================"
echo "✨ Done!"
