/**
 * Mock data fixtures for testing
 *
 * Provides consistent test data across all test files
 */

export const MockUsers = {
  standard: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
  },
  unverified: {
    email: 'unverified@example.com',
    password: 'Unverified123!',
    firstName: 'Unverified',
    lastName: 'User',
  },
};

export const MockArticles = {
  draft: {
    title: 'Test Draft Article',
    content: 'This is a test article content',
    slug: 'test-draft-article',
    status: 'draft',
  },
  published: {
    title: 'Test Published Article',
    content: 'This is a published article content',
    slug: 'test-published-article',
    status: 'published',
  },
  withMarkdown: {
    title: 'Article with Markdown',
    content:
      '# Heading\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2',
    slug: 'article-with-markdown',
    status: 'draft',
  },
};

export const MockKeywords = {
  lowVolume: {
    keyword: 'test keyword low volume',
    volume: 100,
    difficulty: 10,
    intent: 'informational',
  },
  highVolume: {
    keyword: 'popular search term',
    volume: 10000,
    difficulty: 70,
    intent: 'commercial',
  },
  longTail: {
    keyword: 'best long tail keyword for specific niche',
    volume: 50,
    difficulty: 5,
    intent: 'transactional',
  },
};

export const MockOrganizations = {
  standard: {
    name: 'Test Organization',
    slug: 'test-organization',
    domain: 'test-org.com',
  },
  withSpecialChars: {
    name: "Test's Organization & Co.",
    slug: 'tests-organization-co',
    domain: 'test-org-co.com',
  },
};

export const MockOnboarding = {
  completedSteps: [
    'welcome',
    'organization-setup',
    'product-tour',
    'first-article',
    'integrations',
  ],
  partialSteps: ['welcome', 'organization-setup'],
  currentStep: 'integrations',
};

export const MockIntegrations = {
  wordpress: {
    name: 'WordPress',
    type: 'wordpress',
    url: 'https://example.com/wp-json',
    credentials: { username: 'test', applicationPassword: 'test123' },
  },
  ghost: {
    name: 'Ghost',
    type: 'ghost',
    url: 'https://example.com/ghost/api',
    credentials: { adminApiKey: 'test_key' },
  },
  notion: {
    name: 'Notion',
    type: 'notion',
    url: 'https://notion.so',
    credentials: { accessToken: 'test_token', databaseId: 'test_db_id' },
  },
};

export const MockApiResponses = {
  success: (data: any) => ({
    success: true,
    data,
  }),

  error: (message: string, code = 'ERROR') => ({
    success: false,
    error: {
      code,
      message,
    },
  }),

  paginated: (items: any[], page = 1, perPage = 10) => ({
    success: true,
    data: items,
    pagination: {
      page,
      perPage,
      total: items.length,
      totalPages: Math.ceil(items.length / perPage),
    },
  }),
};

export const MockImages = {
  png: {
    name: 'test-image.png',
    mimeType: 'image/png',
    content: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    ),
  },

  jpeg: {
    name: 'test-image.jpg',
    mimeType: 'image/jpeg',
    content: Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDA8NDg0ODc6PDw/AoQEBAAMBAgQGBggUEwgIBgcBAQsKCgoKDw4MDQ8PDw4MDw8PDAwMDw8MDw8PDAwMDw8MDw8PDAwMDw8MDw8PDAwMDw8MDw8P/8AAEQgAAQABAwERAAIRAQMRAf/EABUAAQEAAAAAAAAAAAAAAAAAAAAf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R/Oi6lLcuNv4J9JbtS5ibeQFOnV/YYo0UZSVMvJJPJUVUI0OlVZZ1P/AIAjmfGiEchuWNZWFTaTFZKLU0ZMLUbXYQc+NqnY1NTfTCA0OrXHhMVF01k3RZW0xQaXHhMVF01k3RZW0xQaXHhMVF01k3RZW0xQaXHhMVF01k3RZW0xQaXHhMVF01k3RZW0xQaXHg==',
      'base64'
    ),
  },

  svg: {
    name: 'test-image.svg',
    mimeType: 'image/svg+xml',
    content: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>',
      'utf-8'
    ),
  },
};

/**
 * Create a mock response with delay
 */
export async function mockDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock API response with random delay
 */
export async function mockApiResponse<T>(data: T, delay = 100): Promise<T> {
  await mockDelay(delay);
  return data;
}

/**
 * Generate a random test string
 */
export function randomTestString(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a random email
 */
export function randomEmail(): string {
  return `test-${Date.now()}@example.com`;
}

/**
 * Generate a random slug
 */
export function randomSlug(): string {
  return `test-${Date.now()}`;
}
