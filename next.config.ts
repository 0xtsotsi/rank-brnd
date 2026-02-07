import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Security Headers Configuration
  // Following OWASP 2024 security best practices
  // Reference: https://nextjs.org/docs/app/api-reference/config/headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },

          // Prevent MIME type sniffing
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },

          // Enable XSS protection (legacy browsers)
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },

          // Control referrer information sent
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },

          // Restrict browser features and APIs
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()',
          },

          // Content Security Policy (CSP)
          // Prevents XSS, data injection, and other code injection attacks
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
          // Updated to allow Clerk authentication
          {
            key: 'Content-Security-Policy',
            value: [
              // Default restrict to same origin
              "default-src 'self';",

              // Script sources - allow Clerk and inline scripts
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.com vscode-resource:;"
                : "script-src 'self' 'unsafe-inline' https://*.clerk.com;",

              // Style sources - allow inline for styled-jsx and Tailwind
              "style-src 'self' 'unsafe-inline';",

              // Image sources - allow data URLs and common external image services
              "img-src 'self' data: blob: https://*.clerk.com https://*.stripe.com;",

              // Connect sources - allow API calls to required services
              "connect-src 'self' https://*.clerk.com https://*.stripe.com https://*.supabase.co https://*.posthog.com wss://*.clerk.com wss://*.supabase.co;",

              // Font sources
              "font-src 'self' data:;",

              // Object sources - block plugins
              "object-src 'none';",

              // Base URI
              "base-uri 'self';",

              // Form action
              "form-action 'self';",

              // Frame ancestors - prevent embedding
              "frame-ancestors 'none';",

              // Upgrade insecure requests
              "upgrade-insecure-requests;",
            ].join(' '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
