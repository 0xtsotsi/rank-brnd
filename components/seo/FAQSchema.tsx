// @ts-nocheck - Database types need to be regenerated with Supabase CLI

import type { FAQPage } from '@/types/seo';

export interface FAQItem {
  question: string;
  answer: string;
  authorName?: string;
  upvotes?: number;
  url?: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
  faqPageUrl?: string;
}

/**
 * FAQSchema Component
 *
 * Generates JSON-LD structured data for FAQ pages.
 * This helps your FAQ content appear as rich results in Google Search.
 *
 * @param faqs - Array of FAQ items with questions and answers
 * @param faqPageUrl - Optional URL of the FAQ page
 *
 * @example
 * ```tsx
 * <FAQSchema
 *   faqs={[
 *     {
 *       question: "What is Rank.brnd?",
 *       answer: "Rank.brnd is an AI-powered SEO automation platform..."
 *     },
 *     {
 *       question: "How do I get started?",
 *       answer: "Sign up for a free account and connect your website..."
 *     }
 *   ]}
 * />
 * ```
 */
export function FAQSchema({ faqs, faqPageUrl }: FAQSchemaProps) {
  const faqData: FAQPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
        ...(faq.authorName && {
          author: {
            '@type': 'Person',
            name: faq.authorName,
          },
        }),
        ...(faq.upvotes !== undefined && { upvoteCount: faq.upvotes }),
        ...(faq.url && { url: faq.url }),
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqData),
      }}
    />
  );
}

/**
 * FAQSection Schema Component
 *
 * For pages that have an FAQ section but aren't dedicated FAQ pages.
 * Uses the same FAQPage schema but can be used on any page with FAQs.
 *
 * @example
 * ```tsx
 * <FAQSection
 *   faqs={[
 *     { question: "Is there a free trial?", answer: "Yes, we offer a 14-day free trial." },
 *     { question: "Can I cancel anytime?", answer: "Yes, you can cancel your subscription at any time." }
 *   ]}
 * />
 * ```
 */
export function FAQSection({ faqs }: { faqs: FAQItem[] }) {
  return <FAQSchema faqs={faqs} />;
}

export default FAQSchema;
