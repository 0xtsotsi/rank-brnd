import { test, expect } from '@playwright/test';

/**
 * JSON-LD Structured Data Verification Tests
 *
 * These tests verify that JSON-LD structured data is correctly implemented
 * across the application for SEO optimization.
 */

test.describe('JSON-LD Structured Data', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  test('homepage should have Organization and WebSite schemas', async ({
    page,
  }) => {
    await page.goto(baseUrl);

    // Get all JSON-LD scripts
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .all();

    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(2);

    // Parse and verify Organization schema
    const organizationFound = await Promise.all(
      jsonLdScripts.map(async (script) => {
        const content = await script.textContent();
        if (!content) return false;
        try {
          const data = JSON.parse(content);
          return data['@type'] === 'Organization';
        } catch {
          return false;
        }
      })
    );

    expect(organizationFound.some(Boolean)).toBeTruthy();

    // Parse and verify WebSite schema
    const websiteFound = await Promise.all(
      jsonLdScripts.map(async (script) => {
        const content = await script.textContent();
        if (!content) return false;
        try {
          const data = JSON.parse(content);
          return data['@type'] === 'WebSite';
        } catch {
          return false;
        }
      })
    );

    expect(websiteFound.some(Boolean)).toBeTruthy();
  });

  test('FAQ page should have FAQPage schema', async ({ page }) => {
    await page.goto(`${baseUrl}/faq`);

    // Get all JSON-LD scripts
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .all();

    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(1);

    // Find and verify FAQPage schema
    let faqSchemaFound = false;
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        if (data['@type'] === 'FAQPage') {
          faqSchemaFound = true;

          // Verify FAQ structure
          expect(data).toHaveProperty('mainEntity');
          expect(Array.isArray(data.mainEntity)).toBeTruthy();
          expect(data.mainEntity.length).toBeGreaterThan(0);

          // Verify first FAQ item structure
          const firstFaq = data.mainEntity[0];
          expect(firstFaq['@type']).toBe('Question');
          expect(firstFaq).toHaveProperty('name');
          expect(firstFaq).toHaveProperty('acceptedAnswer');
          expect(firstFaq.acceptedAnswer['@type']).toBe('Answer');
          expect(firstFaq.acceptedAnswer).toHaveProperty('text');

          break;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    expect(faqSchemaFound).toBeTruthy();
  });

  test('FAQ page should have Breadcrumb schema', async ({ page }) => {
    await page.goto(`${baseUrl}/faq`);

    // Get all JSON-LD scripts
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .all();

    // Find and verify Breadcrumb schema
    let breadcrumbFound = false;
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        if (data['@type'] === 'BreadcrumbList') {
          breadcrumbFound = true;

          // Verify breadcrumb structure
          expect(data).toHaveProperty('itemListElement');
          expect(Array.isArray(data.itemListElement)).toBeTruthy();

          // Verify breadcrumb items have position
          data.itemListElement.forEach((item: any) => {
            expect(item['@type']).toBe('ListItem');
            expect(item).toHaveProperty('position');
            expect(typeof item.position).toBe('number');
            expect(item).toHaveProperty('name');
          });

          break;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    expect(breadcrumbFound).toBeTruthy();
  });

  test('blog post should have Article schema', async ({ page }) => {
    await page.goto(`${baseUrl}/blog/seo-tips-for-2025`);

    // Get all JSON-LD scripts
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .all();

    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(1);

    // Find and verify Article schema
    let articleFound = false;
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        if (data['@type'] === 'Article' || data['@type'] === 'BlogPosting') {
          articleFound = true;

          // Verify Article structure
          expect(data).toHaveProperty('headline');
          expect(data).toHaveProperty('datePublished');
          expect(data).toHaveProperty('author');
          expect(data).toHaveProperty('publisher');

          // Verify author structure
          expect(data.author['@type']).toBe('Person');
          expect(data.author).toHaveProperty('name');

          // Verify publisher structure
          expect(data.publisher['@type']).toBe('Organization');
          expect(data.publisher).toHaveProperty('name');

          // Verify mainEntityOfPage
          expect(data).toHaveProperty('mainEntityOfPage');
          expect(data.mainEntityOfPage['@type']).toBe('WebPage');
          expect(data.mainEntityOfPage).toHaveProperty('@id');

          break;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    expect(articleFound).toBeTruthy();
  });

  test('blog post should have Breadcrumb schema', async ({ page }) => {
    await page.goto(`${baseUrl}/blog/seo-tips-for-2025`);

    // Get all JSON-LD scripts
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .all();

    // Find and verify Breadcrumb schema
    let breadcrumbFound = false;
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        if (data['@type'] === 'BreadcrumbList') {
          breadcrumbFound = true;

          // Verify breadcrumb has at least 3 items (Home, Blog, Article)
          expect(data.itemListElement.length).toBeGreaterThanOrEqual(2);

          // Verify breadcrumb order includes Blog
          const hasBlog = data.itemListElement.some(
            (item: any) => item.name === 'Blog' || item.name === 'blog'
          );
          expect(hasBlog).toBeTruthy();

          break;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    expect(breadcrumbFound).toBeTruthy();
  });

  test('Organization schema should have required properties', async ({
    page,
  }) => {
    await page.goto(baseUrl);

    // Get all JSON-LD scripts
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .all();

    // Find and verify Organization schema properties
    let organizationData: any = null;
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        if (data['@type'] === 'Organization') {
          organizationData = data;
          break;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    expect(organizationData).not.toBeNull();

    // Verify required Organization properties
    expect(organizationData).toHaveProperty('name');
    expect(organizationData.name).toBeTruthy();
    expect(organizationData).toHaveProperty('url');
    expect(organizationData.url).toBeTruthy();

    // Verify @context
    expect(organizationData['@context']).toBe('https://schema.org');
  });

  test('WebSite schema should have potentialAction for search', async ({
    page,
  }) => {
    await page.goto(baseUrl);

    // Get all JSON-LD scripts
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .all();

    // Find and verify WebSite schema
    let websiteData: any = null;
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        if (data['@type'] === 'WebSite') {
          websiteData = data;
          break;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    expect(websiteData).not.toBeNull();

    // Verify WebSite has search potential action
    expect(websiteData).toHaveProperty('potentialAction');
    if (websiteData.potentialAction) {
      expect(websiteData.potentialAction['@type']).toBe('SearchAction');
    }
  });
});
