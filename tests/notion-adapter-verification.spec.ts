/**
 * Notion CMS Adapter Verification Test
 *
 * This test verifies that the Notion adapter is properly implemented
 * by testing its structure, configuration validation, and property mapping.
 *
 * Note: This is a temporary verification test that should be deleted after
 * confirming the implementation works correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('Notion CMS Adapter', () => {
  test('should export all required functions and classes', async () => {
    // Import the module dynamically to test exports
    const cmsModule = await import('../lib/cms');

    // Verify all exports exist
    expect(cmsModule.NotionAdapter).toBeDefined();
    expect(cmsModule.createNotionAdapter).toBeDefined();
    expect(cmsModule.validateNotionConfig).toBeDefined();
    expect(cmsModule.formatNotionId).toBeDefined();
    expect(cmsModule.parseNotionUrl).toBeDefined();
    expect(cmsModule.CMSError).toBeDefined();
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toBeDefined();
    expect(cmsModule.createCMSAdapter).toBeDefined();

    // Verify Notion is in supported platforms
    expect(cmsModule.SUPPORTED_CMS_PLATFORMS).toContain('notion');
  });

  test('should validate Notion configuration correctly', async () => {
    const { validateNotionConfig } = await import('../lib/cms');

    // Valid config with secret_ prefix (using mock token, not real credential)
    expect(
      validateNotionConfig({
        integrationToken: 'secret_test_mock_token',
      })
    ).toBe(true);

    // Valid config with ntn_ prefix (newer format, using mock token)
    expect(
      validateNotionConfig({
        integrationToken: 'ntn_test_mock_token',
      })
    ).toBe(true);

    // Invalid configs
    expect(validateNotionConfig({})).toBe(false);
    expect(validateNotionConfig({ integrationToken: '' })).toBe(false);
    expect(validateNotionConfig({ integrationToken: 'invalid-token' })).toBe(
      false
    );
    expect(validateNotionConfig({ integrationToken: 'bearer_token' })).toBe(
      false
    );
  });

  test('should create Notion adapter instance', async () => {
    const { createNotionAdapter, NotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify adapter is instance of NotionAdapter
    expect(adapter).toBeInstanceOf(NotionAdapter);

    // Verify adapter name
    expect(adapter.name).toBe('Notion');

    // Verify isConfigured returns true for valid config with database ID
    expect(adapter.isConfigured()).toBe(true);
  });

  test('should report not configured when missing database ID', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    // Should not be fully configured without database ID
    expect(adapter.isConfigured()).toBe(false);
  });

  test('should implement CMSAdapter interface', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify required CMSAdapter methods exist
    expect(typeof adapter.publish).toBe('function');
    expect(typeof adapter.getUser).toBe('function');
    expect(typeof adapter.isConfigured).toBe('function');
    expect(typeof adapter.getPublications).toBe('function');
  });

  test('should have page management methods', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify page methods exist
    expect(typeof adapter.createPage).toBe('function');
    expect(typeof adapter.updatePage).toBe('function');
    expect(typeof adapter.getPage).toBe('function');
    expect(typeof adapter.archivePage).toBe('function');
    expect(typeof adapter.restorePage).toBe('function');
  });

  test('should have database management methods', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify database methods exist
    expect(typeof adapter.getDatabase).toBe('function');
    expect(typeof adapter.queryDatabase).toBe('function');
    expect(typeof adapter.searchDatabases).toBe('function');
  });

  test('should have block management methods', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify block methods exist
    expect(typeof adapter.appendBlocks).toBe('function');
    expect(typeof adapter.getBlocks).toBe('function');
  });

  test('should have rich text formatting methods', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify rich text methods exist
    expect(typeof adapter.textToRichText).toBe('function');
    expect(typeof adapter.createLink).toBe('function');
    expect(typeof adapter.createBoldText).toBe('function');
    expect(typeof adapter.createItalicText).toBe('function');
    expect(typeof adapter.createCodeText).toBe('function');
    expect(typeof adapter.createStrikethroughText).toBe('function');
    expect(typeof adapter.createUnderlineText).toBe('function');
    expect(typeof adapter.createColoredText).toBe('function');
    expect(typeof adapter.richTextToPlainText).toBe('function');
  });

  test('should have block builder methods', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify block builder methods exist
    expect(typeof adapter.createParagraph).toBe('function');
    expect(typeof adapter.createHeading).toBe('function');
    expect(typeof adapter.createBulletedListItem).toBe('function');
    expect(typeof adapter.createNumberedListItem).toBe('function');
    expect(typeof adapter.createCodeBlock).toBe('function');
    expect(typeof adapter.createQuote).toBe('function');
    expect(typeof adapter.createDivider).toBe('function');
  });

  test('should have markdown conversion method', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    // Verify markdown conversion exists
    expect(typeof adapter.markdownToBlocks).toBe('function');
  });

  test('should use createCMSAdapter factory for Notion', async () => {
    const { createCMSAdapter, NotionAdapter } = await import('../lib/cms');

    const adapter = createCMSAdapter('notion', {
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
      defaultDatabaseId: 'database-uuid-here',
    });

    expect(adapter).toBeInstanceOf(NotionAdapter);
    expect(adapter.name).toBe('Notion');
  });
});

test.describe('Notion Adapter Rich Text Formatting', () => {
  test('should create basic rich text', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const richText = adapter.textToRichText('Hello World');

    expect(richText).toHaveLength(1);
    expect(richText[0].type).toBe('text');
    expect(richText[0].text?.content).toBe('Hello World');
  });

  test('should create bold text', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const boldText = adapter.createBoldText('Bold Text');

    expect(boldText).toHaveLength(1);
    expect(boldText[0].annotations?.bold).toBe(true);
    expect(boldText[0].text?.content).toBe('Bold Text');
  });

  test('should create italic text', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const italicText = adapter.createItalicText('Italic Text');

    expect(italicText).toHaveLength(1);
    expect(italicText[0].annotations?.italic).toBe(true);
  });

  test('should create code text', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const codeText = adapter.createCodeText('const x = 1');

    expect(codeText).toHaveLength(1);
    expect(codeText[0].annotations?.code).toBe(true);
  });

  test('should create link', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const link = adapter.createLink('Click here', 'https://example.com');

    expect(link.type).toBe('text');
    expect(link.text?.content).toBe('Click here');
    expect(link.text?.link?.url).toBe('https://example.com');
  });

  test('should convert rich text to plain text', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const richText = adapter.textToRichText('Hello');
    // Mark the plain_text for testing
    richText[0].plain_text = 'Hello';

    const plainText = adapter.richTextToPlainText(richText);

    expect(plainText).toBe('Hello');
  });
});

test.describe('Notion Adapter Block Builders', () => {
  test('should create paragraph block', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const paragraph = adapter.createParagraph('Test paragraph');

    expect(paragraph.object).toBe('block');
    expect(paragraph.type).toBe('paragraph');
    expect(paragraph.paragraph.rich_text).toHaveLength(1);
    expect(paragraph.paragraph.rich_text[0].text?.content).toBe(
      'Test paragraph'
    );
  });

  test('should create heading blocks', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const h1 = adapter.createHeading(1, 'Heading 1');
    const h2 = adapter.createHeading(2, 'Heading 2');
    const h3 = adapter.createHeading(3, 'Heading 3');

    expect(h1.type).toBe('heading_1');
    expect(h2.type).toBe('heading_2');
    expect(h3.type).toBe('heading_3');
  });

  test('should create bulleted list item', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const bullet = adapter.createBulletedListItem('List item');

    expect(bullet.type).toBe('bulleted_list_item');
    expect(bullet.bulleted_list_item?.rich_text).toHaveLength(1);
  });

  test('should create numbered list item', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const numbered = adapter.createNumberedListItem('List item');

    expect(numbered.type).toBe('numbered_list_item');
    expect(numbered.numbered_list_item?.rich_text).toHaveLength(1);
  });

  test('should create code block', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const codeBlock = adapter.createCodeBlock('const x = 1;', 'javascript');

    expect(codeBlock.type).toBe('code');
    expect(codeBlock.code.language).toBe('javascript');
    expect(codeBlock.code.rich_text[0].text?.content).toBe('const x = 1;');
  });

  test('should create quote block', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const quote = adapter.createQuote('Famous quote');

    expect(quote.type).toBe('quote');
    expect(quote.quote.rich_text).toHaveLength(1);
  });

  test('should create divider block', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const divider = adapter.createDivider();

    expect(divider.type).toBe('divider');
    expect(divider.divider).toEqual({});
  });
});

test.describe('Notion Adapter Markdown Conversion', () => {
  test('should convert markdown headings to blocks', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const markdown = `# Heading 1
## Heading 2
### Heading 3`;

    const blocks = adapter.markdownToBlocks(markdown);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('heading_1');
    expect(blocks[1].type).toBe('heading_2');
    expect(blocks[2].type).toBe('heading_3');
  });

  test('should convert markdown lists to blocks', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const markdown = `- Bullet item 1
- Bullet item 2
1. Numbered item 1
2. Numbered item 2`;

    const blocks = adapter.markdownToBlocks(markdown);

    expect(blocks.length).toBeGreaterThanOrEqual(4);
    expect(blocks[0].type).toBe('bulleted_list_item');
    expect(blocks[1].type).toBe('bulleted_list_item');
    expect(blocks[2].type).toBe('numbered_list_item');
    expect(blocks[3].type).toBe('numbered_list_item');
  });

  test('should convert markdown code blocks', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

    const blocks = adapter.markdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
  });

  test('should convert markdown blockquotes', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const markdown = `> This is a quote`;

    const blocks = adapter.markdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('quote');
  });

  test('should convert horizontal rules to dividers', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const markdown = `---`;

    const blocks = adapter.markdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('divider');
  });

  test('should convert regular text to paragraphs', async () => {
    const { createNotionAdapter } = await import('../lib/cms');

    const adapter = createNotionAdapter({
      integrationToken: process.env.NOTION_API_KEY || 'test_notion_token',
    });

    const markdown = `This is a paragraph.`;

    const blocks = adapter.markdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
  });
});

test.describe('Notion Utility Functions', () => {
  test('should format Notion ID correctly', async () => {
    const { formatNotionId } = await import('../lib/cms');

    // With dashes
    expect(formatNotionId('12345678-1234-1234-1234-123456789abc')).toBe(
      '123456781234123412341234567 89abc'
    );

    // Without dashes (should remain the same)
    expect(formatNotionId('12345678123412341234123456789abc')).toBe(
      '12345678123412341234123456789abc'
    );
  });

  test('should parse Notion URLs correctly', async () => {
    const { parseNotionUrl } = await import('../lib/cms');

    // Standard Notion page URL
    const url1 =
      'https://www.notion.so/My-Page-12345678123412341234123456789abc';
    expect(parseNotionUrl(url1)).toBe('12345678123412341234123456789abc');

    // Notion page URL with workspace prefix
    const url2 =
      'https://notion.so/workspace/My-Page-12345678123412341234123456789abc';
    expect(parseNotionUrl(url2)).toBe('12345678123412341234123456789abc');

    // Invalid URL should return null
    expect(parseNotionUrl('https://google.com')).toBeNull();
    expect(parseNotionUrl('not-a-url')).toBeNull();
  });
});

test.describe('Notion Types Export', () => {
  test('Notion types should be properly exported', async () => {
    // Verify types are exported (compile-time check)
    const notionTypes = await import('../types/notion');

    // These are types, so we can't test them at runtime directly
    // But we can verify the module loads without errors
    expect(notionTypes).toBeDefined();
    expect(notionTypes.DEFAULT_PROPERTY_MAPPING).toBeDefined();
  });

  test('should have default property mapping', async () => {
    const { DEFAULT_PROPERTY_MAPPING } = await import('../types/notion');

    expect(DEFAULT_PROPERTY_MAPPING.titleProperty).toBe('Name');
    expect(DEFAULT_PROPERTY_MAPPING.contentProperty).toBe('Content');
    expect(DEFAULT_PROPERTY_MAPPING.tagsProperty).toBe('Tags');
    expect(DEFAULT_PROPERTY_MAPPING.statusProperty).toBe('Status');
    expect(DEFAULT_PROPERTY_MAPPING.canonicalUrlProperty).toBe('Canonical URL');
    expect(DEFAULT_PROPERTY_MAPPING.publishedDateProperty).toBe('Published');
  });
});
