/**
 * SEO and Structured Data Types
 *
 * TypeScript types for JSON-LD structured data schemas
 * Following Schema.org specifications for SEO optimization
 */

/**
 * Base JSON-LD Context
 */
export interface JsonLdContext {
  '@context': string;
  '@type'?: string;
}

/**
 * Thing - Base type for all Schema.org entities
 */
export interface Thing extends JsonLdContext {
  '@type': 'Thing';
  name: string;
  description?: string;
  url?: string;
  image?: string | string[];
}

/**
 * Organization Schema
 */
export interface Organization extends JsonLdContext {
  '@type': 'Organization';
  name: string;
  description?: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  contactPoint?: ContactPoint;
  address?: PostalAddress;
  foundingDate?: string;
  founders?: string[];
  numberOfEmployees?: QuantitativeValue;
  areaServed?: string | Place;
  knowsAbout?: string[];
  knowsLanguage?: string[];
}

export interface ContactPoint {
  '@type': 'ContactPoint';
  telephone?: string;
  email?: string;
  contactType: string;
  areaServed?: string;
  availableLanguage?: string[];
}

export interface PostalAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface Place {
  '@type': 'Place';
  name?: string;
  address?: PostalAddress;
  geo?: GeoCoordinates;
}

export interface GeoCoordinates {
  '@type': 'GeoCoordinates';
  latitude: number;
  longitude: number;
}

export interface QuantitativeValue {
  '@type': 'QuantitativeValue';
  value: number;
  unitText?: string;
}

/**
 * Article Schema
 */
export interface Article extends JsonLdContext {
  '@type': 'Article' | 'BlogPosting' | 'NewsArticle' | 'TechArticle';
  headline: string;
  description?: string;
  image: string | string[];
  author: Person | Organization | Person[];
  datePublished: string;
  dateModified?: string;
  publisher: Organization;
  keywords?: string | string[];
  articleSection?: string;
  wordCount?: number;
  articleBody?: string;
  mainEntityOfPage?: WebPage;
  thumbnailUrl?: string;
  inLanguage?: string;
}

export interface Person extends JsonLdContext {
  '@type': 'Person';
  name: string;
  url?: string;
  image?: string;
  jobTitle?: string;
  worksFor?: Organization;
  email?: string;
  sameAs?: string[];
}

export interface WebPage extends JsonLdContext {
  '@type': 'WebPage';
  '@id': string;
}

/**
 * BreadcrumbList Schema
 */
export interface BreadcrumbList extends JsonLdContext {
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  '@type': 'ListItem';
  position: number;
  name: string;
  item?: string;
}

/**
 * FAQPage Schema
 */
export interface FAQPage extends JsonLdContext {
  '@type': 'FAQPage';
  mainEntity: Question[];
}

export interface Question {
  '@type': 'Question';
  name: string;
  acceptedAnswer?: Answer;
  suggestedAnswer?: Answer[];
}

export interface Answer {
  '@type': 'Answer';
  text: string;
  author?: Person | Organization;
  dateCreated?: string;
  upvoteCount?: number;
  url?: string;
}

/**
 * WebSite Schema
 */
export interface WebSite extends JsonLdContext {
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  potentialAction?: SearchAction;
  publisher?: Organization;
}

export interface SearchAction {
  '@type': 'SearchAction';
  target: string;
  'query-input': string;
}

/**
 * Product Schema (for future use)
 */
export interface Product extends JsonLdContext {
  '@type': 'Product';
  name: string;
  description?: string;
  image?: string | string[];
  brand?: Organization;
  offers?: Offer[];
  aggregateRating?: AggregateRating;
}

export interface Offer {
  '@type': 'Offer';
  price: string;
  priceCurrency: string;
  availability?: string;
  url?: string;
  seller?: Organization;
}

export interface AggregateRating {
  '@type': 'AggregateRating';
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

/**
 * LocalBusiness Schema (for future use)
 */
export interface LocalBusiness extends Omit<Organization, '@type'> {
  '@type': 'LocalBusiness';
  openingHoursSpecification?: OpeningHoursSpecification[];
  priceRange?: string;
}

export interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

/**
 * Combined structured data type for multiple schemas
 */
export type StructuredData =
  | Organization
  | Article
  | BreadcrumbList
  | FAQPage
  | WebSite
  | Product
  | LocalBusiness;

/**
 * Props for JSON-LD component
 */
export interface JsonLdProps {
  data: StructuredData;
  id?: string;
}
