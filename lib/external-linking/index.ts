/**
 * External Linking Service
 *
 * Main service for identifying external link opportunities
 * and suggesting authoritative sources for citations.
 *
 * @example
 * ```ts
 * import { generateExternalLinkOpportunities } from '@/lib/external-linking';
 *
 * const opportunities = await generateExternalLinkOpportunities({
 *   content: articleContent,
 *   title: articleTitle,
 *   keywords: ['seo', 'content marketing'],
 *   organization_id: orgId,
 * });
 * ```
 */

// Re-export all types
export * from './types';

// Re-export core functions
export {
  analyzeContentForExternalLinks,
  findBestInsertPosition,
  generateAnchorText,
} from './content-analyzer';

export {
  matchContentWithSources,
  getAuthoritativeSourcesByCategory,
  findSourcesForKeywords,
} from './source-matcher';

export {
  applyExternalLinksToContent,
  removeExternalLinksFromContent,
  generateTrackedLinkHtml,
  previewExternalLinksInContent,
  validateExternalLinks,
} from './link-applicator';

/**
 * Default global external link sources
 * These are high-authority, trustworthy sources for citations
 */
export const DEFAULT_GLOBAL_SOURCES = [
  {
    domain: 'wikipedia.org',
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org',
    description:
      'Free online encyclopedia, created and edited by volunteers around the world.',
    category: 'reference' as const,
    status: 'active' as const,
    domain_authority: 95,
    trustworthiness_score: 85,
    is_global: true,
    topics: ['general knowledge', 'reference', 'encyclopedia'],
    language: 'en',
  },
  {
    domain: 'nih.gov',
    name: 'National Institutes of Health',
    url: 'https://www.nih.gov',
    description:
      'U.S. medical research agency, offering health information and resources.',
    category: 'health' as const,
    status: 'active' as const,
    domain_authority: 95,
    trustworthiness_score: 98,
    is_global: true,
    topics: ['health', 'medical research', 'science', 'medicine'],
    language: 'en',
  },
  {
    domain: 'who.int',
    name: 'World Health Organization',
    url: 'https://www.who.int',
    description:
      'United Nations agency responsible for international public health.',
    category: 'health' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 98,
    is_global: true,
    topics: ['health', 'public health', 'medicine', 'global health'],
    language: 'en',
  },
  {
    domain: 'cdc.gov',
    name: 'Centers for Disease Control and Prevention',
    url: 'https://www.cdc.gov',
    description: 'U.S. government health protection agency.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 96,
    trustworthiness_score: 97,
    is_global: true,
    topics: ['health', 'disease prevention', 'public health', 'medicine'],
    language: 'en',
  },
  {
    domain: 'census.gov',
    name: 'U.S. Census Bureau',
    url: 'https://www.census.gov',
    description: 'Principal agency of the U.S. Federal Statistical System.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 95,
    is_global: true,
    topics: ['statistics', 'demographics', 'population', 'data'],
    language: 'en',
  },
  {
    domain: 'bls.gov',
    name: 'Bureau of Labor Statistics',
    url: 'https://www.bls.gov',
    description:
      'Principal fact-finding agency for the U.S. federal government in labor economics and statistics.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 92,
    trustworthiness_score: 95,
    is_global: true,
    topics: ['employment', 'labor', 'economics', 'statistics', 'inflation'],
    language: 'en',
  },
  {
    domain: 'scholar.google.com',
    name: 'Google Scholar',
    url: 'https://scholar.google.com',
    description:
      'Search engine for scholarly literature across disciplines and sources.',
    category: 'academic' as const,
    status: 'active' as const,
    domain_authority: 98,
    trustworthiness_score: 90,
    is_global: true,
    topics: ['academic', 'research', 'scholarly articles', 'papers'],
    language: 'en',
  },
  {
    domain: 'pubmed.ncbi.nlm.nih.gov',
    name: 'PubMed',
    url: 'https://pubmed.ncbi.nlm.nih.gov',
    description:
      'Free search engine accessing primarily the MEDLINE database of references and abstracts on life sciences and biomedical topics.',
    category: 'academic' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 96,
    is_global: true,
    topics: ['medical research', 'academic', 'biomedical', 'life sciences'],
    language: 'en',
  },
  {
    domain: 'nature.com',
    name: 'Nature',
    url: 'https://www.nature.com',
    description: 'International weekly journal of science.',
    category: 'academic' as const,
    status: 'active' as const,
    domain_authority: 93,
    trustworthiness_score: 94,
    is_global: true,
    topics: ['science', 'research', 'academic', 'journal'],
    language: 'en',
  },
  {
    domain: 'science.org',
    name: 'Science',
    url: 'https://www.science.org',
    description: 'Leading peer-reviewed journal for scientific research.',
    category: 'academic' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 95,
    is_global: true,
    topics: ['science', 'research', 'academic', 'journal'],
    language: 'en',
  },
  {
    domain: 'sec.gov',
    name: 'SEC.gov',
    url: 'https://www.sec.gov',
    description:
      'U.S. Securities and Exchange Commission, protecting investors and maintaining fair markets.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 95,
    is_global: true,
    topics: ['finance', 'investing', 'securities', 'business', 'regulation'],
    language: 'en',
  },
  {
    domain: 'bea.gov',
    name: 'Bureau of Economic Analysis',
    url: 'https://www.bea.gov',
    description: 'U.S. government agency providing economic statistics.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 90,
    trustworthiness_score: 94,
    is_global: true,
    topics: ['economics', 'gdp', 'statistics', 'economic data'],
    language: 'en',
  },
  {
    domain: 'statista.com',
    name: 'Statista',
    url: 'https://www.statista.com',
    description:
      'Leading statistics company providing market and consumer data.',
    category: 'statistics' as const,
    status: 'active' as const,
    domain_authority: 92,
    trustworthiness_score: 85,
    is_global: true,
    topics: ['statistics', 'market research', 'data', 'industry reports'],
    language: 'en',
  },
  {
    domain: 'pewresearch.org',
    name: 'Pew Research Center',
    url: 'https://www.pewresearch.org',
    description:
      'Nonpartisan fact tank that informs the public about issues, attitudes and trends shaping the world.',
    category: 'statistics' as const,
    status: 'active' as const,
    domain_authority: 93,
    trustworthiness_score: 92,
    is_global: true,
    topics: [
      'research',
      'statistics',
      'public opinion',
      'demographics',
      'social trends',
    ],
    language: 'en',
  },
  {
    domain: 'reuters.com',
    name: 'Reuters',
    url: 'https://www.reuters.com',
    description:
      'International news organization covering breaking news, business, finance, and politics.',
    category: 'news' as const,
    status: 'active' as const,
    domain_authority: 95,
    trustworthiness_score: 88,
    is_global: true,
    topics: ['news', 'business', 'finance', 'world news', 'politics'],
    language: 'en',
  },
  {
    domain: 'apnews.com',
    name: 'Associated Press',
    url: 'https://apnews.com',
    description:
      'Independent global news organization dedicated to factual reporting.',
    category: 'news' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 90,
    is_global: true,
    topics: ['news', 'world news', 'politics', 'business', 'sports'],
    language: 'en',
  },
  {
    domain: 'npr.org',
    name: 'NPR',
    url: 'https://www.npr.org',
    description:
      'Independent, non-profit media organization covering news and culture.',
    category: 'news' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 87,
    is_global: true,
    topics: ['news', 'politics', 'culture', 'science', 'health'],
    language: 'en',
  },
  {
    domain: 'ec.europa.eu',
    name: 'European Commission',
    url: 'https://ec.europa.eu',
    description:
      'Executive branch of the European Union, responsible for proposing legislation and implementing decisions.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 93,
    trustworthiness_score: 90,
    is_global: true,
    topics: ['eu policy', 'european union', 'regulations', 'europe'],
    language: 'en',
  },
  {
    domain: 'data.un.org',
    name: 'UN Data',
    url: 'https://data.un.org',
    description:
      'United Nations data access system for searching and retrieving UN statistical data.',
    category: 'statistics' as const,
    status: 'active' as const,
    domain_authority: 92,
    trustworthiness_score: 93,
    is_global: true,
    topics: ['united nations', 'statistics', 'global data', 'international'],
    language: 'en',
  },
  {
    domain: 'worldbank.org',
    name: 'World Bank',
    url: 'https://www.worldbank.org',
    description:
      'International financial institution providing loans and grants to governments of low- and middle-income countries.',
    category: 'industry' as const,
    status: 'active' as const,
    domain_authority: 95,
    trustworthiness_score: 88,
    is_global: true,
    topics: ['economics', 'development', 'finance', 'global economy'],
    language: 'en',
  },
  {
    domain: 'imf.org',
    name: 'International Monetary Fund',
    url: 'https://www.imf.org',
    description:
      'Organization of 190 countries working to foster global monetary cooperation.',
    category: 'industry' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 88,
    is_global: true,
    topics: ['economics', 'finance', 'monetary policy', 'global economy'],
    language: 'en',
  },
  {
    domain: 'ieee.org',
    name: 'IEEE',
    url: 'https://www.ieee.org',
    description:
      'World largest technical professional organization dedicated to advancing technology.',
    category: 'technology' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 90,
    is_global: true,
    topics: ['technology', 'engineering', 'computing', 'technical'],
    language: 'en',
  },
  {
    domain: 'acm.org',
    name: 'ACM',
    url: 'https://www.acm.org',
    description:
      'Association for Computing Machinery, the world largest educational and scientific computing society.',
    category: 'technology' as const,
    status: 'active' as const,
    domain_authority: 91,
    trustworthiness_score: 89,
    is_global: true,
    topics: ['computing', 'computer science', 'technology', 'research'],
    language: 'en',
  },
  {
    domain: 'nist.gov',
    name: 'NIST',
    url: 'https://www.nist.gov',
    description:
      'National Institute of Standards and Technology, U.S. physical sciences laboratory.',
    category: 'technology' as const,
    status: 'active' as const,
    domain_authority: 93,
    trustworthiness_score: 94,
    is_global: true,
    topics: [
      'standards',
      'technology',
      'measurement',
      'science',
      'cybersecurity',
    ],
    language: 'en',
  },
  {
    domain: ' FTC.gov',
    name: 'Federal Trade Commission',
    url: 'https://www.ftc.gov',
    description:
      'U.S. government agency protecting consumers and promoting competition.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 92,
    trustworthiness_score: 93,
    is_global: true,
    topics: ['consumer protection', 'business', 'antitrust', 'privacy'],
    language: 'en',
  },
  {
    domain: 'fda.gov',
    name: 'FDA',
    url: 'https://www.fda.gov',
    description: 'U.S. Food and Drug Administration, protecting public health.',
    category: 'government' as const,
    status: 'active' as const,
    domain_authority: 94,
    trustworthiness_score: 96,
    is_global: true,
    topics: ['food', 'drugs', 'medical devices', 'health', 'regulation'],
    language: 'en',
  },
];

/**
 * Get default global sources by category
 */
export function getDefaultSourcesByCategory(
  category?:
    | 'academic'
    | 'government'
    | 'industry'
    | 'news'
    | 'reference'
    | 'statistics'
    | 'health'
    | 'technology'
    | 'business'
    | 'other'
) {
  if (category) {
    return DEFAULT_GLOBAL_SOURCES.filter((s) => s.category === category);
  }
  return DEFAULT_GLOBAL_SOURCES;
}

/**
 * Get default global sources as database-ready objects
 */
export function getDefaultSourcesForDatabase() {
  return DEFAULT_GLOBAL_SOURCES.map((source) => ({
    ...source,
    organization_id: null,
    page_authority: null,
    spam_score: null,
    last_verified_at: new Date().toISOString(),
    metadata: {
      is_default: true,
      added_at: new Date().toISOString(),
    },
  }));
}
