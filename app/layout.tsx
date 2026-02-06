import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CSRFProvider } from '@/lib/providers/csrf-provider';
import { PostHogProvider } from '@/lib/providers/posthog-provider';
import { CookieConsentProvider } from '@/lib/providers/cookie-consent-provider';
import { QueryProvider } from '@/lib/providers/query-provider';
import { OrganizationSchema, WebSiteSchema } from '@/components/seo';

/**
 * Font Optimization for Core Web Vitals
 *
 * Using system font stack for optimal performance:
 * - Zero network requests for fonts (fastest possible LCP)
 * - No Flash of Invisible Text (FOIT) - text renders immediately
 * - No Cumulative Layout Shift (CLS) - system fonts have known metrics
 * - Works offline and in any environment
 *
 * The system-ui font provides excellent performance while maintaining
 * a modern, professional appearance across all platforms:
 * - macOS/iOS: San Francisco
 * - Windows: Segoe UI
 * - Android: Roboto
 * - Linux: Ubuntu/DejaVu Sans
 *
 * When Inter font is needed, it can be loaded via CSS @import or
 * by adding the google font back when network is available.
 */

export const metadata: Metadata = {
  title: 'Rank.brnd - AI-Powered SEO Platform',
  description: 'All-in-one SEO automation platform with AI agents',
  // Performance-related metadata
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  // Theme color for browser UI
  other: {
    'theme-color': '#4F46E5',
  },
};

// Separate viewport export for Next.js 14+ (fixes deprecation warning)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4F46E5',
};

/**
 * JSON-LD Structured Data Component
 *
 * Adds global structured data for the organization and website.
 * This data helps search engines understand the entity behind the website.
 */
function JsonLdStructuredData() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rank.brnd';

  return (
    <>
      <OrganizationSchema
        name="Rank.brnd"
        description="AI-Powered SEO automation platform that helps businesses optimize their online presence with intelligent agents, keyword research, and content planning tools."
        url={appUrl}
        logo={`${appUrl}/logo.png`}
        contactEmail="hello@rank.brnd"
        contactType="customer service"
        knowsAbout={[
          'SEO',
          'Search Engine Optimization',
          'Digital Marketing',
          'Keyword Research',
          'Content Planning',
          'AI Agents',
          'SERP Analysis',
          'Domain Authority',
          'Link Building',
          'On-Page SEO',
          'Technical SEO',
        ]}
        knowsLanguage={['English', 'TypeScript', 'JavaScript']}
      />
      <WebSiteSchema
        name="Rank.brnd"
        url={appUrl}
        description="AI-Powered SEO automation platform with intelligent agents for keyword research, content planning, and SERP analysis."
        searchUrl={`${appUrl}/search?search_term_string={search_term_string}`}
        publisherName="Rank.brnd"
        publisherLogo={`${appUrl}/logo.png`}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          // Customize the appearance to match our design system
          rootBox: 'mx-auto',
          card: 'shadow-sm rounded-lg border border-gray-200 dark:border-gray-800',
          formFieldInput:
            'rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800',
          formButtonPrimary:
            'bg-indigo-600 hover:bg-indigo-700 text-white normal-case font-medium',
          footerActionLink:
            'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400',
          headerTitle: 'text-2xl font-bold text-gray-900 dark:text-white',
          headerSubtitle: 'text-gray-600 dark:text-gray-400',
          socialButtonsBlockButton:
            'border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800',
          dividerLine: 'border-gray-200 dark:border-gray-800',
          formFieldLabel: 'text-gray-700 dark:text-gray-300',
          formFieldErrorText: 'text-red-600',
          alertText: 'text-gray-700 dark:text-gray-300',
          identityPreviewText: 'text-gray-700 dark:text-gray-300',
        },
        layout: {
          socialButtonsPlacement: 'bottom',
          socialButtonsVariant: 'iconButton',
        },
      }}
    >
      <html lang="en">
        {/*
          Performance optimizations in head:
          - Preconnect to critical origins
          - DNS prefetch for anticipated navigations
        */}
        <head>
          {/* Preconnect to Clerk for authentication */}
          <link rel="preconnect" href="https://clerk.com" />
          <link rel="dns-prefetch" href="https://clerk.com" />
          {/* Preconnect to Supabase for data fetching */}
          <link rel="preconnect" href="https://supabase.co" />
          <link rel="dns-prefetch" href="https://supabase.co" />
          {/* Preconnect to PostHog for analytics */}
          {process.env.NEXT_PUBLIC_POSTHOG_HOST && (
            <>
              <link
                rel="preconnect"
                href={process.env.NEXT_PUBLIC_POSTHOG_HOST}
              />
              <link
                rel="dns-prefetch"
                href={process.env.NEXT_PUBLIC_POSTHOG_HOST}
              />
            </>
          )}
          {/* JSON-LD Structured Data for SEO */}
          <JsonLdStructuredData />
        </head>
        <body className="antialiased">
          <QueryProvider>
            <PostHogProvider>
              <CookieConsentProvider>
                <CSRFProvider>{children}</CSRFProvider>
              </CookieConsentProvider>
            </PostHogProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
