import type { Organization, ContactPoint, PostalAddress } from '@/types/seo';

interface OrganizationSchemaProps {
  name: string;
  description?: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  contactEmail?: string;
  contactPhone?: string;
  contactType?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  foundingDate?: string;
  founders?: string[];
  socialLinks?: string[];
  areaServed?: string;
  knowsAbout?: string[];
  knowsLanguage?: string[];
}

/**
 * OrganizationSchema Component
 *
 * Generates JSON-LD structured data for an organization.
 * This helps search engines understand your organization and can lead to
 * knowledge graph entries and rich results.
 *
 * @param name - Organization name
 * @param description - Organization description
 * @param url - Organization website URL
 * @param logo - URL to organization logo
 * @param sameAs - Array of URLs to other organization profiles (social media, etc.)
 * @param contactEmail - Contact email address
 * @param contactPhone - Contact phone number
 * @param contactType - Type of contact (e.g., "customer service", "sales")
 * @param address - Physical address
 * @param foundingDate - ISO date string when organization was founded
 * @param founders - Array of founder names
 * @param socialLinks - Array of social media profile URLs
 * @param areaServed - Geographic area served
 * @param knowsAbout - Topics the organization is knowledgeable about
 * @param knowsLanguage - Languages the organization knows
 *
 * @example
 * ```tsx
 * <OrganizationSchema
 *   name="Rank.brnd"
 *   description="AI-Powered SEO Automation Platform"
 *   url="https://rank.brnd"
 *   logo="https://rank.brnd/logo.png"
 *   contactEmail="hello@rank.brnd"
 *   contactType="customer service"
 *   sameAs={[
 *     "https://twitter.com/rankbrnd",
 *     "https://linkedin.com/company/rankbrnd"
 *   ]}
 * />
 * ```
 */
export function OrganizationSchema({
  name,
  description,
  url,
  logo,
  sameAs,
  contactEmail,
  contactPhone,
  contactType = 'customer service',
  address,
  foundingDate,
  founders,
  socialLinks,
  areaServed,
  knowsAbout,
  knowsLanguage,
}: OrganizationSchemaProps) {
  // Combine sameAs and socialLinks
  const allSameAs = [...(sameAs || []), ...(socialLinks || [])];

  const organizationData: Organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    logo,
    ...(allSameAs.length > 0 && { sameAs: allSameAs }),
    ...((contactEmail || contactPhone) && {
      contactPoint: {
        '@type': 'ContactPoint',
        ...(contactEmail && { email: contactEmail }),
        ...(contactPhone && { telephone: contactPhone }),
        contactType,
      } as ContactPoint,
    }),
    ...(address && {
      address: {
        '@type': 'PostalAddress',
        ...address,
      } as PostalAddress,
    }),
    ...(foundingDate && { foundingDate }),
    ...(founders && founders.length > 0 && { founders }),
    ...(areaServed && { areaServed }),
    ...(knowsAbout && knowsAbout.length > 0 && { knowsAbout }),
    ...(knowsLanguage && knowsLanguage.length > 0 && { knowsLanguage }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organizationData),
      }}
    />
  );
}

/**
 * SoftwareOrganizationSchema Component
 *
 * Specialized organization schema for software/tech companies.
 * Adds additional properties relevant to software companies.
 *
 * @example
 * ```tsx
 * <SoftwareOrganizationSchema
 *   name="Rank.brnd"
 *   description="AI-Powered SEO Automation Platform"
 *   url="https://rank.brnd"
 *   logo="https://rank.brnd/logo.png"
 *   knowsAbout={[
 *     "SEO",
 *     "Digital Marketing",
 *     "AI",
 *     "Content Automation",
 *     "Keyword Research"
 *   ]}
 * />
 * ```
 */
interface SoftwareOrganizationSchemaProps extends Omit<
  OrganizationSchemaProps,
  'foundingDate' | 'founders' | 'areaServed'
> {
  knowsAbout: string[];
}

export function SoftwareOrganizationSchema({
  knowsAbout,
  ...props
}: SoftwareOrganizationSchemaProps) {
  return (
    <OrganizationSchema
      {...props}
      knowsAbout={[
        'Software Development',
        'SaaS',
        'Web Applications',
        ...knowsAbout,
      ]}
      knowsLanguage={['English', 'TypeScript', 'JavaScript']}
    />
  );
}

/**
 * WebSite Schema Component
 *
 * Generates JSON-LD structured data for the website itself.
 * This includes search functionality for Sitelinks Searchbox.
 *
 * @example
 * ```tsx
 * <WebSiteSchema
 *   name="Rank.brnd"
 *   url="https://rank.brnd"
 *   description="AI-Powered SEO Automation Platform"
 * />
 * ```
 */
interface WebSiteSchemaProps {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
  publisherName?: string;
  publisherLogo?: string;
}

export function WebSiteSchema({
  name,
  url,
  description,
  searchUrl,
  publisherName,
  publisherLogo,
}: WebSiteSchemaProps) {
  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    ...(searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: searchUrl,
        },
        'query-input': 'required name=search_term_string',
      },
    }),
    ...(publisherName && {
      publisher: {
        '@type': 'Organization',
        name: publisherName,
        logo: publisherLogo,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(websiteData),
      }}
    />
  );
}

export default OrganizationSchema;
