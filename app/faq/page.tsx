import Link from 'next/link';
import { FAQSchema, BreadcrumbSchema } from '@/components/seo';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FAQ - Rank.brnd',
  description:
    'Frequently asked questions about Rank.brnd, the AI-powered SEO automation platform.',
  openGraph: {
    title: 'FAQ - Rank.brnd',
    description:
      'Frequently asked questions about Rank.brnd, the AI-powered SEO automation platform.',
    type: 'website',
  },
};

const faqs = [
  {
    question: 'What is Rank.brnd?',
    answer:
      'Rank.brnd is an AI-powered SEO automation platform that helps businesses optimize their online presence. Our intelligent agents assist with keyword research, content planning, SERP analysis, and domain authority tracking.',
  },
  {
    question: 'How does the AI-powered keyword research work?',
    answer:
      'Our AI analyzes search trends, competitor data, and user intent to suggest high-value keywords for your niche. The system continuously learns from search algorithm updates to provide relevant recommendations.',
  },
  {
    question: 'What subscription plans are available?',
    answer:
      'We offer four tiers: Free for individuals getting started, Starter for small businesses, Pro for growing teams, and Agency for marketing agencies managing multiple clients. Each plan includes different features and usage limits.',
  },
  {
    question: 'Can I integrate Rank.brnd with my existing CMS?',
    answer:
      'Yes! Rank.brnd integrates with popular CMS platforms including Webflow, WordPress, Ghost, and Notion. We also provide an API for custom integrations.',
  },
  {
    question: 'How accurate is the domain authority tracking?',
    answer:
      'We use the Moz API to provide accurate domain authority metrics. Data is cached and regularly updated to ensure you have current information while optimizing performance.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes, we take security seriously. Rank.brnd uses industry-standard encryption, secure authentication via Clerk, and follows GDPR best practices. Your data is stored securely in Supabase with proper access controls.',
  },
  {
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Absolutely. You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'Yes! We offer a 14-day free trial on our Starter and Pro plans. No credit card required to start your trial.',
  },
];

const breadcrumbs = [{ name: 'FAQ', url: '' }];

export default function FAQPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rank.brnd';

  return (
    <>
      {/* JSON-LD Structured Data */}
      <BreadcrumbSchema items={breadcrumbs} homeUrl={appUrl} />
      <FAQSchema
        faqs={faqs.map((faq) => ({
          question: faq.question,
          answer: faq.answer,
        }))}
      />

      {/* Page Content */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="flex mb-8 text-sm text-gray-600 dark:text-gray-400">
            <Link
              href="/"
              className="hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-white font-medium">
              FAQ
            </span>
          </nav>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Find answers to common questions about Rank.brnd
            </p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <summary className="flex cursor-pointer items-center justify-between p-6 text-lg font-medium text-gray-900 dark:text-white">
                  {faq.question}
                  <span className="ml-4 transition-transform group-open:rotate-180">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-12 text-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Our support team is here to help. Get in touch with us.
            </p>
            <a
              href="mailto:hello@rank.brnd"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
