#!/bin/bash
set -e

VERCEL_TOKEN="wvaBrUEXmonYEkrKrTuGqxqj"

echo "Removing old Clerk keys..."
npx vercel --token "$VERCEL_TOKEN" env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --yes <<EOF
y
EOF

echo "Removing old Clerk secret key..."
npx vercel --token "$VERCEL_TOKEN" env rm CLERK_SECRET_KEY production --yes <<EOF
y
EOF

echo "Adding test publishable key..."
npx vercel --token "$VERCEL_TOKEN" env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --yes <<EOF
pk_test_YWRqdXN0ZWQtZmlzaC0yNC5jbGVyay5hY2NvdW50cy5kZXYk
EOF

echo "Adding test secret key (beru)..."
npx vercel --token "$VERCEL_TOKEN" env add CLERK_SECRET_KEY production --yes <<EOF
sk_test_rs8CUbgWj5g036K1hLbgYJ9odJLbUtCyd5sv5lhRx9
EOF

echo "✅ All Vercel environment variables updated!"
echo "Please redeploy the project to apply changes."
