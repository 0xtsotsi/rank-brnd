'use client';

import { ClerkProvider as ClerkReactProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

/**
 * Custom Clerk Provider Wrapper
 *
 * This provider wraps the Clerk React provider with additional theming support.
 * Clerk uses httpOnly cookies for session management by default, providing
 * secure JWT handling without XSS vulnerabilities.
 *
 * Security Features:
 * - httpOnly cookies prevent JavaScript access to tokens
 * - sameSite=strict prevents CSRF attacks
 * - Secure flag ensures HTTPS-only transmission in production
 *
 * Theming:
 * - Theme support can be enabled by installing next-themes and @clerk/themes
 * - See comments at the bottom of this file for setup instructions
 */

interface ClerkProviderProps {
  children: ReactNode;
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  return (
    <ClerkReactProvider
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
      {children}
    </ClerkReactProvider>
  );
}

/**
 * Note: next-themes is not currently installed
 *
 * To enable theme switching, install next-themes:
 * pnpm add next-themes
 *
 * Then add the ThemeProvider to your root layout:
 *
 * import { ThemeProvider } from 'next-themes';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <ClerkProvider>
 *       <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
 *         {children}
 *       </ThemeProvider>
 *     </ClerkProvider>
 *   );
 * }
 */
