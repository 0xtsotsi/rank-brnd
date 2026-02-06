/**
 * Niche Hierarchy Data
 *
 * Defines the hierarchical structure of niches for semantic similarity calculation.
 * This enables the algorithm to understand that "SaaS" is related to "Technology",
 * and "Cryptocurrency" is a sub-niche of "Finance".
 */

import type { NicheHierarchy } from './types';

/**
 * Comprehensive niche hierarchy for semantic matching
 */
export const NICHE_HIERARCHY: Record<string, NicheHierarchy> = {
  Technology: {
    niche: 'Technology',
    children: [
      'SaaS',
      'AI',
      'Machine Learning',
      'Software Development',
      'Web Development',
      'Mobile Apps',
      'DevOps',
      'Cybersecurity',
    ],
    related: ['Marketing', 'Business', 'Gaming'],
    synonyms: ['Tech', 'IT', 'Software', 'Digital'],
  },
  SaaS: {
    niche: 'SaaS',
    parent: 'Technology',
    children: [
      'B2B SaaS',
      'CRM Software',
      'Project Management',
      'Collaboration Tools',
    ],
    related: ['Business', 'Marketing', 'Productivity'],
    synonyms: [
      'Software as a Service',
      'Cloud Software',
      'Subscription Software',
    ],
  },
  AI: {
    niche: 'AI',
    parent: 'Technology',
    children: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision'],
    related: ['Technology', 'Data Science', 'Automation'],
    synonyms: ['Artificial Intelligence', 'Machine Intelligence', 'AI Tools'],
  },
  Business: {
    niche: 'Business',
    children: [
      'Entrepreneurship',
      'Startups',
      'Management',
      'Leadership',
      'HR',
      'Operations',
    ],
    related: ['Finance', 'Marketing', 'SaaS', 'E-commerce'],
    synonyms: ['B2B', 'Enterprise', 'Corporate', 'Company'],
  },
  Finance: {
    niche: 'Finance',
    children: [
      'Investing',
      'Personal Finance',
      'Cryptocurrency',
      'Trading',
      'Banking',
      'Real Estate',
    ],
    related: ['Business', 'Economics', 'Crypto'],
    synonyms: ['Money', 'Financial', 'Wealth', 'Investment'],
  },
  Crypto: {
    niche: 'Crypto',
    parent: 'Finance',
    children: ['Bitcoin', 'Ethereum', 'DeFi', 'NFTs', 'Blockchain'],
    related: ['Finance', 'Technology', 'Trading'],
    synonyms: ['Cryptocurrency', 'Web3', 'Digital Assets', 'Coins'],
  },
  Marketing: {
    niche: 'Marketing',
    children: [
      'Digital Marketing',
      'Content Marketing',
      'SEO',
      'Social Media Marketing',
      'Email Marketing',
      'PPC',
      'Influencer Marketing',
    ],
    related: ['Business', 'SaaS', 'E-commerce'],
    synonyms: ['Advertising', 'Promotion', 'Growth Marketing'],
  },
  SEO: {
    niche: 'SEO',
    parent: 'Marketing',
    children: ['Technical SEO', 'On-page SEO', 'Link Building', 'Local SEO'],
    related: ['Marketing', 'Content Marketing', 'Technology'],
    synonyms: [
      'Search Engine Optimization',
      'Search Marketing',
      'Organic Search',
    ],
  },
  Ecommerce: {
    niche: 'E-commerce',
    parent: 'Business',
    children: [
      'Dropshipping',
      'Online Retail',
      'E-commerce Platforms',
      'Payment Processing',
    ],
    related: ['Business', 'Marketing', 'Technology', 'Retail'],
    synonyms: [
      'Online Store',
      'Ecommerce',
      'Digital Commerce',
      'Online Selling',
    ],
  },
  Health: {
    niche: 'Health',
    children: [
      'Fitness',
      'Nutrition',
      'Mental Health',
      'Medical',
      'Wellness',
      'Healthcare',
    ],
    related: ['Lifestyle', 'Fitness'],
    synonyms: ['Healthcare', 'Medical', 'Wellness'],
  },
  Fitness: {
    niche: 'Fitness',
    parent: 'Health',
    children: [
      'Weight Training',
      'Cardio',
      'Yoga',
      'CrossFit',
      'Home Workouts',
    ],
    related: ['Health', 'Lifestyle', 'Sports'],
    synonyms: ['Exercise', 'Training', 'Working Out', 'Gym'],
  },
  Lifestyle: {
    niche: 'Lifestyle',
    children: [
      'Self Improvement',
      'Productivity',
      'Home & Garden',
      'Family',
      'Relationships',
    ],
    related: ['Health', 'Business', 'Travel'],
    synonyms: ['Life', 'Living', 'Daily Life'],
  },
  Travel: {
    niche: 'Travel',
    children: [
      'Adventure Travel',
      'Luxury Travel',
      'Budget Travel',
      'Travel Tips',
      'Destinations',
    ],
    related: ['Lifestyle', 'Leisure'],
    synonyms: ['Vacation', 'Tourism', 'Trips', 'Journeys'],
  },
  Food: {
    niche: 'Food',
    children: [
      'Recipes',
      'Cooking',
      'Restaurants',
      'Nutrition',
      'Vegan',
      'Food Reviews',
    ],
    related: ['Health', 'Lifestyle'],
    synonyms: ['Cuisine', 'Cooking', 'Dining', 'Culinary'],
  },
  Fashion: {
    niche: 'Fashion',
    children: [
      'Clothing',
      'Accessories',
      'Style Tips',
      'Sustainable Fashion',
      'Designer Brands',
    ],
    related: ['Lifestyle', 'E-commerce', 'Beauty'],
    synonyms: ['Style', 'Apparel', 'Trends', 'Wear'],
  },
  Sports: {
    niche: 'Sports',
    children: [
      'Football',
      'Basketball',
      'Baseball',
      'Soccer',
      'Tennis',
      'Golf',
      'Esports',
    ],
    related: ['Fitness', 'Entertainment', 'Gaming'],
    synonyms: ['Athletics', 'Games', 'Competitions'],
  },
  Gaming: {
    niche: 'Gaming',
    children: [
      'PC Gaming',
      'Console Gaming',
      'Mobile Gaming',
      'Esports',
      'Game Reviews',
      'Indie Games',
    ],
    related: ['Technology', 'Entertainment', 'Sports'],
    synonyms: ['Video Games', 'Gaming', 'Games'],
  },
  Entertainment: {
    niche: 'Entertainment',
    children: [
      'Movies',
      'TV Shows',
      'Music',
      'Celebrities',
      'Streaming',
      'Events',
    ],
    related: ['Lifestyle', 'Gaming', 'Sports'],
    synonyms: ['Showbiz', 'Media', 'Arts', 'Amusement'],
  },
  Education: {
    niche: 'Education',
    children: [
      'Online Learning',
      'Courses',
      'Tutorials',
      'Academic',
      'Training',
      'Certifications',
    ],
    related: ['Technology', 'Business', 'Career'],
    synonyms: ['Learning', 'Teaching', 'Academics', 'Study'],
  },
  RealEstate: {
    niche: 'Real Estate',
    parent: 'Finance',
    children: [
      'Buying',
      'Selling',
      'Renting',
      'Property Investment',
      'Home Improvement',
    ],
    related: ['Finance', 'Business', 'Lifestyle'],
    synonyms: ['Property', 'Housing', 'Real Estate', 'Home Ownership'],
  },
  Automotive: {
    niche: 'Automotive',
    children: [
      'Cars',
      'Motorcycles',
      'Electric Vehicles',
      'Car Reviews',
      'Maintenance',
    ],
    related: ['Technology', 'Lifestyle'],
    synonyms: ['Vehicles', 'Cars', 'Auto', 'Motoring'],
  },
  HomeAndGarden: {
    niche: 'Home & Garden',
    parent: 'Lifestyle',
    children: [
      'Interior Design',
      'Gardening',
      'Home Improvement',
      'DIY',
      'Decor',
    ],
    related: ['Lifestyle', 'Real Estate'],
    synonyms: ['Home', 'Garden', 'House', 'DIY'],
  },
};

/**
 * Get all niche names from the hierarchy
 */
export function getAllNiches(): string[] {
  return Object.keys(NICHE_HIERARCHY);
}

/**
 * Get niche hierarchy entry
 */
export function getNicheHierarchy(niche: string): NicheHierarchy | undefined {
  // Direct match
  if (NICHE_HIERARCHY[niche]) {
    return NICHE_HIERARCHY[niche];
  }

  // Case-insensitive match
  const normalizedNiche = Object.keys(NICHE_HIERARCHY).find(
    (key) => key.toLowerCase() === niche.toLowerCase()
  );
  if (normalizedNiche) {
    return NICHE_HIERARCHY[normalizedNiche];
  }

  // Synonym match
  for (const hierarchy of Object.values(NICHE_HIERARCHY)) {
    if (
      hierarchy.synonyms.some((s) => s.toLowerCase() === niche.toLowerCase())
    ) {
      return hierarchy;
    }
  }

  return undefined;
}

/**
 * Get parent niche for a given niche
 */
export function getParentNiche(niche: string): string | undefined {
  const hierarchy = getNicheHierarchy(niche);
  return hierarchy?.parent;
}

/**
 * Get children niches for a given niche
 */
export function getChildrenNiches(niche: string): string[] {
  const hierarchy = getNicheHierarchy(niche);
  return hierarchy?.children || [];
}

/**
 * Get related niches for a given niche
 */
export function getRelatedNiches(niche: string): string[] {
  const hierarchy = getNicheHierarchy(niche);
  return hierarchy?.related || [];
}

/**
 * Get synonyms for a given niche
 */
export function getSynonyms(niche: string): string[] {
  const hierarchy = getNicheHierarchy(niche);
  return hierarchy?.synonyms || [];
}

/**
 * Normalize a niche name to its canonical form
 */
export function normalizeNiche(niche: string): string | undefined {
  const hierarchy = getNicheHierarchy(niche);
  return hierarchy?.niche;
}
